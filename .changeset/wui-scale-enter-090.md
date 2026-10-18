---
'@greypan/web-ui': minor
---

Lower the enter scale of anchored floating panels (popover, menu, dropdown, select, tooltip, autocomplete), toast, and the image-preview stage from `0.95` to `0.9`.

`--wui-scale-enter` now defaults to `0.9`, and every component fallback that references it follows. Reduced motion is unaffected: the token still resolves to `1` there. Dialog enter scale is untouched; it keeps its own `--wui-dialog-scale-enter: 1.1`.
