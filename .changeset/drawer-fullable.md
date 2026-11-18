---
'@greypan/web-ui': minor
---

`web-ui-drawer` adds a `fullable` property (default `false`; requires `draggable`). Dragging outward past the travel threshold, or releasing after a quick outward flick, snaps the drawer to a viewport-filling form (inset-aware for non-headless drawers) without requiring a release. Once a return drag crosses the restore threshold from the full form, that gesture is committed to leaving full: the drawer returns to its original size, further dragging follows with damping, and the same gesture cannot close or snap full again; release leaves it at the original size. Start a new gesture to close the drawer or enter full again. In the full form, the close button, Escape, and backdrop click still close directly; opening a nested drawer on top immediately restores the full drawer's original size (or upon release if the drawer is actively being dragged). The property defaults off, preserving existing `draggable` behavior.

The nested-layer `applyLayers` flow is now ordered as "compute depth -> callbacks -> measure sizes", with a new `onDepthChange` option. Drawer uses it to collapse the full state before geometry is read, so exposed-edge calculations cannot consume an in-transition size.
