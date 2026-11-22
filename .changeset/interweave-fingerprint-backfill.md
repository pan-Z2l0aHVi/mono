---
'@greypan/interweave': patch
---

Speed up Interweave's startup fingerprint backfill: unchanged files are skipped after a single read-only snapshot query, files that need hashing are hashed by a small bounded worker pool with a smaller 128 KB buffer, and results are written in batches inside one transaction using conditional updates so stale hashes never overwrite fingerprints recorded by concurrent refreshes or the watcher.
