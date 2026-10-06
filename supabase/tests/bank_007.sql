do $$ begin
  if (select count(*) from public.questions where is_active) <> 22 or (select sum(points) from public.questions where is_active) <> 100 then
    raise exception 'Bank 007 composition invalid';
  end if;
  if not exists(select 1 from public.questions where id='00700000-0000-4000-8000-000000000004' and is_active
    and code_snippet=E'x = 2\ny = 3\nprint(x + y)' and correct_answer='5' and options='["3","4","5","6"]'::jsonb and sort_order=4) then
    raise exception 'Replacement question missing';
  end if;
  if not exists(select 1 from public.questions where id='00600000-0000-4000-8000-000000000004' and not is_active) then
    raise exception 'Previous question was not preserved';
  end if;
  if not exists(select 1 from public.answers a join public.attempts t on t.id=a.attempt_id
    where t.id='00700000-0000-4000-8000-000000000101' and a.question_id='00600000-0000-4000-8000-000000000004'
    and a.answer_text='3' and a.auto_score=4 and t.objective_score=4 and t.duration_minutes=30 and t.status='submitted') then
    raise exception 'Historical answer, score or duration changed';
  end if;
end $$;
