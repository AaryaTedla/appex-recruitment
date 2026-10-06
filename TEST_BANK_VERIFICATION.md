# Test bank 005 verification

Checked on 2026-10-06. No migration was applied to the configured Supabase project.

## Passed

- Generator consistency: exactly 20 objective questions × 4 points and 2 descriptive tasks × 10 points, 100 points, unique IDs/order, four distinct valid options, ten easy/ten medium MCQs, balanced correct-option positions.
- Independent checks: Python outputs, rate calculation, growing-gap pattern, logical premise, ordered probability, scheduling and workshop capacity. Reviewed technology/situational choices and explanations for a single defensible answer; refined distractors for realistic tradeoffs.
- Temporary PostgreSQL: legacy-to-current and fresh-install paths, migration reapplication, rejection while a timed test is still running, historical questions/answers/scores/rubrics retained, expired attempts finalized, new starts 30 minutes, historical duration 15 unchanged, 1,500-character persistence, scoring and RPC permissions. Authenticated non-allowlisted users cannot read evaluator notes.
- Actual evaluation/challenge components with mocked saves: desktop 1280px/mobile 375px, 1–10 and zero selection, keyboard interaction, automatic totals, Save & next, existing fractional scores and rubric preserved, rating scaling to old maximum, 1,400-character autosave and 1,500-character final submission; no browser errors.
- API/helper harness: real autosave/submit handlers preserve long answers through 1,500 characters and cap oversized input; timer fallback and rating arithmetic.
- Production browser: solid violet CTA with white text, desktop/mobile without horizontal overflow, anonymous answer-key access redirects to login.
- Production build, standalone TypeScript, and ESLint passed.

Browser save tests used isolated mock data. Production answer-key checks covered anonymous access; allowed-user data access was checked in temporary PostgreSQL and through the page's server authorization/query code, not a live Supabase browser session.

## Rollout

Run `supabase/migrations/005_test_bank.sql` after 004 in Supabase SQL Editor, then deploy/restart with `NEXT_PUBLIC_CHALLENGE_MINUTES=30`. Do not rerun the seed on an existing project. If `QUESTION_BANK_IN_USE` appears, wait for running tests to finish and retry. Existing started attempts keep their stored duration.
