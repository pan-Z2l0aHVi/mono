---
'@greypan/interweave': patch
---

Adding a resource that is already in the library now shows a light notice first: it lists the titles and locations of the matching entries already in the library, so you can decide whether to continue.

Choosing Cancel skips that queue entry; choosing Add Anyway proceeds as usual. When several files are dropped at once the notice appears once per item, checked in queue order rather than stacked, and entries whose location is not yet in the library are queued without a prompt.

This is a notice only; it does not block duplicates. The existing silent dedupe of a single batch inside the dialog is unchanged.
