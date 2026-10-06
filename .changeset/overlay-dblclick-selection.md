---
'@greypan/web-ui': patch
---

Fix `web-ui-dialog`, `web-ui-drawer` and `web-ui-image-preview` so opening one with a double click no longer leaves a document selection behind.

`showModal()` promotes the panel into the top layer, and the browser re-resolves the still-live double-click selection against the new layout. The selection therefore landed on the dialog's or drawer's own just-mounted body text, leaving it visibly highlighted. The selection is created by the browser inside the `showModal()` call: no Selection API is invoked by script, and `preventDefault()` on `dblclick` does not stop it.

Each component now clears the document selection right after the panel is promoted. Only the selection is cleared — no `user-select` is changed — so text inside an open panel is still selectable by dragging, and the existing `user-select: none` areas are unaffected. Opening an overlay also discards a selection that existed before the open, which the modal backdrop had already made unusable.
