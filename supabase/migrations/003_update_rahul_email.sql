-- Apply after 002_hardening.sql to replace Rahul's allowed admin email.
-- Auth accounts are managed separately in Supabase Authentication > Users.
begin;

create or replace function public.is_appex_allowed_user(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users where id = p_user_id and lower(email) = any(array[
    'meg.sanjeev@gmail.com', 'aaryatedla@gmail.com', 'bhaveshvelluru@gmail.com',
    'rahul.dutta.bwn@gmail.com', 'tadipatrirohansai@gmail.com'
  ]));
$$;
revoke all on function public.is_appex_allowed_user(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
