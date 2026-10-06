---
'@greypan/web-ui': minor
---

Add a `closable` attribute to `<web-ui-dialog>`. It renders a built-in close button in both content modes, and the button takes the same close path as Escape and backdrop clicks — so `controlled` applies to it identically: it only emits `open-change` with `open: false` and leaves `open` to the consumer.

The two content modes place the button differently, because the title row only exists when there is no `body` slot. Without a `body` slot the button sits in a `.title-row` flex line beside the title, leaving `.title`'s own bottom margin semantics untouched. With a `body` slot there is no title row, so the button becomes a direct child of the glass card and is absolutely positioned at its top-right corner, offset by the new `--wui-dialog-close-top` and `--wui-dialog-close-right` custom properties.

The button reuses the `ooui:close` icon already shipped for the drawer close button, so no new icon enters the package's generated icon set. Escape, backdrop click, and the new button now share one `_closeFromUser` path instead of three copies of the same controlled/uncontrolled branch; their behaviour is unchanged.

Omitting `closable` renders exactly what it did before: no button, and no extra wrapper element.
