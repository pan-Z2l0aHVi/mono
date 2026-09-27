---
---

Split the herdr-agents skill so `SKILL.md` stays a thin entry. The Supervisor scoring
table and protocol move to `supervision.md`, read at scoring time and, when enabled,
throughout implementation; the entry keeps the binding table, handoff contract,
orchestration flow and definition of done. Pointers that used to name Supervisor content
now target that file, and the Supervisor role contract links to it directly for the
report template.
