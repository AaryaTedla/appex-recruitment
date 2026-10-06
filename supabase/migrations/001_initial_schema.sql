-- APPEX recruitment schema
-- Candidates use a server-managed opaque cookie session. Evaluators/admins use Supabase Auth.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('evaluator', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  srn text not null unique,
  full_name text not null,
  status text not null default 'registered' check (status in ('registered', 'in_progress', 'submitted')),
  created_at timestamptz not null default now(),
  constraint candidates_srn_uppercase check (srn = upper(srn)),
  constraint candidates_nonempty check (length(trim(srn)) > 0 and length(trim(full_name)) > 0)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'python_programming',
    'computer_technology',
    'aptitude_patterns',
    'situational_decision',
    'improvisation_problem_solving',
    'commitment_reliability',
    'wildcard'
  )),
  type text not null check (type in ('mcq', 'code_output', 'true_false', 'scenario_mcq', 'short_text', 'creative')),
  question_text text not null,
  code_snippet text,
  options jsonb,
  correct_answer text,
  evaluation_notes text,
  points numeric(5,2) not null check (points >= 0 and points <= 100),
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium')),
  is_active boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_nonempty check (length(trim(question_text)) > 0)
);

create unique index if not exists questions_active_sort_order_unique
  on public.questions(sort_order)
  where is_active = true;

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.candidates(id) on delete cascade,
  started_at timestamptz,
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'time_expired')),
  objective_score numeric(6,2) not null default 0,
  final_score numeric(6,2) check (final_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  answer_text text not null default '',
  auto_score numeric(5,2),
  manual_score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id),
  constraint answers_text_length check (length(answer_text) <= 1500),
  constraint answers_scores_nonnegative check ((auto_score is null or auto_score >= 0) and (manual_score is null or manual_score >= 0))
);

create table if not exists public.integrity_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  event_type text not null check (event_type in ('tab_switch', 'window_blur', 'fullscreen_exit')),
  created_at timestamptz not null default now()
);

create index if not exists integrity_events_attempt_idx on public.integrity_events(attempt_id, created_at);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  evaluator_id uuid not null references auth.users(id) on delete restrict,
  score numeric(6,2) not null check (score between 0 and 100),
  comments text not null default '',
  recommendation text not null check (recommendation in ('Strongly Shortlist', 'Shortlist', 'Maybe', 'Do Not Shortlist')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.answer_evaluations (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null unique references public.answers(id) on delete cascade,
  evaluator_id uuid not null references auth.users(id) on delete restrict,
  criteria jsonb not null default '{}'::jsonb,
  comments text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists candidate_sessions_candidate_idx on public.candidate_sessions(candidate_id);
create index if not exists candidate_sessions_expiry_idx on public.candidate_sessions(expires_at);

-- Role helpers use SECURITY DEFINER to avoid recursive profile RLS evaluation.
create or replace function public.is_appex_evaluator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('evaluator', 'admin')
  );
$$;

create or replace function public.is_appex_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_appex_evaluator() from public;
revoke all on function public.is_appex_admin() from public;
grant execute on function public.is_appex_evaluator() to authenticated;
grant execute on function public.is_appex_admin() to authenticated;

-- Submitted attempts may still receive evaluator-only manual scoring, but candidate answer text is immutable.
create or replace function public.protect_submitted_answer_text()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  attempt_status text;
begin
  select status into attempt_status
  from public.attempts
  where id = coalesce(new.attempt_id, old.attempt_id);

  if attempt_status in ('submitted', 'time_expired') then
    if tg_op = 'INSERT' or tg_op = 'DELETE' then
      raise exception 'Submitted attempt answers are immutable';
    end if;
    if new.answer_text is distinct from old.answer_text
      or new.question_id is distinct from old.question_id
      or new.attempt_id is distinct from old.attempt_id then
      raise exception 'Submitted answer text is immutable';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists answers_submission_guard on public.answers;
create trigger answers_submission_guard
before insert or update or delete on public.answers
for each row execute function public.protect_submitted_answer_text();

-- Atomic submission: locks the attempt, auto-scores objective questions, and prevents double submission.
create or replace function public.submit_appex_attempt(p_attempt_id uuid, p_reason text default 'submitted')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_attempt public.attempts%rowtype;
  objective_total numeric(6,2);
begin
  if p_reason not in ('submitted', 'time_expired') then
    raise exception 'Invalid submission reason';
  end if;

  select * into current_attempt
  from public.attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'Attempt not found';
  end if;

  if current_attempt.status in ('submitted', 'time_expired') then
    return jsonb_build_object('submitted', true, 'duplicate', true, 'status', current_attempt.status);
  end if;

  update public.answers a
  set auto_score = case
    when q.correct_answer is null then null
    when lower(trim(a.answer_text)) = lower(trim(q.correct_answer)) then q.points
    else 0
  end,
  updated_at = now()
  from public.questions q
  where a.attempt_id = p_attempt_id
    and a.question_id = q.id;

  select coalesce(sum(auto_score), 0)
  into objective_total
  from public.answers
  where attempt_id = p_attempt_id;

  update public.attempts
  set status = p_reason,
      submitted_at = now(),
      objective_score = objective_total,
      updated_at = now()
  where id = p_attempt_id;

  update public.candidates
  set status = 'submitted'
  where id = current_attempt.candidate_id;

  return jsonb_build_object('submitted', true, 'duplicate', false, 'status', p_reason, 'objective_score', objective_total);
end;
$$;

revoke all on function public.submit_appex_attempt(uuid, text) from public;
revoke all on function public.submit_appex_attempt(uuid, text) from anon;
revoke all on function public.submit_appex_attempt(uuid, text) from authenticated;
grant execute on function public.submit_appex_attempt(uuid, text) to service_role;

-- Row Level Security. Candidate browser sessions do not query Supabase directly; server routes mediate access.
alter table public.profiles enable row level security;
alter table public.candidates enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.integrity_events enable row level security;
alter table public.evaluations enable row level security;
alter table public.answer_evaluations enable row level security;
alter table public.candidate_sessions enable row level security;

create policy "profiles_read_self" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_admin_read" on public.profiles for select to authenticated using (public.is_appex_admin());
create policy "profiles_admin_write" on public.profiles for all to authenticated using (public.is_appex_admin()) with check (public.is_appex_admin());

create policy "evaluators_read_candidates" on public.candidates for select to authenticated using (public.is_appex_evaluator());
create policy "evaluators_read_questions" on public.questions for select to authenticated using (public.is_appex_evaluator());
create policy "admins_manage_questions" on public.questions for all to authenticated using (public.is_appex_admin()) with check (public.is_appex_admin());
create policy "evaluators_read_attempts" on public.attempts for select to authenticated using (public.is_appex_evaluator());
create policy "evaluators_read_answers" on public.answers for select to authenticated using (public.is_appex_evaluator());
create policy "evaluators_read_integrity" on public.integrity_events for select to authenticated using (public.is_appex_evaluator());
create policy "evaluators_read_evaluations" on public.evaluations for select to authenticated using (public.is_appex_evaluator());
create policy "evaluators_write_evaluations" on public.evaluations for insert to authenticated with check (public.is_appex_evaluator() and evaluator_id = auth.uid());
create policy "evaluators_update_own_evaluations" on public.evaluations for update to authenticated using (public.is_appex_evaluator() and evaluator_id = auth.uid()) with check (public.is_appex_evaluator() and evaluator_id = auth.uid());
create policy "evaluators_read_answer_evaluations" on public.answer_evaluations for select to authenticated using (public.is_appex_evaluator());
create policy "evaluators_write_answer_evaluations" on public.answer_evaluations for insert to authenticated with check (public.is_appex_evaluator() and evaluator_id = auth.uid());
create policy "evaluators_update_own_answer_evaluations" on public.answer_evaluations for update to authenticated using (public.is_appex_evaluator() and evaluator_id = auth.uid()) with check (public.is_appex_evaluator() and evaluator_id = auth.uid());

-- No anon policies are created. candidate_sessions is intentionally service-role-only.
