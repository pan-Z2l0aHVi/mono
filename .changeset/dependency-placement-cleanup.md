---
'@greypan/web-ui': patch
'@greypan/browser-kit': patch
---

Move `@iconify/types` to `dependencies` in `@greypan/web-ui`: `WebUiIcon` exposes `IconifyIcon` in the published type declarations, so consumers must be able to resolve the type package. Remove the unused `remeda` dependency from `@greypan/browser-kit`.
