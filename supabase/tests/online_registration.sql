-- Disposable test database only. All fixtures rolled back.
begin;
do $$
declare c uuid; original uuid; failed boolean; stats jsonb;
begin
 insert into public.candidates(srn,full_name) values('LEGACY0000001','Legacy Candidate') returning id into c;
 if (select online_registration_confirmed from public.candidates where id=c) is not null then raise exception 'Legacy status is not unknown'; end if;
 original := public.register_appex_candidate('PES1UG24CS496','Online Candidate',true);
 if not (select online_registration_confirmed from public.candidates where id=original) then raise exception 'Yes not saved'; end if;
 c := public.register_appex_candidate('PES1UG24CS496','Online Candidate',false);
 if c <> original or (select online_registration_confirmed from public.candidates where id=c) then raise exception 'Resume status not updated'; end if;
 if (select count(*) from public.attempts where candidate_id=c) <> 1 then raise exception 'Duplicate attempts'; end if;
 failed := false;
 begin perform public.register_appex_candidate('PES1UG24CS496','Wrong Name',true); exception when others then failed:=true; end;
 if not failed or (select online_registration_confirmed from public.candidates where id=c) then raise exception 'Name mismatch changed status'; end if;
 failed := false;
 begin perform public.register_appex_candidate('PES1UG24CS497','Missing Choice',null); exception when others then failed:=true; end;
 if not failed or exists(select 1 from public.candidates where srn='PES1UG24CS497') then raise exception 'Invalid choice registered'; end if;
 failed := false;
 begin perform public.register_appex_candidate('SHORT','Short SRN',false); exception when others then failed:=true; end;
 if not failed then raise exception 'Short SRN accepted'; end if;
 if (select online_registration_confirmed from public.candidate_review_rows where id=c) then raise exception 'View status incorrect'; end if;
 if has_function_privilege('authenticated','public.register_appex_candidate(text,text,boolean)','EXECUTE')
 or has_function_privilege('anon','public.register_appex_candidate(text,text,boolean)','EXECUTE') then raise exception 'Public registration RPC accessible'; end if;
 if not has_function_privilege('service_role','public.register_appex_candidate(text,text,boolean)','EXECUTE') then raise exception 'Service denied'; end if;
 stats := public.appex_question_bank_stats();
 if (stats->>'activeCount')::int <> 14 or (stats->>'activePoints')::numeric <> 100 or (stats->>'nextOrder')::int <> 15 then raise exception 'Bank totals incorrect'; end if;
 if has_function_privilege('authenticated','public.appex_question_bank_stats()','EXECUTE') then raise exception 'Stats publicly accessible'; end if;
 raise notice 'PASS: unknown legacy status, Yes/No persistence and resume, uniqueness, validation rollback, view status, service-only permissions, global question totals';
end $$;
-- More than two pages, including coincident timestamps, without changing the bank.
insert into public.candidates(srn,full_name,online_registration_confirmed)
select 'PAGE'||lpad(n::text,9,'0'), 'Pagination '||n, n%2=0 from generate_series(1,61) n;
do $$ begin
 if (select count(*) from (select id from public.candidate_review_rows where srn like 'PAGE%' order by created_at,id limit 25 offset 50) p) <> 11 then raise exception 'Last page size incorrect'; end if;
 if (select count(*) from public.candidate_review_rows where srn like 'PAGE%' and online_registration_confirmed) <> 30 then raise exception 'Status filter count incorrect'; end if;
end $$;
rollback;
