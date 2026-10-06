-- Disposable local test database only.
begin;
do $$ declare c uuid; a uuid; answer_id uuid; result jsonb; failed boolean; expected text; stats jsonb;
begin
 if (select count(*) from public.questions where is_active) <> 22
 or (select count(*) from public.questions where is_active and type in ('mcq','scenario_mcq','code_output','true_false')) <> 20
 or (select count(*) from public.questions where is_active and type in ('short_text','creative')) <> 2
 or (select sum(points) from public.questions where is_active) <> 100 then raise exception 'Incorrect bank composition'; end if;
 if exists(select 1 from public.questions where is_active and correct_answer is not null and (jsonb_array_length(options)<>4 or not options @> jsonb_build_array(correct_answer) or points<>4)) then raise exception 'Bad MCQ'; end if;
 if (select count(distinct sort_order) from public.questions where is_active) <> 22 then raise exception 'Duplicate active order'; end if;
 if (select count(*) from public.questions where not is_active and id::text like '00000000%') <> 14 then raise exception 'Historical questions lost'; end if;
 if (select manual_score from public.answers where attempt_id=(select a.id from public.attempts a join public.candidates c on c.id=a.candidate_id where c.srn='PES1UG23CS001') and question_id='00000000-0000-0000-0000-000000000009') <> 7 then raise exception 'Historical score changed'; end if;
 if not exists(select 1 from public.answer_evaluations where criteria @> '{"reasoning":4}'::jsonb and comments='Historical answer note') then raise exception 'Historical rubric lost'; end if;
 if exists(select 1 from public.attempts a join public.candidates c on c.id=a.candidate_id where c.srn like 'PES1UG23CS00%' and duration_minutes<>15) then raise exception 'Old duration changed'; end if;
 if (select a.status from public.attempts a join public.candidates c on c.id=a.candidate_id where c.srn='PES1UG23CS002') <> 'time_expired' then raise exception 'Expired legacy attempt not finalized'; end if;
 c:=(select id from public.candidates where srn='PES1UG23CS003');
 perform public.start_appex_attempt(c,30,true);
 if (select duration_minutes from public.attempts where candidate_id=c) <> 30 then raise exception 'Previously registered new start did not get 30 minutes'; end if;
 c:=public.register_appex_candidate('PES1UG24CS001','New Bank Candidate',true);
 if (select duration_minutes from public.attempts where candidate_id=c) <> 30 then raise exception 'Wrong new attempt default'; end if;
 perform public.start_appex_attempt(c,30,true);
 select id into a from public.attempts where candidate_id=c;
 if (select count(*) from public.answers where attempt_id=a)<>22 or (select duration_minutes from public.attempts where id=a)<>30 then raise exception 'New start incorrect'; end if;
 expected:=repeat('a',1400);
 perform public.save_appex_answer(a,'00500000-0000-4000-8000-000000000021',expected);
 if (select answer_text from public.answers where attempt_id=a and question_id='00500000-0000-4000-8000-000000000021') <> expected then raise exception 'Autosave truncated descriptive answer'; end if;
 perform public.save_appex_answer(a,'00500000-0000-4000-8000-000000000022',repeat('b',1600));
 if (select length(answer_text) from public.answers where attempt_id=a and question_id='00500000-0000-4000-8000-000000000022') <> 1500 then raise exception 'Wrong save limit'; end if;
 result:=public.finalize_appex_attempt(a,(select jsonb_object_agg(id::text,correct_answer) from public.questions where is_active and correct_answer is not null) || jsonb_build_object('00500000-0000-4000-8000-000000000021',repeat('c',1500)));
 if (select objective_score from public.attempts where id=a)<>80 then raise exception 'Objective scoring incorrect'; end if;
 if (select length(answer_text) from public.answers where attempt_id=a and question_id='00500000-0000-4000-8000-000000000021')<>1500 then raise exception 'Final submission truncated answer'; end if;
 select id into answer_id from public.answers where attempt_id=a and question_id='00500000-0000-4000-8000-000000000021';
 perform public.save_appex_evaluation(a,'10000000-0000-0000-0000-000000000001',90,'Shortlist','',jsonb_build_array(jsonb_build_object('answerId',answer_id,'manualScore',10,'criteria','{}'::jsonb)));
 if (select final_score from public.attempts where id=a)<>90 then raise exception 'Manual scoring failed'; end if;
 failed:=false;
 begin update public.answers set answer_text=repeat('x',1501) where id=answer_id; exception when others then failed:=true; end;
 if not failed then raise exception 'Invalid direct write accepted'; end if;
 if has_function_privilege('anon','public.save_appex_answer(uuid,uuid,text)','EXECUTE') or has_function_privilege('authenticated','public.finalize_appex_attempt(uuid,jsonb)','EXECUTE') then raise exception 'RPC exposed'; end if;
 stats:=public.appex_question_bank_stats();
 if (stats->>'activeCount')::int<>22 or (stats->>'activePoints')::numeric<>100 then raise exception 'Global stats incorrect'; end if;
 raise notice 'PASS: bank composition, historical scores/rubrics/durations preserved, new 30-minute snapshots, long autosave/final submission, objective/manual scoring and RPC permissions';
end $$;
rollback;
-- Authenticated evaluator can read guidance, nonlisted user cannot.
insert into auth.users(id,email) values('10000000-0000-0000-0000-000000000002','outside@example.com');
insert into public.profiles(id,role) values('10000000-0000-0000-0000-000000000002','evaluator');
grant select on public.questions to authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$ begin if (select count(*) from public.questions where evaluation_notes is not null) <> 0 then raise exception 'Notes exposed to nonlisted user'; end if; end $$;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$ begin if (select count(*) from public.questions where is_active and evaluation_notes is not null) <> 22 then raise exception 'Evaluator guidance missing'; end if; end $$;
reset role;
