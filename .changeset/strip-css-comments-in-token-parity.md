---
---

Internal change: makes the `theme-token-parity` test guard strip CSS comments before
scanning for `var(--wui-*, …)` fallback sites, so fallback-like text inside comments is no
longer counted as a real site; no published package is affected.
