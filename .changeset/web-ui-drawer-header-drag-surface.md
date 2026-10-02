---
'@greypan/web-ui': patch
---

Make the whole header of a bottom drawer — and the whole footer of a top one — a drag-to-close starting area, and thicken the capsule's hit band.

Yielding the drag zone to the header kept the header's controls clear, but it also left that section inert: with `placement=bottom` the only draggable strips were a 12px band along the grab edge and the zone below the header, so the 48px between them could not start a drag at all. On a touch device the handle was reported as far too small to hit.

The section on the grab edge now takes the gesture itself. A press anywhere in it starts a drag, title text included. Controls are kept clear one at a time, at the event layer: a press whose composed path contains an interactive element — native `button` / `input` / `select` / `textarea` / `label` / `a[href]` / `summary`, anything `contenteditable`, an interactive ARIA `role`, or any explicit `tabindex` other than `-1` — reaches the control and starts no drag. Geometric cutting was rejected deliberately: it would have to measure each control's position, so it breaks as soon as a control moves, and it relocates the previous defect instead of removing it. A custom control that is not natively interactive needs a `role` or `tabindex` to be recognised, which is the right call for accessibility regardless.

The capsule's hit band is now at least `--wui-drawer-drag-edge-size` (default `20px`, matching the drag zone's own default, so the handle is never harder to hit than the strip beside it), floored by the capsule's own outer edge so the capsule band stays fully covered by construction. The band was 12px before, derived from the capsule's midline alone.

The drag zone still yields to the header or footer, the left and right placements are untouched, and with no header or footer present the geometry is exactly what it was. The built-in close button sits outside the capsule's span and stays clickable.
