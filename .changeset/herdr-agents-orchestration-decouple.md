---
---

Internal change: decouples the herdr-agents skill's orchestration layer from the task system — coordination ids stop deriving from task ids, coordination metadata lands in `$TMPDIR/herdr-agents/reports/`, and the patrol script enumerates orchestration units instead of task state; adds three context-discipline rules to the Manager role contract. No published package is affected.
