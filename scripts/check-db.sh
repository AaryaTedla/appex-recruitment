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
  -f "$task_root/supabase/seed.sql" \
  -f "$task_root/supabase/migrations/002_hardening.sql" \
  -f "$task_root/supabase/migrations/002_hardening.sql" \
  -f "$task_root/supabase/migrations/003_update_rahul_email.sql" \
  -f "$task_root/supabase/migrations/004_online_registration.sql" \
  -f "$task_root/supabase/migrations/004_online_registration.sql" \
  -f "$task_root/supabase/tests/hardening.sql" \
  -f "$task_root/supabase/tests/online_registration.sql"
echo "Database integration checks passed. Temporary files: $task_dir"
