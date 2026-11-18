---
'@greypan/web-ui': minor
---

`web-ui-drawer` adds a `fullable` property (default `false`; requires `draggable`). Dragging outward past the travel threshold, or releasing after a quick outward flick, snaps the drawer to a viewport-filling form (inset-aware for non-headless drawers) without requiring a release. Once a return drag crosses the restore threshold from the full form, that gesture is committed to leaving full: the drawer returns to its original size, further dragging follows with damping, and the same gesture cannot close or snap full again; release leaves it at the original size. Start a new gesture to close the drawer or enter full again. In the full form, the close button, Escape, and backdrop click still close directly; opening a nested drawer on top keeps the lower drawer in its full form while scaling and shifting it back by depth, and restores the full form when the upper drawer closes.

For all `draggable` drawers, drag-to-close sensitivity is also tuned: the close distance threshold is lowered from 50% to 35%, the flick velocity threshold is lowered from 500px/s to 350px/s, initial pointerdown displacement and recent move velocity are preserved, micro-jitter on release no longer falsely cancels flicks, and fast drags past the viewport edge hand off to `window` listeners instead of cancelling on `lostpointercapture`.

The nested-layer `applyLayers` flow is now ordered as "compute depth -> callbacks -> measure sizes", with a new `onDepthChange` option.
