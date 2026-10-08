---
'@greypan/web-ui': patch
---

Fix tall content being lost inside `<web-ui-drawer>`:

- **`<web-ui-drawer placement="top|bottom">` honours `--wui-drawer-height`.** A later `height: auto` in the floating-card block overrode the placement's height, so a vertical drawer collapsed to its content height instead of the documented `300px` and `.wui-drawer-content` never got the bounded box `flex: 1` needs to shrink into — tall content overflowed the panel and could not be scrolled to. The placement height is declared again where it belongs; side placements and headless drawers behave exactly as before.
