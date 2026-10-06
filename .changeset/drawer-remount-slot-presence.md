---
'@greypan/web-ui': patch
---

Reconcile `header` and `footer` slot presence when a `<web-ui-drawer>` is reconnected.

The drawer recomputed which of its two end sections have slotted content in `connectedCallback`, but never asked for a render afterwards. Lit's `connectedCallback` only calls `enableUpdating(true)` and `setConnected(true)` — it does not schedule an update — and the section visibility is decided during render, so the recomputed value was never put to use. The two `slotchange` handlers could not cover for it either: `slotchange` fires when a slot's _assigned set_ changes, and emptying the slot content between disconnect and reconnect leaves the assigned set where it was, so the event never arrives.

The result was silent. A drawer whose `footer` content was removed while it was detached from the document came back with an empty footer section still laid out. The section keeps a real height from its own padding (32px by default), so the panel grew a dead strip along its end that swallows presses without doing anything, and the drag-to-close hit zone kept yielding to it — `--wui-drawer-drag-zone-inset` staying non-zero on a drawer that, per its own documentation, has nothing left to yield to.

`connectedCallback` now requests an update whenever the reconciled presence differs from what it had, matching the discipline the `slotchange` handlers already use. The section collapses as soon as the drawer is back in the document and the drag zone returns to the panel edge.
