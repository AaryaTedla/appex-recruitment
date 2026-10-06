do $$ begin
 if (select count(*) from public.questions where is_active) <> 14 then raise exception 'Rejected migration changed bank'; end if;
 if (select a.status from public.attempts a join public.candidates c on c.id=a.candidate_id where c.srn='PES1UG23CS002') <> 'in_progress' then raise exception 'Running candidate interrupted'; end if;
 if exists(select 1 from information_schema.columns where table_name='questions' and column_name='evaluation_notes' and table_schema='public') then
  -- Fresh schema has the column, but no new bank records may have appeared.
  if exists(select 1 from public.questions where id::text like '00500000%') then raise exception 'Rejected migration inserted questions'; end if;
 end if;
end $$;
update public.attempts set started_at=now()-interval '20 minutes' where candidate_id=(select id from public.candidates where srn='PES1UG23CS002');
