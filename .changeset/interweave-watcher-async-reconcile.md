---
'@greypan/interweave': patch
---

Source index reconciliation on entry add/edit/remove is now a non-blocking request handled by the file watcher's reconcile loop instead of a synchronous directory scan on the write path. Offline thumbnail serving builds a one-time in-memory index of the cache directory keyed by real modification times, serves lookups without rescanning, keeps the index in sync with fresh builds, frontend backfills and pruning, and self-heals when an indexed file disappears. The startup thumbnail prune runs on the store's shutdown context and is cancelled and drained together with in-flight builds when the media handler closes.
