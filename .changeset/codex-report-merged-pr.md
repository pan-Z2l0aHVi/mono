---
---

Allow `codex-review.mjs report` to post/update the final conclusion comment on merged PRs when the conclusion `head_sha` matches the merged PR head, fixing stale comments caused by auto-merge racing `codex-review-report.yml`.
