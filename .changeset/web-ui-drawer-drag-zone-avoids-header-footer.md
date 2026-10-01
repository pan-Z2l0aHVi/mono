---
'@greypan/web-ui': patch
---

Stop the draw-to-close hit zone of a top or bottom drawer from covering its header or footer. The zone is an absolutely positioned sibling of the panel body, and `placement=bottom` pinned it at `top: 0` — exactly where the header starts, with a higher stacking order than the panel itself. Buttons under the header were neither clickable nor able to start a drag, and the whole header sat under a 20px transparent strip. `placement=top` was the mirror image, covering the footer rather than the header.

Both zones now yield to the section they would otherwise cover: `bottom` clears the header, `top` clears the footer. The yield is measured from that section's border-box height with a `ResizeObserver`, written to `--wui-internal-drawer-header-inset` / `--wui-internal-drawer-footer-inset`, and consumed by the two placement rules — so a header whose height is dynamic (a narrow-viewport breakpoint rewriting it, consumer padding, slotted content wrapping) is followed rather than sampled once. With no header or footer present the yield is `0` and the zone sits exactly where it did before; the left and right placements are untouched, since they hug a vertical edge where neither section lives.

The breathing gap between the zone and the section is exposed as `--wui-drawer-drag-zone-inset` (defaulting to `var(--wui-space-1, 4px)`) so it can be tuned on a device without rolling anything back.
