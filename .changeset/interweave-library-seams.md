---
'@greypan/interweave': patch
---

Consolidate `backend/library` shutdown in `Runtime.Close()`, move pending file preview authorization behind a narrow `core.PendingPreviewStore` seam, and unify core mutation methods to return assembled `*ResourceView` / `URLProbeResult` without redundant service-layer read-after-write queries.
