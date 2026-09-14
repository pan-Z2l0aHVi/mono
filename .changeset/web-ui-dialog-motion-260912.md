---
'@greypan/web-ui': patch
---

Split dialog-level motion into dedicated tokens: `--wui-duration-dialog-enter: 320ms`, `--wui-duration-dialog-exit: 260ms`, and `--wui-ease-dialog: cubic-bezier(0.2, 0, 0, 1)`. Dialog and image-preview enter/exit motion now use these tokens so the entrance no longer collapses into the first ~100ms; reduced-motion stays at 0ms.
