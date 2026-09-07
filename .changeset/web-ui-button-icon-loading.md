---
'@greypan/web-ui': patch
---

fix(web-ui): replace icon button content while loading

- Render only the loading spinner when `icon` and `loading` are set.
- Keep the default slot icon unprojected while loading and restore projection when `loading` returns to `false`.
