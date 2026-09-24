---
'@greypan/web-ui': minor
---

fix(web-ui): stop `<web-ui-radio>` and `<web-ui-checkbox>` from reserving space for a label they do not have

The trigger row is an `inline-flex` with `gap: 10px`, and the host is sized by its content, so a control with nothing renderable in its default slot measured 28px for an 18px indicator: a gap only knows there is a flex item there, not that the item has no width. Every standalone control hit that, and so did the usual accessible-name workaround of slotting one visually hidden (`.sr-only`) span — that content is assigned to the slot but paints no box.

The row now collapses the gap when the label's rendered width is 0, tracked through one `ResizeObserver` shared by all selection controls rather than one per instance. Emptiness is deliberately measured instead of asked of the slot: `slot:empty` reads the slot's own child nodes, and assigned nodes are not its children, so an assigned-but-invisible label would have looked non-empty. The other candidate — hiding the label — is the wrong one, since `display: none` takes the slotted accessible name out of the accessibility tree along with the space.

A control whose label paints is unaffected: the 10px between indicator and text stays, as does hovering that gap to tint the indicator. A standalone or hidden-name-only control is now exactly `--wui-selection-control-size` wide, so it lines up with the content around it instead of trailing 10px of dead space. `shared/label-emptiness/__tests__/selection-label.browser.spec.ts` pins the host width for empty, `.sr-only`-only and labeled controls, the collapse when a label is removed at runtime, and the convergence for a control that mounts inside a `display: none` subtree.
