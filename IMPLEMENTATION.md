# Registration and navigation update

## Changes

- Applicants must answer Yes/No about the external online form. No shows the form link in a new tab and still permits taking the test. This is self-reported; no Google integration is claimed.
- Candidates have nullable `online_registration_confirmed`. Legacy rows stay Unknown; successful returning registration updates their answer atomically without creating another attempt. Admin lists show and filter status, and details explicitly label it self-reported.
- `POST /api/register` requires boolean `onlineRegistrationConfirmed`; strings and missing choices are rejected. The service-only registration RPC now has three arguments. SQL validation requires the same 13-character SRN as the API.
- Main admin tabs highlight the chosen destination immediately, retain existing content while waiting, mark it busy/inert, and show progress only after 200ms. The page error boundary keeps navigation available. Hover/focus prefetch is retained for main tabs; automatic row/pagination prefetch is disabled to avoid unnecessary authentication requests.
- Candidates, evaluations, and questions use 25-record pages, deterministic sorting, numbered links and result ranges. URL filters survive pagination; oversized page numbers redirect to the last valid page. Question totals and the suggested next order come from an aggregate across the entire bank, not the displayed page.
- Navigation-only redundant refreshes were removed from candidate registration and challenge completion. Refreshes after editing data in place or changing admin authentication remain to invalidate cached data.
- The landing page uses a flat dark canvas, oversized left-aligned type, a serif accent, an asymmetric desktop composition, a compact numbered strip, and the existing logo/Instagram link. Meteors remain subtle and respect reduced motion. Logo downloads now match their displayed size.

## Rollout

**Run `supabase/migrations/004_online_registration.sql` in Supabase SQL Editor after migration 003, then restart/deploy the app.** It has been checked locally but has not been applied to the live database. Do not rerun the initial schema or seed. Pause registration during the coordinated migration/app update: the old two-argument RPC is removed. Migration 004 can be reapplied and preserves candidates, answers, questions, and admin accounts.

For fresh databases use 001 → seed → 002 → 003 → 004. Do not reapply earlier migrations over the new view/function versions.

## Timing evidence

Measurements from this workspace, three samples per operation; these are small diagnostic samples, not load tests or production service guarantees.

| Operation | Observed time |
| --- | --- |
| Development home, first / repeat | 3,520ms / 57–59ms |
| Development registration, first / repeat | 1,683ms / 42ms |
| Development admin login, first / repeat | 1,431ms / 50–158ms |
| Development compile time: home / registration / login | 3.1s / 1.4s / 0.6s (plus middleware compilation) |
| Production home, first / repeat | 34ms / 4–5ms |
| Production registration, first / repeat | 9ms / 3–4ms |
| Production admin login, first / repeat | 63ms / 7–12ms |
| Live Supabase Auth user lookup | 187–204ms |
| Live Supabase profile read | 454–639ms |
| Live Supabase candidate/evaluation counts, parallel reads | 535–797ms |
| Selected-tab feedback in production fixture | 1.6ms |
| Production slow admin navigation fixture | 2,108ms |
| Development slow admin navigation fixture | about 2.7s |

Public-page timings include the full local HTTP response. The live Auth lookup used the read-only service API, not a signed-in browser navigation. Live database measurements returned no candidate data to the report. Protected navigation checks used a mock Supabase server with 900ms delays per database request: profile validation plus page data explain about 1.8s of the wait, independently of the immediate selected-tab feedback. Auth timings and database timings were logged separately. No authenticated live end-to-end latency or before/after speedup is claimed.

Cold development compilation is a substantial contributor. Live Supabase network latency remains even with better UI feedback, pagination, and fewer speculative requests. Use `npm run build` then `npm start` for normal running.

Set `APPEX_PERF_TRACE=1` on the server when diagnosing: logs show middleware authentication, page authentication, and each service database request. Only operation paths and durations are logged; no credentials, query strings, or payloads. Turn tracing off for normal use. `APPEX_BUILD_DIR` allows isolated verification build caches without overwriting the normal `.next` output.

## Verification

- Disposable PostgreSQL: migrations through 004, 004 reapplied, existing hardening checks, legacy Unknown, Yes/No and resume updates, mismatch rollback, SRN/choice validation, service-only permissions, one attempt per SRN, global question totals, and 61-record pagination/filter fixtures.
- Headless Chromium: actual Next.js pages at 1280px, 375px, and landscape; large text and reduced motion; registration selection required, No remains nonblocking, correct external-link destination and new-tab attributes, correct boolean API payloads, invalid API input rejected, no uncaught errors in public-page checks.
- Authenticated mock integration: actual Next.js routes and middleware, delayed navigation with retained old content, immediate selected-tab feedback, delayed progress, inactive stale content, 25-record pages and last-page sizes, out-of-range correction, Yes/No/Unknown filters, empty results, client-side filter submission without a document reload, global bank totals and next order, keyboard navigation, rapid tab changes, Ctrl-click opens a new tab while preserving the original page, and query-failure recovery with working admin navigation.
- Production build, TypeScript, and ESLint checks run after implementation. SQL checks are reproducible with `bash scripts/check-db.sh` (local PostgreSQL required; never connects to Supabase). Browser fixture runs use isolated local ports and mock writes; browser screenshots were visually reviewed.
