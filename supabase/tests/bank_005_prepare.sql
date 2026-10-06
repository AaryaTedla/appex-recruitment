-- Local disposable test database only. Creates historical data to preserve.
insert into auth.users(id,email) values('10000000-0000-0000-0000-000000000001','aaryatedla@gmail.com');
insert into public.profiles(id,role) values('10000000-0000-0000-0000-000000000001','admin');
do $$ declare c uuid; a uuid; answer_id uuid; begin
 c:=public.register_appex_candidate('PES1UG23CS001','Legacy Completed',true);
 perform public.start_appex_attempt(c,15,true);
 select id into a from public.attempts where candidate_id=c;
 perform public.finalize_appex_attempt(a,'{}');
 select id into answer_id from public.answers where attempt_id=a and question_id='00000000-0000-0000-0000-000000000009';
 perform public.save_appex_evaluation(a,'10000000-0000-0000-0000-000000000001',7,'Maybe','Historical note',jsonb_build_array(jsonb_build_object('answerId',answer_id,'manualScore',7,'criteria',jsonb_build_object('reasoning',4),'comments','Historical answer note')));
 perform public.register_appex_candidate('PES1UG23CS003','Legacy Not Started',true);
 c:=public.register_appex_candidate('PES1UG23CS002','Legacy Running',false);
 perform public.start_appex_attempt(c,15,true);
end $$;
