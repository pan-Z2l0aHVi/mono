---
'@greypan/interweave': patch
---

Replaced `@tanstack/vue-virtual` with `virtua` for the resource list. Renaming a resource no longer leaves stale row heights that make adjacent rows overlap. When Safari or iOS recycles an editing row, its rename draft is now committed instead of lost.
