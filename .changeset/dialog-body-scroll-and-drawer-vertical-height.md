---
'@greypan/web-ui': patch
---

Fix two ways short and tall content could be lost inside `<web-ui-dialog>` / `<web-ui-drawer>`:

- **`<web-ui-dialog>` `body` mode scrolls.** With a `slot="body"` child the card sized itself to its content and spilled out of the `dialog` box, which stays `overflow: visible` so the glass shadow is not clipped — everything past the fold ended up off-screen and unreachable, because no element was a scroll container. The `body` slot is now wrapped in `.wui-dialog-content`, the card keeps sizing to its content when the content fits and is otherwise bounded by the same literal `100vh` / `100dvh` backstop it already had, and the body content scrolls inside it. The built-in close button keeps its `--wui-dialog-close-top` / `--wui-dialog-close-right` offset while that content scrolls. `--wui-dialog-max-height` still caps `.desc` only, as documented.
- **`<web-ui-drawer placement="top|bottom">` honours `--wui-drawer-height`.** A later `height: auto` in the floating-card block overrode the placement's height, so a vertical drawer collapsed to its content height instead of the documented `300px` and `.wui-drawer-content` never got the bounded box `flex: 1` needs to shrink into — tall content overflowed the panel and could not be scrolled to. The placement height is declared again where it belongs; side placements and headless drawers behave exactly as before.
