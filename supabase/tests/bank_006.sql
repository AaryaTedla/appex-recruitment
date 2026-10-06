do $$ begin
  if (select count(*) from public.questions where is_active) <> 22
    or (select sum(points) from public.questions where is_active) <> 100
    or (select count(*) from public.questions where is_active and type in ('mcq','code_output','scenario_mcq','true_false')) <> 20
    or (select count(*) from public.questions where is_active and difficulty='easy' and type in ('mcq','code_output','scenario_mcq','true_false')) <> 14 then
    raise exception 'Easier bank composition invalid';
  end if;
  if exists(select 1 from public.questions where is_active and id::text not like '00600000-%') then
    raise exception 'Previous bank is still active';
  end if;
  if (select count(*) from public.questions where id::text like '00500000-%') <> 22 then
    raise exception 'Previous bank was not preserved';
  end if;
end $$;
