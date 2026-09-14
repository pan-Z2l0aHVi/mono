---
'@greypan/web-ui': minor
---

Retire `--wui-duration-menu-enter/exit` and `--wui-duration-overlay-enter/exit` in favor of dedicated motion tokens. Floating panels (popover, tooltip, select, autocomplete, menu portal) now use `--wui-duration-float-enter: 160ms` and `--wui-duration-float-exit: 120ms`; toast uses `--wui-duration-toast-enter: 280ms` and `--wui-duration-toast-exit: 200ms`. Floating-panel enter/exit motion becomes faster, so this is a minor behavior change.
