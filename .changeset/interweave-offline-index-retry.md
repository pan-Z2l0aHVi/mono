---
'@greypan/interweave': patch
---

The offline thumbnail index is no longer frozen as empty when the cache directory scan fails. A failed scan now leaves the index unbuilt, so the next offline lookup retries it and recovers once the directory is readable again; a successful scan still builds the index once, and lookups stay free of directory scans afterwards.
