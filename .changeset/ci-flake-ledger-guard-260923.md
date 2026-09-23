---
---

Internal change: no published package is affected, and `@greypan/interweave` is deliberately not bumped — a bump there would make the next merged version PR publish a desktop release out of a change that touches nothing the build reads.

The flake ledger writer never wrote. `aa8be940` replaced the recording steps' bare `failure()` guard with `steps.test.outcome == 'failure'`, which was the right half of the condition but not the whole one: GitHub applies a default status check of `success()` to any `if` that does not call a status function, so the two steps are skipped at exactly the moment their condition could hold. Both real `Test` failures since that change show the same signature — step 16 `Test` failed, steps 17/18 `Record test failures` and `Upload test output` skipped, no `ci-test-output-*` artifact — runs 35715564947 and 35800643887. The missing artifact was read at the time as evidence the guard worked; it was the symptom.

The guard is now `failure() && steps.test.outcome == 'failure'`, in `.github/workflows/ci.yml` and its single declaration in `.github/scripts/ci-topology.mjs`: the first conjunct is the entry ticket, the second keeps the judgement with `Test` alone, so a lint failure that skips `Test` still produces no ledger entry. Because a permanently-false guard cannot fail a job, `scripts/ci-topology.test.mjs` now rejects any step condition that reads `steps.<id>.outcome`/`.conclusion` without calling a status function.
