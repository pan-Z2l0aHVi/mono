---
'@greypan/web-ui': minor
---

Expand drawer draggable drag zone and bar, and expose their sizes as public tokens.

- Drag hit zone grows from 24px to 32px; the drag bar capsule grows from 4×48px to 4×56px and is centered 10px from the drawer's inner edge, for all four placements (`right` / `left` / `top` / `bottom`).
- New public tokens: `--wui-drawer-drag-zone-size` (default `32px`), `--wui-drawer-drag-bar-thickness` (default `4px`), `--wui-drawer-drag-bar-length` (default `56px`). The hit zone and visual bar position are independent so a wider zone does not move the capsule into drawer content.
- Drawer inset, close threshold, controlled write-back and reduced-motion behavior are unchanged.
