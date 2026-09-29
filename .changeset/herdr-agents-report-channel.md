---
---

Internal change: adds an agent-to-Manager report channel to the herdr-agents skill — every execution role reports on turn completion via `agent prompt` to a pane bound as `manager`, with a fixed `[herdr-report]` prefix and a report path under `$TMPDIR/herdr-agents/reports/`; `patrol.mjs` gains a `REPORTS_CHANGED` first line driven by report-file fingerprints. No published package is affected.
