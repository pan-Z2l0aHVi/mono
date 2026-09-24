---
'@greypan/web-ui': patch
---

Keep theme view-transition direction based on the resolved appearance. `appearance="system"` now reveals with the dark direction when `prefers-color-scheme` resolves dark, while equal resolved appearances still skip the transition; explicit light/dark reveal directions are unchanged.
