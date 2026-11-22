---
'@greypan/interweave': patch
---

The startup thumbnail prune now checks for cancellation before each source is stat-ed, so closing the media handler no longer waits for one stat per source on slow or archived drives; it stops after the current source.
