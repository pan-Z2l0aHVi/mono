---
'@greypan/web-ui': patch
---

Stop `<web-ui-dialog>` and `<web-ui-drawer>` from painting a stray focus ring around the panel.

Chromium treats a scrollable container as keyboard-focusable, so a dialog / drawer whose content area overflows and holds nothing focusable makes the browser's dialog-focusing steps land on that scroll container. The UA then paints its default blue ring (`outline: auto`, `-webkit-focus-ring-color`) on it, which does not match the library's `--wui-focus-ring-*` ring. The modal-surface focus policy now lives in one shared stylesheet (`assets/modal-surface.css`) that suppresses the ring on the `<dialog>` shell and on the panel scroll containers (`.desc`, `.wui-dialog-content`, `.wui-drawer-content`); the context-menu scrim applies the same policy in its own injected stylesheet.
