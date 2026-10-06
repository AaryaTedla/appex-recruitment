-- Apply after 003_update_rahul_email.sql. Safe to reapply; existing status remains unknown.
begin;
alter table public.candidates add column if not exists online_registration_confirmed boolean;

drop function if exists public.register_appex_candidate(text,text);
create or replace function public.register_appex_candidate(p_srn text, p_full_name text, p_online_registration_confirmed boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare candidate public.candidates%rowtype;
begin
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

revoke all on function public.register_appex_candidate(text,text,boolean) from public, anon, authenticated;
grant execute on function public.register_appex_candidate(text,text,boolean) to service_role;

create or replace view public.candidate_review_rows with (security_invoker = true) as
select c.id, c.srn, c.full_name, c.status, c.created_at,
  a.id as attempt_id, a.status as attempt_status, a.submitted_at,
  a.objective_score, a.final_score, coalesce(a.final_score,a.objective_score,0) as effective_score,
  e.id is not null as evaluated, e.recommendation,
  coalesce(e.recommendation in ('Strongly Shortlist','Shortlist'),false) as shortlisted,
  (select count(*) from public.integrity_events i where i.attempt_id=a.id) as integrity_count, c.online_registration_confirmed
from public.candidates c left join public.attempts a on a.candidate_id=c.id
left join public.evaluations e on e.attempt_id=a.id;
grant select on public.candidate_review_rows to authenticated, service_role;

create or replace function public.appex_question_bank_stats()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('activeCount', count(*) filter (where is_active),
    'activePoints', coalesce(sum(points) filter (where is_active),0),
    'nextOrder', coalesce(max(sort_order),0)+1) from public.questions;
$$;
revoke all on function public.appex_question_bank_stats() from public, anon, authenticated;
grant execute on function public.appex_question_bank_stats() to service_role;

notify pgrst, 'reload schema';
commit;
