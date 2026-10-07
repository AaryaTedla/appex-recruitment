-- Apply after 007. Service-only expiry sweep; preserves all answer text and durations.
begin;
create or replace function public.expire_appex_attempts()
returns integer language plpgsql security definer set search_path=public as $$
declare item record; expired integer := 0;
begin
  for item in select id from public.attempts where status='in_progress' and started_at is not null
    and timer_enabled and clock_timestamp() >= started_at + duration_minutes * interval '1 minute'
    for update skip locked loop
    perform public.submit_appex_attempt(item.id,'time_expired');
    expired := expired + 1;
  end loop;
  return expired;
end;
$$;
revoke all on function public.expire_appex_attempts() from public, anon, authenticated;
grant execute on function public.expire_appex_attempts() to service_role;
create index if not exists attempts_pending_expiry_idx on public.attempts(started_at)
  where status='in_progress' and started_at is not null and timer_enabled;
notify pgrst, 'reload schema';
commit;
