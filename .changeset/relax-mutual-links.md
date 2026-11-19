---
'@greypan/monorepo-kit': patch
---

Remove the blanket mutual-link prohibition from `defineNoMutualLinks`. Reciprocal links are now allowed; the check reports only links that cross a configured forbidden direction.
