-- Local disposable test database only. See scripts/check-db.sh.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('10000000-0000-0000-0000-000000000001','aaryatedla@gmail.com'),
 ('10000000-0000-0000-0000-000000000002','outside@example.com');
insert into public.profiles(id,role) select id,'admin' from auth.users;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function auth.uid() to authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ begin
 if public.is_appex_admin() or public.is_appex_evaluator() then raise exception 'Nonlisted account authorized'; end if;
 if (select count(*) from public.questions) <> 0 then raise exception 'RLS exposed questions'; end if;
 if (select count(*) from public.candidate_review_rows) <> 0 then raise exception 'Review view bypassed RLS'; end if;
 begin
  insert into public.questions(category,type,question_text,points,sort_order) values('wildcard','creative','Bypass',1,99);
  raise exception 'REST write allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
 if not public.is_appex_admin() then raise exception 'Allowed admin denied'; end if;
 if (select count(*) from public.questions) <> 14 then raise exception 'Allowed admin cannot read'; end if;
end $$;
reset role;
do $$
declare c uuid; a uuid; a2 uuid; answer_id uuid; result jsonb; failed boolean;
begin
 update public.questions set points=3 where sort_order=14;
 insert into public.questions(id,category,type,question_text,options,correct_answer,points,sort_order)
 values('00000000-0000-0000-0000-000000000015','python_programming','code_output','Case-sensitive output','["True","true"]','True',1,15);
 c := public.register_appex_candidate('TEST0001',' Test Candidate ');
 if c <> public.register_appex_candidate('TEST0001','test candidate') then raise exception 'Duplicate attempt created'; end if;
 failed:=false;
 begin perform public.register_appex_candidate('TEST0001','Wrong name'); exception when others then failed:=true; end;
 if not failed then raise exception 'Name mismatch accepted'; end if;
 perform public.replace_appex_session(c,'hash1',now()+interval '1 day');
 perform public.replace_appex_session(c,'hash2',now()+interval '1 day');
 if (select count(*) from public.candidate_sessions where candidate_id=c) <> 1 then raise exception 'Multiple sessions'; end if;
 perform public.start_appex_attempt(c,15,true);
 select id into a from public.attempts where candidate_id=c;
 if (select count(*) from public.answers where attempt_id=a) <> 15 then raise exception 'Unanswered questions lost'; end if;
 if not (public.record_appex_integrity(a,'tab_switch')->>'recorded')::boolean then raise exception 'Integrity event not saved'; end if;
 if (public.record_appex_integrity(a,'window_blur')->>'recorded')::boolean then raise exception 'Integrity event not deduplicated'; end if;
 insert into public.integrity_events(attempt_id,event_type,created_at) select a,'window_blur',now()-interval '5 seconds' from generate_series(1,99);
 if (public.record_appex_integrity(a,'window_blur')->>'recorded')::boolean then raise exception 'Integrity cap not enforced'; end if;
 failed:=false;
 begin update public.questions set question_text='Changed' where sort_order=1; exception when others then failed:=true; end;
 if not failed then raise exception 'Live question edit accepted'; end if;
 perform public.save_appex_answer(a,'00000000-0000-0000-0000-000000000001','6');
 failed:=false;
 begin
  perform public.finalize_appex_attempt(a,'{"00000000-0000-0000-0000-000000000001":"9","00000000-0000-0000-0000-000000000002":"invalid"}');
 exception when others then failed:=true;
 end;
 if not failed or (select answer_text from public.answers where attempt_id=a and question_id='00000000-0000-0000-0000-000000000001') <> '6' then raise exception 'Partial submission persisted'; end if;
 result:=public.finalize_appex_attempt(a,'{"00000000-0000-0000-0000-000000000001":"9","00000000-0000-0000-0000-000000000015":"true"}');
 if (select objective_score from public.attempts where id=a) <> 7.5 then raise exception 'Scoring incorrect'; end if;
 if not (public.finalize_appex_attempt(a)->>'duplicate')::boolean then raise exception 'Submission not duplicate safe'; end if;
 if not (public.save_appex_answer(a,'00000000-0000-0000-0000-000000000001','6')->>'submitted')::boolean then raise exception 'Late save accepted'; end if;
 select id into answer_id from public.answers where attempt_id=a and question_id='00000000-0000-0000-0000-000000000009';
 failed:=false;
 begin perform public.save_appex_evaluation(a,'10000000-0000-0000-0000-000000000001',20,'Maybe','',
  jsonb_build_array(jsonb_build_object('answerId',answer_id,'manualScore',5,'criteria','{}'::jsonb),jsonb_build_object('answerId','invalid')));
 exception when others then failed:=true; end;
 if not failed or (select manual_score from public.answers where id=answer_id) is not null then raise exception 'Partial evaluation persisted'; end if;
 perform public.save_appex_evaluation(a,'10000000-0000-0000-0000-000000000001',12.5,'Maybe','Done',
  jsonb_build_array(jsonb_build_object('answerId',answer_id,'manualScore',5,'criteria',jsonb_build_object('reasoning',4))));
 if (select final_score from public.attempts where id=a) <> 12.5 then raise exception 'Final score not mirrored'; end if;
 if not (select evaluated from public.candidate_review_rows where id=(select candidate_id from public.attempts where id=a)) then raise exception 'Review view missing evaluation'; end if;
 failed:=false;
 begin perform public.save_appex_evaluation(a,'10000000-0000-0000-0000-000000000002',0,'Maybe','','[]'); exception when others then failed:=true; end;
 if not failed then raise exception 'Nonlisted evaluator allowed'; end if;
 failed:=false;
 begin update public.questions set question_text='Historical edit' where sort_order=1; exception when others then failed:=true; end;
 if not failed then raise exception 'Historical edit accepted'; end if;
 c := public.register_appex_candidate('TEST0002','Timeout Candidate');
 perform public.start_appex_attempt(c,1,true);
 select id into a2 from public.attempts where candidate_id=c;
 update public.attempts set started_at=now()-interval '2 minutes' where id=a2;
 result:=public.finalize_appex_attempt(a2,'{"00000000-0000-0000-0000-000000000001":"9"}');
 if result->>'status' <> 'time_expired' or (select objective_score from public.attempts where id=a2) <> 0 then raise exception 'Late answers scored'; end if;
 c := public.register_appex_candidate('TEST0003','Abandoned Candidate');
 perform public.start_appex_attempt(c,1,true);
 update public.attempts set started_at=now()-interval '2 minutes' where candidate_id=c;
 update public.questions set is_active=false where sort_order=1;
 if (select status from public.attempts where candidate_id=c) <> 'time_expired' then raise exception 'Abandoned attempt blocks bank'; end if;
 update public.questions set is_active=false;
 c := public.register_appex_candidate('TEST0004','Empty Bank');
 failed:=false;
 begin perform public.start_appex_attempt(c,15,true); exception when others then failed:=true; end;
 if not failed or (select started_at from public.attempts where candidate_id=c) is not null then raise exception 'Empty bank started timer'; end if;
 raise notice 'PASS: allowlist RLS, REST write denial, registration/session uniqueness, question snapshots and locks, atomic submission/evaluation, scoring, late-save denial, timeout handling, empty-bank protection';
end $$;
rollback;
