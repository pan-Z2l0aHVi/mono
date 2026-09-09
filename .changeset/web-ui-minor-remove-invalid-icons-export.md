---
'@greypan/web-ui': minor
---

Remove the invalid `./icons/*` subpath export.

The `./icons/*` targets never existed in `dist/`, so there was no resolvable import path and no working consumer could depend on it. It still ships as minor because contract-diff classifies any export removal as a breaking candidate, and the semver decision for a removal must be carried by this file rather than by the internal-consolidation patch changeset.
