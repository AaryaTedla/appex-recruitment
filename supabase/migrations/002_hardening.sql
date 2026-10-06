-- Apply once after 001_initial_schema.sql. Safe to reapply; preserves candidates and answers.
begin;

create or replace function public.is_appex_allowed_user(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users where id = p_user_id and lower(email) = any(array[
    'meg.sanjeev@gmail.com', 'aaryatedla@gmail.com', 'bhaveshvelluru@gmail.com',
    'rahul.dutta.bwn@gmail.com', 'tadipatrirohansai@gmail.com'
  ]));
$$;
revoke all on function public.is_appex_allowed_user(uuid) from public, anon, authenticated;

create or replace function public.is_appex_evaluator()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_appex_allowed_user(auth.uid()) and exists (
    select 1 from public.profiles where id = auth.uid() and role in ('evaluator', 'admin')
  );
$$;
create or replace function public.is_appex_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_appex_allowed_user(auth.uid()) and exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- All writes go through authorized server routes. Direct REST writes bypassed
-- question history locks and evaluator ownership checks in the previous policies.
drop policy if exists profiles_admin_write on public.profiles;
drop policy if exists admins_manage_questions on public.questions;
drop policy if exists evaluators_write_evaluations on public.evaluations;
drop policy if exists evaluators_update_own_evaluations on public.evaluations;
drop policy if exists evaluators_write_answer_evaluations on public.answer_evaluations;
drop policy if exists evaluators_update_own_answer_evaluations on public.answer_evaluations;

alter table public.attempts add column if not exists duration_minutes numeric not null default 15;
alter table public.attempts add column if not exists timer_enabled boolean not null default true;

-- Flat review data allows filters and pagination to run in the database rather
-- than silently filtering only Supabase's first 1,000 embedded records.
create or replace view public.candidate_review_rows with (security_invoker = true) as
select c.id, c.srn, c.full_name, c.status, c.created_at,
  a.id as attempt_id, a.status as attempt_status, a.submitted_at,
  a.objective_score, a.final_score, coalesce(a.final_score,a.objective_score,0) as effective_score,
  e.id is not null as evaluated, e.recommendation,
  coalesce(e.recommendation in ('Strongly Shortlist','Shortlist'),false) as shortlisted,
  (select count(*) from public.integrity_events i where i.attempt_id=a.id) as integrity_count
from public.candidates c left join public.attempts a on a.candidate_id=c.id
left join public.evaluations e on e.attempt_id=a.id;
grant select on public.candidate_review_rows to authenticated, service_role;
create index if not exists candidates_created_at_idx on public.candidates(created_at desc);

-- Serialize answer changes with submission, including late autosave requests.
create or replace function public.submit_appex_attempt(p_attempt_id uuid, p_reason text default 'submitted')
returns jsonb language plpgsql security definer set search_path = public as $$
declare attempt public.attempts%rowtype; objective_total numeric;
begin
  if p_reason not in ('submitted','time_expired') then raise exception 'Invalid submission reason'; end if;
  select * into attempt from public.attempts where id=p_attempt_id for update;
  if not found then raise exception 'Attempt not found'; end if;
  if attempt.status <> 'in_progress' then
    return jsonb_build_object('submitted',true,'duplicate',true,'status',attempt.status);
  end if;
  if attempt.started_at is null then raise exception 'Challenge has not been started'; end if;
  update public.answers a set auto_score=case
    when q.type not in ('mcq','code_output','true_false','scenario_mcq') then null
    when a.answer_text=q.correct_answer then q.points else 0 end, updated_at=now()
    from public.questions q where a.attempt_id=p_attempt_id and a.question_id=q.id;
  select coalesce(sum(auto_score),0) into objective_total from public.answers where attempt_id=p_attempt_id;
  update public.attempts set status=p_reason, submitted_at=clock_timestamp(), objective_score=objective_total,
    updated_at=now() where id=p_attempt_id;
  update public.candidates set status='submitted' where id=attempt.candidate_id;
  return jsonb_build_object('submitted',true,'duplicate',false,'status',p_reason,'objective_score',objective_total);
end;
$$;

create or replace function public.protect_submitted_answer_text()
returns trigger language plpgsql set search_path = public as $$
declare attempt_status text;
begin
  select status into attempt_status from public.attempts
    where id = coalesce(new.attempt_id, old.attempt_id) for update;
  if attempt_status in ('submitted', 'time_expired') then
    if tg_op in ('INSERT', 'DELETE') or new.answer_text is distinct from old.answer_text
      or new.question_id is distinct from old.question_id
      or new.attempt_id is distinct from old.attempt_id then
      raise exception 'Submitted answer text is immutable';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Record unanswered questions as well, preserving historical test content.
insert into public.answers (attempt_id, question_id)
select a.id, q.id from public.attempts a cross join public.questions q
where a.status = 'in_progress' and a.started_at is not null and q.is_active
on conflict (attempt_id, question_id) do nothing;

create or replace function public.register_appex_candidate(p_srn text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare candidate public.candidates%rowtype;
begin
  if p_srn !~ '^[A-Z0-9]{6,24}$' or length(trim(p_full_name)) < 2 or length(p_full_name) > 120 then
    raise exception 'Invalid candidate';
  end if;
  insert into public.candidates(srn, full_name) values(p_srn, p_full_name)
    on conflict(srn) do nothing;
  select * into candidate from public.candidates where srn = p_srn for update;
  if lower(trim(candidate.full_name)) <> lower(trim(p_full_name)) then
    raise exception 'SRN_NAME_MISMATCH';
  end if;
  insert into public.attempts(candidate_id) values(candidate.id) on conflict(candidate_id) do nothing;
  return candidate.id;
end;
$$;

create or replace function public.replace_appex_session(p_candidate_id uuid, p_hash text, p_expires timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.candidates where id = p_candidate_id for update;
  if not found then raise exception 'Candidate not found'; end if;
  delete from public.candidate_sessions where candidate_id = p_candidate_id;
  insert into public.candidate_sessions(candidate_id, token_hash, expires_at) values(p_candidate_id, p_hash, p_expires);
end;
$$;

create or replace function public.start_appex_attempt(p_candidate_id uuid, p_minutes numeric, p_timer_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
declare attempt public.attempts%rowtype;
begin
  perform pg_advisory_xact_lock(20261006);
  select * into attempt from public.attempts where candidate_id = p_candidate_id for update;
  if not found then raise exception 'Attempt not found'; end if;
  if attempt.status <> 'in_progress' or attempt.started_at is not null then return; end if;
  if p_minutes < 1 or p_minutes > 1440 or p_minutes is null then raise exception 'Invalid duration'; end if;
  if not exists(select 1 from public.questions where is_active) then raise exception 'NO_ACTIVE_QUESTIONS'; end if;
  if (select sum(points) from public.questions where is_active) not between 1 and 100 then
    raise exception 'Active question points must total between 1 and 100';
  end if;
  insert into public.answers(attempt_id, question_id)
    select attempt.id, id from public.questions where is_active on conflict(attempt_id, question_id) do nothing;
  update public.attempts set started_at = clock_timestamp(), duration_minutes = p_minutes,
    timer_enabled = p_timer_enabled, updated_at = now() where id = attempt.id;
  update public.candidates set status = 'in_progress' where id = p_candidate_id;
end;
$$;

create or replace function public.finalize_appex_attempt(p_attempt_id uuid, p_answers jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare attempt public.attempts%rowtype; item record; question public.questions%rowtype; text_answer text;
begin
  select * into attempt from public.attempts where id = p_attempt_id for update;
  if not found then raise exception 'Attempt not found'; end if;
  if attempt.status <> 'in_progress' then return jsonb_build_object('submitted', true, 'duplicate', true, 'status', attempt.status); end if;
  if attempt.started_at is null then raise exception 'Challenge has not been started'; end if;
  if attempt.timer_enabled and clock_timestamp() >= attempt.started_at + attempt.duration_minutes * interval '1 minute' then
    return public.submit_appex_attempt(p_attempt_id, 'time_expired');
  end if;
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'Invalid answers'; end if;
  for item in select key, value from jsonb_each_text(p_answers) loop
    select q.* into question from public.questions q join public.answers a on a.question_id = q.id
      where a.attempt_id = p_attempt_id and q.id::text = item.key;
    if not found then raise exception 'Invalid question reference'; end if;
    text_answer := left(coalesce(item.value, ''), 500);
    if question.type in ('mcq', 'code_output', 'true_false', 'scenario_mcq') and text_answer <> ''
      and not coalesce(question.options @> jsonb_build_array(text_answer), false) then raise exception 'Invalid answer option'; end if;
    update public.answers set answer_text = text_answer, updated_at = now()
      where attempt_id = p_attempt_id and question_id = question.id;
  end loop;
  return public.submit_appex_attempt(p_attempt_id, 'submitted');
end;
$$;

create or replace function public.save_appex_answer(p_attempt_id uuid, p_question_id uuid, p_text text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare attempt public.attempts%rowtype; question public.questions%rowtype;
begin
  select * into attempt from public.attempts where id = p_attempt_id for update;
  if not found or attempt.started_at is null then raise exception 'Challenge has not been started'; end if;
  if attempt.status <> 'in_progress' then return jsonb_build_object('submitted', true); end if;
  if attempt.timer_enabled and clock_timestamp() >= attempt.started_at + attempt.duration_minutes * interval '1 minute' then
    return public.submit_appex_attempt(p_attempt_id, 'time_expired');
  end if;
  select q.* into question from public.questions q join public.answers a on a.question_id = q.id
    where a.attempt_id = p_attempt_id and q.id = p_question_id;
  if not found then raise exception 'Question is unavailable'; end if;
  if question.type in ('mcq', 'code_output', 'true_false', 'scenario_mcq') and p_text <> ''
    and not coalesce(question.options @> jsonb_build_array(p_text), false) then raise exception 'Invalid answer option'; end if;
  update public.answers set answer_text = left(p_text, 500), updated_at = now()
    where attempt_id = p_attempt_id and question_id = p_question_id;
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.record_appex_integrity(p_attempt_id uuid, p_event text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare attempt public.attempts%rowtype; event_count integer;
begin
  select * into attempt from public.attempts where id=p_attempt_id for update;
  if not found or attempt.started_at is null or attempt.status <> 'in_progress' then
    return jsonb_build_object('active',false);
  end if;
  if attempt.timer_enabled and clock_timestamp() >= attempt.started_at + attempt.duration_minutes * interval '1 minute' then
    perform public.submit_appex_attempt(p_attempt_id,'time_expired');
    return jsonb_build_object('active',false);
  end if;
  if p_event not in ('tab_switch','window_blur','fullscreen_exit') then raise exception 'Invalid event'; end if;
  select count(*) into event_count from public.integrity_events where attempt_id=p_attempt_id;
  if event_count >= 100 or exists(select 1 from public.integrity_events where attempt_id=p_attempt_id
    and created_at > clock_timestamp() - interval '1.2 seconds') then
    return jsonb_build_object('active',true,'count',event_count,'recorded',false);
  end if;
  insert into public.integrity_events(attempt_id,event_type) values(p_attempt_id,p_event);
  return jsonb_build_object('active',true,'count',event_count+1,'recorded',true);
end;
$$;

create or replace function public.save_appex_evaluation(p_attempt_id uuid, p_evaluator_id uuid, p_score numeric,
  p_recommendation text, p_comments text, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare attempt public.attempts%rowtype; reviewer_role text; existing_owner uuid; item jsonb;
  answer public.answers%rowtype; question public.questions%rowtype; manual numeric; criteria jsonb; criterion record;
begin
  if not public.is_appex_allowed_user(p_evaluator_id) then raise exception 'Unauthorized'; end if;
  select role into reviewer_role from public.profiles where id = p_evaluator_id;
  if reviewer_role is null then raise exception 'Unauthorized'; end if;
  select * into attempt from public.attempts where id = p_attempt_id for update;
  if not found or attempt.status = 'in_progress' then raise exception 'Attempt has not been submitted'; end if;
  select evaluator_id into existing_owner from public.evaluations where attempt_id = p_attempt_id;
  if existing_owner is not null and existing_owner <> p_evaluator_id and reviewer_role <> 'admin' then
    raise exception 'Already evaluated by another evaluator';
  end if;
  if p_score is null or p_score not between 0 and 100 or p_recommendation not in
    ('Strongly Shortlist', 'Shortlist', 'Maybe', 'Do Not Shortlist') then raise exception 'Invalid evaluation'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'Invalid answer evaluations'; end if;
  for item in select value from jsonb_array_elements(p_answers) loop
    select * into answer from public.answers where id::text = item->>'answerId' and attempt_id = p_attempt_id;
    if not found then raise exception 'Invalid answer reference'; end if;
    select * into question from public.questions where id = answer.question_id;
    if question.type in ('mcq', 'code_output', 'true_false', 'scenario_mcq') then raise exception 'Objective answer cannot be manually scored'; end if;
    manual := coalesce((item->>'manualScore')::numeric, 0);
    if manual not between 0 and question.points then raise exception 'Manual score outside point range'; end if;
    criteria := coalesce(item->'criteria', '{}'::jsonb);
    if jsonb_typeof(criteria) <> 'object' then raise exception 'Invalid rubric'; end if;
    for criterion in select key, value from jsonb_each_text(criteria) loop
      if criterion.key not in ('reasoning','practicality','creativity','communication','adaptability','teamwork')
        or criterion.value not in ('1','2','3','4','5') or criterion.value is null then raise exception 'Invalid rubric'; end if;
    end loop;
    update public.answers set manual_score = manual, updated_at = now() where id = answer.id;
    insert into public.answer_evaluations(answer_id,evaluator_id,criteria,comments)
      values(answer.id,p_evaluator_id,criteria,left(coalesce(item->>'comments',''),2000))
      on conflict(answer_id) do update set evaluator_id=excluded.evaluator_id, criteria=excluded.criteria,
        comments=excluded.comments, updated_at=now();
  end loop;
  insert into public.evaluations(attempt_id,evaluator_id,score,recommendation,comments)
    values(p_attempt_id,p_evaluator_id,p_score,p_recommendation,left(coalesce(p_comments,''),5000))
    on conflict(attempt_id) do update set evaluator_id=excluded.evaluator_id, score=excluded.score,
      recommendation=excluded.recommendation, comments=excluded.comments, updated_at=now();
  update public.attempts set final_score=p_score, updated_at=now() where id=p_attempt_id;
end;
$$;

-- Expire abandoned attempts before changing the active bank. The advisory lock
-- prevents an active bank edit from racing a challenge start.
create or replace function public.guard_appex_question_changes()
returns trigger language plpgsql set search_path = public as $$
declare expired record;
begin
  perform pg_advisory_xact_lock(20261006);
  for expired in select id from public.attempts where status='in_progress' and started_at is not null
    and timer_enabled and clock_timestamp() >= started_at + duration_minutes * interval '1 minute' loop
    perform public.submit_appex_attempt(expired.id,'time_expired');
  end loop;
  if coalesce(new.is_active,false) or coalesce(old.is_active,false) then
    if exists(select 1 from public.attempts where status='in_progress' and started_at is not null) then
      raise exception 'Active questions are locked while a candidate is taking the challenge';
    end if;
  end if;
  if tg_op='UPDATE' and (to_jsonb(new) - 'is_active' - 'updated_at') is distinct from (to_jsonb(old) - 'is_active' - 'updated_at')
    and exists(select 1 from public.answers where question_id=old.id) then
    raise exception 'Question has candidate answers; add a replacement instead';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists questions_history_guard on public.questions;
create trigger questions_history_guard before insert or update or delete on public.questions
for each row execute function public.guard_appex_question_changes();

revoke all on function public.register_appex_candidate(text,text), public.replace_appex_session(uuid,text,timestamptz),
  public.start_appex_attempt(uuid,numeric,boolean), public.finalize_appex_attempt(uuid,jsonb),
  public.save_appex_answer(uuid,uuid,text), public.record_appex_integrity(uuid,text), public.save_appex_evaluation(uuid,uuid,numeric,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.register_appex_candidate(text,text), public.replace_appex_session(uuid,text,timestamptz),
  public.start_appex_attempt(uuid,numeric,boolean), public.finalize_appex_attempt(uuid,jsonb),
  public.save_appex_answer(uuid,uuid,text), public.record_appex_integrity(uuid,text), public.save_appex_evaluation(uuid,uuid,numeric,text,text,jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
