insert into public.candidates(id,srn,full_name) values('00700000-0000-4000-8000-000000000100','PES1UG24CS777','Question History');
insert into public.attempts(id,candidate_id,started_at,duration_minutes,timer_enabled)
values('00700000-0000-4000-8000-000000000101','00700000-0000-4000-8000-000000000100',clock_timestamp(),30,true);
insert into public.answers(attempt_id,question_id,answer_text)
values('00700000-0000-4000-8000-000000000101','00600000-0000-4000-8000-000000000004','3');
