# APPEX Recruitment Challenge

A minimal, dark, mobile-friendly recruitment challenge for APPEX. It uses **Next.js App Router + TypeScript + Tailwind CSS + Supabase (Auth + PostgreSQL)** and is designed to deploy directly to Vercel.

The product has two intentionally separate experiences:

- **Candidates:** SRN + full name → instructions → 22-question challenge → review → submit → completion.
- **APPEX team:** Supabase Auth login → dashboard → candidate review → manual evaluation → shortlist, plus question and evaluator management for admins.

## 1. What is implemented

### Candidate experience

- Minimal APPEX landing page and recruitment intro.
- Candidate registration with **SRN**, **Full Name**, and self-reported online registration status.
- SRN normalization to uppercase and database-level uniqueness. Full names are stored exactly as submitted (validation uses a trimmed copy without rewriting the stored value).
- One attempt per SRN. Incomplete attempts resume; completed attempts cannot restart.
- Opaque HTTP-only candidate session cookie. Candidates never receive a database service key.
- Candidate instructions before the challenge timer starts.
- 22 seeded questions (20 MCQs and 2 descriptive tasks) across all requested categories.
- One-question-at-a-time challenge UI with type-specific rendering.
- Previous/next controls, compact wrapping question navigator, progress bar, and character counts.
- Autosave to the server and answer restoration after refresh.
- Latest browser answer state is persisted again during final submission, preventing the last typed characters from being lost to a pending autosave.
- Review screen with answered/unanswered counts before final submission.
- Atomic, duplicate-safe submission.
- Optional 30-minute server-backed timer. The server re-checks elapsed time; the client timer is only the display.
- Automatic submission on timeout.
- Basic integrity logging for tab switches/window blur. One physical tab switch is de-duplicated so blur + visibility events do not normally count twice.
- Warnings do not erase answers or automatically disqualify candidates. 3+ events are simply visible to evaluators.
- Completion page never exposes score, correct answers, ranking, comments, or recommendation.

### Evaluator/admin experience

- Separate `/admin/login` using Supabase Auth email/password.
- Server-side evaluator/admin role verification.
- Protected admin route group; candidate access is not protected merely by hiding URLs.
- Dashboard metrics: total, completed, in progress, pending evaluation, shortlisted.
- Candidate table with search and filters for status, evaluation state, shortlist state, and minimum score.
- Candidate detail page with objective score, category scores, integrity events, and every submitted answer.
- Manual scoring for descriptive/creative answers up to each question's point value.
- Selectable 1–10 descriptive ratings and No credit (0); historical question ratings scale to their maximum marks. Existing rubric data is preserved.
- Overall evaluator comments, final recommendation, and final score.
- Saved-state feedback.
- An evaluator cannot silently overwrite another evaluator's completed review; an admin can override when necessary.
- Admin question management: add, edit, activate/deactivate, and delete when safe.
- Objective questions require a valid correct answer.
- Active question edits are temporarily locked while a started challenge is in progress, preventing the live test from changing underneath candidates.
- Once a question has candidate answers, its content/options/correct answer/points/order are treated as historical data: admins may deactivate it, but meaningful edits require adding a replacement question.
- Admin user management: create evaluator/admin Auth users, grant roles, and change roles. Self-demotion is blocked in the UI/API to reduce accidental lockout.

### Security

- Supabase RLS enabled on every application table.
- No anonymous database policies are created.
- Correct answers are never sent by the candidate bootstrap API.
- Evaluation data is never sent to candidate routes.
- Candidate browser access is mediated by server routes that validate an opaque session and candidate ownership.
- Evaluator/admin pages perform server-side role checks.
- The Supabase service-role key is only referenced in server modules and must never be exposed to the browser.
- Submitted answer text is immutable at the database level.
- The database submission function locks the attempt and prevents double submission.

## 2. Folder structure

```text
appex-recruitment/
├── app/
│   ├── page.tsx
│   ├── join/page.tsx
│   ├── register/page.tsx
│   ├── challenge/
│   │   ├── page.tsx
│   │   ├── instructions/page.tsx
│   │   └── complete/page.tsx
│   ├── admin/
│   │   ├── login/page.tsx
│   │   └── (protected)/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── candidates/
│   │       ├── evaluations/
│   │       ├── questions/
│   │       └── users/
│   └── api/
│       ├── register/
│       ├── candidate-status/
│       ├── challenge/
│       └── admin/
├── components/
│   ├── ui/
│   ├── candidate/
│   ├── challenge/
│   └── admin/
├── lib/
│   ├── auth/
│   ├── scoring/
│   └── supabase/
├── types/
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── seed.sql
├── middleware.ts
├── .env.local.example
└── README.md
```

The `(protected)` directory is a Next.js route group, so URLs remain `/admin`, `/admin/candidates`, etc. It exists so `/admin/login` does **not** inherit the protected evaluator layout.

## 3. Supabase database schema

Main tables:

- `profiles` — Supabase Auth user → `evaluator` / `admin` role.
- `candidates` — SRN, full name, candidate state.
- `questions` — category, type, text, options, correct answer, points, difficulty, active flag, order.
- `attempts` — one row per candidate, server start/submission timestamps, objective/final scores.
- `answers` — one answer per `(attempt, question)`, auto and manual score fields.
- `answer_evaluations` — per-answer rubric JSON and comments.
- `evaluations` — final evaluator score/comments/recommendation.
- `integrity_events` — tab/window/fullscreen-style event log.
- `candidate_sessions` — hashes of opaque candidate session tokens. Raw session tokens are only stored in HTTP-only cookies.

`supabase/migrations/001_initial_schema.sql` also creates:

- foreign keys and uniqueness constraints,
- RLS policies,
- role helper functions,
- submitted-answer immutability trigger,
- atomic `submit_appex_attempt(...)` database function.

## 4. Required environment variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_CHALLENGE_MINUTES=30
NEXT_PUBLIC_CHALLENGE_TIMER_ENABLED=true
```

Important: `SUPABASE_SERVICE_ROLE_KEY` is a server secret. Never prefix it with `NEXT_PUBLIC_` and never commit `.env.local`.

## 5. Supabase setup

**Existing project:** apply any missing migrations in order: `002_hardening.sql`, `003_update_rahul_email.sql`, `004_online_registration.sql`, `005_test_bank.sql`, then `006_easier_test_bank.sql` in Supabase's SQL Editor before using this version. Do not rerun the original schema or seed. The migration preserves candidate records and answers, installs the five-email database allowlist, and adds the transactional functions and review view required by the app.

1. Create a new Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/migrations/001_initial_schema.sql`.
4. Run `supabase/seed.sql`.
   Then run migrations `002_hardening.sql`, `003_update_rahul_email.sql`, `004_online_registration.sql`, `005_test_bank.sql`, and `006_easier_test_bank.sql` in order.
5. In **Project Settings → API**, copy the project URL, anon/public key, and service-role key into `.env.local`.
6. In **Authentication**, keep email/password auth enabled for evaluator accounts.
7. Do not enable public candidate sign-up through the evaluator login. Candidate registration is handled separately by the app.

The seed creates exactly **22 active questions totaling 100 points**:

| Category | Points |
| --- | ---: |
| Python & Programming Fundamentals | 16 |
| Computer & Technology Fundamentals | 16 |
| Aptitude & Pattern Recognition | 16 |
| Situational & Decision Making | 26 |
| Improvisation & Problem Solving | 10 |
| Commitment & Reliability | 8 |
| Wildcard | 8 |
| **Total** | **100** |

The current seed has 80 automatically scored points (20 × 4) and 20 evaluator-scored descriptive points (2 × 10).

## 6. Create the first admin/evaluator

The first admin must be bootstrapped once because there is no public admin sign-up.

### Step A — create the Auth user

In Supabase Dashboard:

**Authentication → Users → Add user**

Create an email/password account for the APPEX admin.

Only these email addresses can access the dashboard and protected database data:

- `meg.sanjeev@gmail.com`
- `aaryatedla@gmail.com`
- `bhaveshvelluru@gmail.com`
- `rahul.dutta.bwn@gmail.com`
- `tadipatrirohansai@gmail.com`

Use an address from this list in the SQL below. The allowlist is enforced both by the app and database role helpers. Ordinary authenticated users cannot write directly to application tables; authorized server routes perform those writes.

### Step B — give that user the APPEX admin role

Run this in SQL Editor, replacing the email:

```sql
insert into public.profiles (id, role)
select id, 'admin'
from auth.users
where email = 'aaryatedla@gmail.com'
on conflict (id) do update set role = excluded.role;
```

Then sign in at:

```text
/admin/login
```

After the first admin exists, use **Admin → Users** to create additional evaluator/admin accounts and manage roles.

To bootstrap an evaluator manually instead, use `'evaluator'` instead of `'admin'` in the SQL above.

## 7. Add/edit questions

Sign in as an admin and open:

```text
/admin/questions
```

You can:

- add questions,
- edit text/code/options,
- select category/type/difficulty,
- set points and ordering,
- set the correct answer for objective questions,
- activate/deactivate questions,
- delete questions that have no dependent candidate answers.

If a question already has answers, deletion is refused. Its historical content/points are also locked; deactivate it and add a replacement question instead.

For reliability, active question changes are blocked while a candidate has a started, in-progress attempt. Prepare the next question set before the recruitment window or add new questions as inactive first.

Keep the active set at 22 questions and preserve the intended 100-point weighting.

## 8. How candidate registration works

Candidate registration is intentionally lightweight identification, not strong institutional authentication:

1. Candidate enters SRN + full name.
2. SRN is trimmed and normalized to uppercase.
3. `candidates.srn` is unique in PostgreSQL.
4. A new candidate receives exactly one attempt.
5. The server generates a random candidate session token.
6. Only its SHA-256 hash is stored in `candidate_sessions`; the raw token is held in an HTTP-only, SameSite cookie.
7. Returning candidates with the same SRN/name resume an unfinished attempt.
8. Submitted/time-expired candidates are sent directly to the completion state and cannot get another attempt.
9. Creating a new candidate session invalidates older sessions for that candidate, reducing two-device autosave races.

The candidate identity logic is isolated in `lib/auth/candidate.ts`, so PES email OTP, magic link, or official SSO can replace it later without redesigning the challenge UI.

## 9. How evaluation works

1. Objective answers are scored atomically at submission by `submit_appex_attempt`.
2. Evaluators open `/admin/candidates/[id]`.
3. They inspect category performance, integrity events, and every candidate answer.
4. Select 1–10 or No credit (0) for each descriptive answer. Older questions scale the rating to their original maximum; saved scores and rubric data remain intact. Totals update automatically.
5. The evaluator writes overall comments, chooses:
   - Strongly Shortlist
   - Shortlist
   - Maybe
   - Do Not Shortlist
6. A final score from 0–100 is stored in `evaluations` and mirrored to `attempts.final_score` for dashboard filtering.
7. None of this evaluation data is exposed to the candidate experience.

## 10. Run locally

Requirements: Node.js 20+ (Node 22 works well).

```bash
npm install
cp .env.local.example .env.local
# fill in real Supabase values
npm run dev
```

Open:

```text
http://localhost:3000
```

Before deployment, run:

```bash
npm run typecheck
npm run lint
npm run build
```

## 11. Deploy to Vercel

1. Push this folder to GitHub/GitLab/Bitbucket.
2. Import the repository in Vercel.
3. Framework preset should detect **Next.js** automatically.
4. Add all five environment variables from `.env.local.example` in **Vercel → Project → Settings → Environment Variables**.
5. Use your production Supabase project URL/keys.
6. Deploy.
7. Verify candidate registration, resume, submission, and admin login on the deployed URL.
8. Add the deployed site URL to any relevant Supabase Auth URL configuration if you later add password reset/magic-link flows.

No Express server, Docker, Redis, microservices, or additional backend is required.

## Operational checklist before a live recruitment round

- Confirm the active question bank has the intended 22 questions and 100 points.
- Test one fresh candidate all the way through submission.
- Test refresh/resume on an in-progress attempt.
- Test a time-expired attempt if the timer is enabled.
- Confirm a submitted SRN cannot start a second attempt.
- Test `/admin`, `/admin/candidates`, `/admin/questions`, and `/admin/users` while signed out.
- Test an evaluator account cannot access admin-only Questions/Users pages.
- Test an admin can save a full candidate evaluation.
- Check candidate UI on a phone-sized viewport.
- Confirm the service-role key exists only in server environment variables.

## Verification note for this generated copy

The full source review and known limitations are recorded in `REVIEW.md`. Typecheck, lint, and a production build are part of the verification workflow. Database integration checks run on a disposable local PostgreSQL database:

```bash
bash scripts/check-db.sh
```

This requires PostgreSQL locally (including `pg_config` and `initdb`). It does not connect to Supabase or read `.env.local`. The checks cover database permissions, atomic registration and session replacement, question history, duplicate submission, scoring, deadlines, and rollback after an invalid evaluation. Never run the test fixture SQL against your live Supabase project.


## Registration status and navigation

Applicants must choose whether they have already filled the online form. A No answer shows [the registration link](https://rahulfye.github.io/appex-recruitment/) but still allows taking the test. This is self-reported, not verified against Google. Existing candidates show Unknown; returning candidates can update their answer without creating another attempt.

**Before starting this version:** run `supabase/migrations/004_online_registration.sql` after migration 003. It preserves existing records, replaces the registration RPC with a service-only three-argument version, adds the review-view status, and supplies global question totals. Do not rerun the initial schema or seed on an existing database. Deploy the app after the migration; pause registration during this short coordinated update because the old RPC signature is removed.

Candidates, evaluations, and questions show 25 items per page. Filters remain in the URL; pages beyond the last page redirect to the last valid page. The question bank totals always cover the entire bank.

For performance diagnosis, start the server with `APPEX_PERF_TRACE=1`. Logs separate middleware authentication, page authentication, and database requests. Logs contain labels and timings only. Leave this option off for normal use. Production running: `npm run build`, then `npm start`.

See `IMPLEMENTATION.md` for verification results and measured timings.


## 15. Thirty-minute bank rollout

For an existing database, run **`supabase/migrations/005_test_bank.sql` after 004** in Supabase SQL Editor before deploying this version. Do not rerun the seed or initial schema. The migration preserves old questions, answers, evaluations, and stored attempt durations. It deactivates the previous bank and activates 20 MCQs plus two descriptive tasks. It refuses replacement while an unexpired or untimed started test is running; let applicants finish and retry. Reapplication is safe when the bank content is unchanged.

Set `NEXT_PUBLIC_CHALLENGE_MINUTES=30` in local and hosting environments, then restart/redeploy. New starts receive 30 minutes; already started attempts keep their stored duration. Descriptive answers accept up to 1,500 characters through the UI, autosave, final submission, and database functions.

Evaluators can open **`/admin/answer-key`** for correct answers, explanations, and short task scoring guidance. Candidate bootstrap responses exclude both correct answers and evaluator notes. Save & next candidate, recommendations, and optional comments remain available.

The current bank is `supabase/question_bank_006.json`. After editing it, regenerate the fresh-install seed and migration bank section:

```bash
python3 scripts/generate-question-bank.py
python3 scripts/generate-question-bank.py --check
python3 scripts/verify-question-bank.py
bash scripts/check-db.sh
npm run typecheck
npm run lint
npm run build
```

The database checks use a temporary local PostgreSQL instance, not your configured Supabase project. They cover bank composition, reapplication, active-test rejection, historical preservation, 30-minute new starts, long-answer persistence, scoring, and permissions.


## Easier bank update (006)

Apply `supabase/migrations/006_easier_test_bank.sql` after 005 for the easier version: 14 easy and 6 medium MCQs, with simpler wording, arithmetic, probability and planning prompts. The two descriptive tasks use clearer numbered instructions. The bank remains 22 questions and 100 points. The migration preserves earlier bank records and refuses changes during running tests.

New starts now use a fixed 30-minute application configuration, so a stale environment value of 15 cannot shorten new tests. Restart the development server or redeploy to load this change. Previously started attempts still retain their stored duration; clearing test candidates as described resets those attempts. The 15-minute deadline inside descriptive task 2 is a scenario constraint, not the test duration.

For a fresh installation, run the current seed and all migrations through 006. Existing installations should apply 006, not rerun the seed. `generate-question-bank.py` and `verify-question-bank.py` default to version 006; use `--version 005` to check the preserved earlier version.


## Test sections and question 4 update (007)

Apply `supabase/migrations/007_simple_question.sql` after 006, then restart/redeploy. It replaces question 4 with basic Python addition using a new ID, preserving the previous question and all answers. Reapplication is safe; running tests block bank changes. Do not rerun earlier bank migrations after 007, because they would reactivate earlier versions.

Candidates see labeled MCQ/descriptive sections, separate navigator groups and review groups, answered counts, and suggested 12/18-minute pacing. A single 30-minute timer continues across section switching. After 12 minutes, a dismissible reminder appears if either descriptive answer is blank. Dismissal is saved per attempt in this browser; if browser storage is unavailable, dismissal lasts until reload. Both sections stay accessible until submission.

The current source is `supabase/question_bank_007.json`. Generator and independent answer checks default to 007; older source versions remain available with `--version 005` or `--version 006`. Fresh installs use the current seed and migrations through 007; existing installations use migration 007.
