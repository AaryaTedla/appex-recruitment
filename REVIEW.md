# Full repository review

Reviewed on 6 October 2026. Scope: all application pages, API routes, components, auth/session helpers, scoring, Supabase schema and seed, environment setup, package/lockfile, middleware, CSS and Tailwind configuration. The workspace has no usable Git history, so this is a review of the current source and the fixes made during this session, not a commit comparison.

## Required deployment step

Run **only `supabase/migrations/002_hardening.sql`** in the configured Supabase project's SQL Editor before running the updated application. The new routes depend on its functions and review view. It preserves candidates, submitted answers, evaluations and Auth users. No live database schema changes were applied during this review: a database connection or connected SQL Editor was not available.

Do not rerun `001_initial_schema.sql` or `seed.sql` on the existing project. For a fresh project, use `001_initial_schema.sql`, then `seed.sql`, then `002_hardening.sql`.

Existing attempts inherit the original default of a 15-minute enabled timer when these columns are added. If an existing project used a different duration or disabled the timer, adjust those legacy attempt settings before candidates resume. Newly started attempts save the configured settings at start and are unaffected by later environment changes.

## Issues fixed

| Priority | Defect | Fix |
| --- | --- | --- |
| P1 | The five-email restriction existed only in Next.js; Supabase RLS still accepted other role-bearing accounts. | Database role helpers now verify the actual Auth user's email. Read access is restricted to approved accounts. |
| P1 | Authenticated direct database writes bypassed question history protection and evaluator ownership rules. | Removed direct write policies. Authorized server routes use restricted transactional functions. |
| P1 | Typing recreated the timer callback and recalculated its server offset, extending the displayed countdown. | Clock offset is captured once, and submission reads the latest answers through a ref without restarting the timer. |
| P1 | Final answer writes and submission occurred in separate transactions; late autosaves could race scoring. | Finalization locks the attempt, checks the real deadline, saves the latest text and scores in one transaction. Late saves are refused. |
| P1 | Evaluation scoring, rubric rows, the final review and mirrored score could be partially saved. | A single transaction validates and saves the review. Any failure rolls back all changes; the attempt lock serializes competing reviews. |
| P2 | Registration could create a candidate without an attempt; repeated session creation could leave multiple sessions. | Registration and session replacement are transactional and serialize on the candidate. |
| P2 | Empty question banks could start a timer and crash the challenge UI. | Start checks the bank before changing timestamps. Instructions show an unavailable state; bootstrap and client also reject empty banks. |
| P2 | Only answered questions were linked to attempts, allowing unanswered historical questions to change or disappear. | Starting an attempt records a blank answer for every assigned question. Historical question protection is enforced in the database. |
| P2 | Expired abandoned attempts locked question management indefinitely. Question updates also raced challenge starts. | The question trigger finalizes overdue timed attempts and uses the same advisory lock as challenge start. Untimed active attempts still intentionally lock the bank. |
| P2 | Timer settings were read from the current environment for every request; invalid durations became NaN. | Durations are validated, stored on each attempt and reused by the server and browser. |
| P2 | Submission and saves could be attempted before the challenge started; client-supplied timeout reasons were trusted. | Database functions require a started attempt and calculate the submission status themselves. |
| P2 | Objective scoring ignored case, so distinct code-output choices such as `True` and `true` could both receive full marks. | Objective answers are compared with the exact correct option. |
| P2 | Candidate/evaluation filters and pending counts only examined Supabase's first result batch. | A security-invoker review view supports database-side filtering, exact counts and 50-row pagination. |
| P2 | Failed submissions replaced the challenge with a reload-only screen, risking unsaved answer loss. | Submission errors keep the current form and answers, with a retry action. |
| P2 | Concurrent autosaves could finish out of order or show "saved" while newer text was dirty. | Saves are serialized, queued requests read the latest text, pending timers are cleared on submission/unmount, and dirty questions drive save feedback. |
| P2 | Manual marks did not update the proposed final score; edited reviews could still show "saved". | The suggested score follows marks until explicitly overridden. Edits clear saved feedback; "Use answer total" restores the calculated score. |
| P2 | Network failures could leave login and management forms stuck; database load errors masqueraded as empty tables or missing candidates. | Forms catch failures and restore controls. Server pages distinguish database errors from genuinely missing records. |
| P2 | Integrity events could be spammed indefinitely and added before start/after deadline. | Database logging checks the active attempt, deduplicates events within 1.2 seconds and caps stored events at 100 per attempt. |
| P2 | Next bundled a vulnerable PostCSS 8.4.31 despite the root project using a patched release. | Same-major override and lockfile resolution use PostCSS 8.5.29. Production dependency audit now reports zero advisories. |
| P3 | Admin navigation lacked an active state; controls were small, supporting text was hard to read, and the warning overlay lacked native keyboard behavior. | Responsive active navigation, clearer dark theme, 44px controls, labeled fields, skip link, native warning dialog, reduced-motion support and large-text wrapping. |
| P3 | Evaluator answer text collapsed line breaks, and question-management errors hid useful details. | Responses preserve whitespace; question errors explain duplicate ordering, invalid options, historical locks and live-attempt locks. |

## UI changes

- Reworked the landing page with a clear primary action, readable type hierarchy and a three-step challenge overview.
- Kept the existing dark/violet identity; improved secondary-text and primary-button contrast.
- Added active admin navigation that wraps on phones, clear pagination and a candidate-detail back link.
- Increased question/rubric targets, exposed selected state to assistive technology and provided field labels.
- Instructions show the actual question count and configured time limit; active attempts cannot be evaluated prematurely.
- Improved sign-out, loading, error and save feedback. Long names, answers and option text wrap instead of overflowing.

## Verification

- TypeScript check and ESLint: passed.
- Production build: passed with the updated PostCSS resolution. Lockfile consistency also passed an offline `npm ci --dry-run` check.
- Database tests: `bash scripts/check-db.sh` creates a disposable local PostgreSQL database, applies the initial schema/seed and hardening migration twice, then tests RLS allowlist, REST write denial, registration/session uniqueness, unanswered-question preservation, question locks, integrity deduplication/cap, atomic submission, duplicate submission, late-save refusal, objective scoring, evaluation rollback, mirrored final score, deadline enforcement and empty-bank protection. Fixtures roll back and the temporary server stops automatically.
- Headless Chromium checks: real landing/registration pages at 1280px and 375px; component fixtures with mocked APIs test typing during the countdown, autosave, warning-dialog Escape behavior, submission failure/retry, answer preservation, empty-bank recovery and score calculation/override. Also checked reduced motion and enlarged text. No uncaught browser errors were observed.
- Screenshots inspected for desktop/mobile landing and mobile evaluation. Candidate/evaluation interaction checks used isolated fixtures and did not create candidates or change evaluations in live Supabase.
- `npm audit --omit=dev`: zero reported vulnerabilities after the PostCSS override. The full audit still reports **9 build/development dependency findings: 7 high, 2 moderate**.

## Remaining limitations and follow-up work

1. Apply the hardening migration to live Supabase before smoke-testing the updated app. Local PostgreSQL verifies its SQL/behavior, but the live project's PostgreSQL version, grants, schema cache and any additional custom policies have not been verified. The review view requires PostgreSQL 15+ for `security_invoker`.
2. Build/development advisories remain in the Tailwind/ESLint glob and selector-parser dependency chains. The audit suggests breaking framework/tooling changes for several of them. No forced major upgrades were made. Relevant advisories: [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [selector parser CPU exhaustion](https://github.com/advisories/GHSA-rj75-hqrm-r3gf). Keep build inputs trusted while planning the tooling migration.
3. SRN plus name is intentionally weak identification: anyone who knows both can resume an unfinished attempt. Verified institutional identity requires an OTP/SSO flow. This review did not change the agreed candidate registration model.
4. Public registration has no distributed rate limit/CAPTCHA. Integrity writes are now bounded, but recruitment at larger scale should include provider-backed request throttling. An in-memory limiter would not reliably protect a multi-instance Vercel deployment.
5. The existing shared temporary admin password remains as requested. The app has no self-service password recovery/change screen; individual passwords can be managed in Supabase.
6. Submitted legacy attempts contain only the question records created by the old implementation. Their original unanswered question set cannot be reconstructed reliably if the bank has since changed. New attempts preserve the full assigned set.
7. This is not a load test or an accessibility certification. Live candidate registration, a complete timed submission and a live admin evaluation should be smoke-tested after migration. No production data was altered for these tests.
