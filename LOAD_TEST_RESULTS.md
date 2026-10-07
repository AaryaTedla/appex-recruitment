# Hosted load test — 2026-10-06

Deployment: https://appex-recruitment.vercel.app/

User authorized the test and confirmed no real applicants were testing. Three sequential batches ran at 10, 50, and 100 simultaneous synthetic applicants. Each batch registered, started, loaded 22 questions, saved answers in synchronized rounds with a 400ms pause, and submitted together. Browser rendering was not exercised in this HTTP load test.

## Results

| Applicants | Successful submissions | Save transport failures | Save median / p95 | Submit median / p95 | Registration p95 |
|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 0 | 1.58s / 2.65s | 1.22s / 1.75s | 3.52s |
| 50 | 50 | 0 | 1.22s / 1.85s | 1.57s / 1.90s | 1.97s |
| 100 | 100 | 2 | 1.28s / 1.77s | 1.51s / 1.69s | 13.07s |

Total: 4118 application API requests, 160 simulated candidate records, all 160 submitted. Every bootstrap reported a 30-minute timer. No recorded HTTP 4xx/5xx responses. Two fetch transport failures occurred after about 10 seconds in the 100-applicant stage; this does not establish whether the cause was the test runner, network, or deployment. Two affected applicants stopped further autosave rounds but submitted the answer state already accumulated; therefore the run does not prove all 100 saved every question. No automatic request retry was performed.

The 100-applicant stage had registration p95 13.07s (maximum 13.78s), bootstrap maximum 10.29s, and save maximum 11.77s. Typical saves and submissions remained around 1–2 seconds. These measurements include test-runner-to-Vercel network time, not isolated database execution time.

## Interpretation

50 simultaneous applicants completed this bounded run without failures. 100 completed submission, but connection errors and registration spikes warrant checking Vercel/Supabase logs and a repeat after investigation. This was a short burst test, not a 30-minute soak, a guarantee, or a measurement of remaining billing quotas. It excludes real browser rendering, shared venue Wi-Fi, repeated descriptive typing pauses, admin traffic, and persistence verification directly against the database.

## Test records

Synthetic records have SRNs starting `LTUWWZ5H6` and full names starting `LOADTEST UWWZ5H6`. They remain in the database, are submitted, and will affect admin statistics until removed. No production records were deleted. Use both labels to identify them; do not clear the entire database just to remove this batch.
