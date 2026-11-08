---
'@greypan/web-ui': minor
---

Make the layout mobile mode a controlled boolean property. Applications provide the viewport state and no longer receive `mobile-change`.

Removing `mobile-change` and turning `mobile` into a caller-provided input is breaking; no known external consumers are affected, so it ships as a minor.
