---
'@greypan/web-ui': minor
---

Expose the nested drawer stack's reveal step as `--wui-drawer-nested-peek-base`, and grow the stack logarithmically instead of by a constant step.

The stack used to shift each layer inward by a hardcoded `12px`, so four drawers produced three identical 12px steps and a 36px total. Depth `d` now shifts by `A · ln(d + 1)`, so the total stack width is `A · ln(n)`: the first reveal is wide, each layer above it adds less, and the total no longer inflates linearly with depth. With the shipped defaults a four-layer stack of `320px` drawers reveals `24.95px` / `14.60px` / `10.36px` for a `49.91px` total on desktop, and `16.64px` / `9.73px` / `6.90px` for `33.27px` at `width <= 640px`. A single layer is unaffected, since `ln(1)` is `0`.

`A` is a registered `<length>` custom property, so the desktop default is the `initialValue` the component passes to `CSS.registerProperty` and narrow viewports override the same token from a media query. Set it on the host (or any ancestor) to retune the whole stack, or to `0` to turn the reveal off; a consumer's unitless `0` is normalized to `0px` at computed-value time. The component also recomputes an open stack when the viewport crosses the breakpoint, so a stack that is already on screen does not keep offsets from the other base.

The scaling and width compensation that position the cards are unchanged, as are drag-to-close, reduced motion, headless, and inset.
