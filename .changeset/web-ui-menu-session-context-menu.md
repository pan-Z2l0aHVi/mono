---
'@greypan/web-ui': patch
---

Extract shared `MenuSession` deep module under `shared/menu-session/` and migrate `WebUiContextMenu` onto it, unifying multi-level submenu lifecycle, portal reconciliation, scroll lock, overlay arbitration, and keyboard/hover interactions.
