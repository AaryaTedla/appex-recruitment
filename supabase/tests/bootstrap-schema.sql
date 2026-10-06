-- Only for another disposable local database in the existing test cluster.
create schema auth;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
