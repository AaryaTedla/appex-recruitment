#!/usr/bin/env bash
set -euo pipefail
# Requires a local PostgreSQL installation. Uses an isolated Unix socket and
# disposable database; does not read .env.local or connect to Supabase.
task_bin="$(pg_config --bindir)"
task_dir="$(mktemp -d /tmp/appex-db-check.XXXXXX)"
task_root="$(cd "$(dirname "$0")/.." && pwd)"
"$task_bin/initdb" -D "$task_dir/data" -A trust --no-locale >"$task_dir/init.log"
trap '"$task_bin/pg_ctl" -D "$task_dir/data" -m immediate stop >/dev/null 2>&1 || true' EXIT
"$task_bin/pg_ctl" -D "$task_dir/data" -l "$task_dir/server.log" -o "-k $task_dir -p 55439 -h ''" start
"$task_bin/psql" -h "$task_dir" -p 55439 -d postgres -v ON_ERROR_STOP=1 \
  -f "$task_root/supabase/tests/bootstrap.sql" \
  -f "$task_root/supabase/migrations/001_initial_schema.sql" \
  -f "$task_root/supabase/tests/legacy_seed.sql" \
  -f "$task_root/supabase/migrations/002_hardening.sql" \
  -f "$task_root/supabase/migrations/002_hardening.sql" \
  -f "$task_root/supabase/migrations/003_update_rahul_email.sql" \
  -f "$task_root/supabase/migrations/004_online_registration.sql" \
  -f "$task_root/supabase/migrations/004_online_registration.sql" \
  -f "$task_root/supabase/tests/hardening.sql" \
  -f "$task_root/supabase/tests/online_registration.sql"
"$task_bin/psql" -h "$task_dir" -p 55439 -d postgres -v ON_ERROR_STOP=1 -c "alter table public.questions drop column evaluation_notes;"
"$task_bin/psql" -h "$task_dir" -p 55439 -d postgres -v ON_ERROR_STOP=1 -f "$task_root/supabase/tests/bank_005_prepare.sql"
if "$task_bin/psql" -h "$task_dir" -p 55439 -d postgres -v ON_ERROR_STOP=1 -f "$task_root/supabase/migrations/005_test_bank.sql" >"$task_dir/rejection.log" 2>&1; then
  echo "ERROR: bank replacement accepted while test running"; exit 1
fi
if ! rg -q QUESTION_BANK_IN_USE "$task_dir/rejection.log"; then cat "$task_dir/rejection.log"; exit 1; fi
"$task_bin/psql" -h "$task_dir" -p 55439 -d postgres -v ON_ERROR_STOP=1 \
  -f "$task_root/supabase/tests/bank_005_after_rejection.sql" \
  -f "$task_root/supabase/migrations/005_test_bank.sql" \
  -f "$task_root/supabase/migrations/005_test_bank.sql" \
  -f "$task_root/supabase/tests/bank_005.sql"
# Also exercise the fresh-install seed with the same migration chain in another DB.
"$task_bin/createdb" -h "$task_dir" -p 55439 fresh
# Roles already exist in this disposable cluster; only recreate the Auth schema.
"$task_bin/psql" -h "$task_dir" -p 55439 -d fresh -v ON_ERROR_STOP=1 -f "$task_root/supabase/tests/bootstrap-schema.sql"
"$task_bin/psql" -h "$task_dir" -p 55439 -d fresh -v ON_ERROR_STOP=1 \
  -f "$task_root/supabase/migrations/001_initial_schema.sql" \
  -f "$task_root/supabase/seed.sql" \
  -f "$task_root/supabase/migrations/002_hardening.sql" \
  -f "$task_root/supabase/migrations/003_update_rahul_email.sql" \
  -f "$task_root/supabase/migrations/004_online_registration.sql" \
  -f "$task_root/supabase/migrations/005_test_bank.sql"
echo "Database integration checks passed. Temporary files: $task_dir"
