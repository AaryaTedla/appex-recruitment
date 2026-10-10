-- Apply after 008. Closing blocks new tests; started applicants can finish/resume.
begin;
create table if not exists public.recruitment_settings (
  id integer primary key check (id=1),
  test_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.recruitment_settings(id) values(1) on conflict(id) do nothing;
alter table public.recruitment_settings enable row level security;
revoke all on public.recruitment_settings from anon, authenticated;
grant select, update on public.recruitment_settings to service_role;
create or replace function public.register_appex_candidate(p_srn text, p_full_name text, p_online_registration_confirmed boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare candidate public.candidates%rowtype;
begin
  perform 1 from public.recruitment_settings where id=1 for share;
  if not (select test_open from public.recruitment_settings where id=1) and not exists (
    select 1 from public.candidates c join public.attempts a on a.candidate_id=c.id where c.srn=p_srn and a.started_at is not null
  ) then raise exception 'TEST_CLOSED'; end if;
  if p_online_registration_confirmed is null or p_srn is null or p_full_name is null or p_srn !~ '^[A-Z0-9]{13}$' or length(trim(p_full_name)) < 2 or length(p_full_name) > 120 then
    raise exception 'Invalid candidate';
  end if;
  insert into public.candidates(srn, full_name) values(p_srn, p_full_name)
    on conflict(srn) do nothing;
  select * into candidate from public.candidates where srn = p_srn for update;
  if lower(trim(candidate.full_name)) <> lower(trim(p_full_name)) then
    raise exception 'SRN_NAME_MISMATCH';
  end if;
  update public.candidates set online_registration_confirmed=p_online_registration_confirmed where id=candidate.id;
  insert into public.attempts(candidate_id) values(candidate.id) on conflict(candidate_id) do nothing;
  return candidate.id;
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
  perform 1 from public.recruitment_settings where id=1 for share;
  if not (select test_open from public.recruitment_settings where id=1) then raise exception 'TEST_CLOSED'; end if;
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

revoke all on function public.register_appex_candidate(text,text,boolean), public.start_appex_attempt(uuid,numeric,boolean) from public,anon,authenticated;
grant execute on function public.register_appex_candidate(text,text,boolean), public.start_appex_attempt(uuid,numeric,boolean) to service_role;
notify pgrst, 'reload schema';
commit;
