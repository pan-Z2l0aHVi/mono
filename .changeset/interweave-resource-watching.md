---
'@greypan/interweave': minor
---

Resource availability now follows the filesystem on its own. A registered file source watches only the directory it lives in: delete or move a file and the row goes stale immediately, put it back and it recovers on its own, with no manual refresh. A media read that confirms the file cannot be fetched (404) writes the state back and pushes it right away. Debounced coalescing, a watch budget and a 60-second sweep keep large directories or frequent writes from exhausting file descriptors or from misreading an editor save as a deletion.

URL sources are not watched; availability is re-checked on demand when the user opens the detail view instead, and the outcome is one of three: available, definitely stale, or "cannot check right now" (offline, DNS failure, timeout). The third outcome is never persisted and never changes the badge; it only shows a short message, so a dropped connection cannot mark a batch of links as dead. Manual link refresh keeps its existing semantics.
