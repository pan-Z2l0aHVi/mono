---
'@greypan/interweave': patch
---

Dedupe concurrent thumbnail builds per source version with refcounted singleflight, bound in-flight builds by CPU count, and drain builds and pruning on shutdown before the database closes. Thumbnail requests now return 500 when a build fails with a live client and stay silent after the client disconnects, and the sources table gains a `(type, location)` index for location lookups.
