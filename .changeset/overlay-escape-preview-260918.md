---
'@greypan/web-ui': patch
---

Bring `imagePreview()` into Escape arbitration, so it stops closing the layer underneath it.

The preview drives its own native `<dialog>` and relied on the `cancel` event for Escape without ever registering as an open overlay. Because Escape is arbitrated globally and the arbiter calls `preventDefault()` as soon as it resolves a registered layer, having the preview open on top of anything registered meant one Escape closed the layer _underneath_ and left the preview on screen. The preview now claims its `<dialog>` while it is open — including a fresh claim after being reattached to the DOM — and its `cancel` handler is kept only for the top-layer guarantee.

- Unlike the other overlays it carries no inert channel: `imagePreview()` has no `no-escape-close` option, so Escape always closes it.
