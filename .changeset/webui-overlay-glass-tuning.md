---
'@greypan/web-ui': patch
---

Make the overlay surface more opaque and drop the glass ring base color on menu panels

`--wui-color-surface-overlay` (shared by dialog, drawer and toast) moves to
`rgb(248 248 248 / 0.92)` in light and `rgb(32 34 34 / 0.92)` in dark, so the
content behind an open overlay reads less through it.

`--wui-color-glass-ring` is now overridden to `transparent` locally on the menu
popover surfaces (popover, tooltip, select, autocomplete, dropdown and context
menu panels) and on the pressed/dragging state of the switch, slider and
segmented handles. The token definition itself is unchanged. The border ring
falls back to the four corner arcs drawn by its sheen and shade layers, which
means wide menu panels no longer carry a straight border segment along the
middle of their long edges.
