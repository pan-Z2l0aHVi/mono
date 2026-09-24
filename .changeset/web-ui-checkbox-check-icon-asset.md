---
'@greypan/web-ui': minor
---

feat(web-ui): render the checkbox checkmark as an icon asset

`<web-ui-checkbox>` drew its checkmark from a path the component carried itself. It now renders a stroked check from `@/icons` through a nested `<web-ui-icon>`, inside the same `<web-ui-svg-draw-lines>` wrapper, so the indicator is an asset like every other glyph in the library rather than a hand-held exception. The draw-in and retract, the `--wui-duration-trigger` timing and the `motion="reduced"` bypass all keep working: `<web-ui-svg-draw-lines>` reaches geometry inside nested open shadow roots, and the check's color arrives through `<web-ui-icon>`'s `--wui-icon-color`, set to `--wui-color-on-control` — the token radio's dot and switch's thumb use — so it stays legible on the accent-filled indicator.

Two visible consequences. The stroke weight follows the asset (`stroke-width="2"` on a 24-unit canvas, previously 3), so the check is a step thinner. And it renders at `<web-ui-icon>`'s own default 18px: the host cannot reach the `<svg>` inside the icon's shadow root, so enlarging `--wui-selection-control-size` now grows the indicator box without scaling the check inside it.

The asset has to stay stroked (`fill: none` + `stroke: currentColor`). A solid icon is a silent failure here — `<web-ui-svg-draw-lines>` animates `stroke-dashoffset`, which affects only stroke painting, so the animation runs to completion while the check simply appears. `checkbox.motion.browser.spec.ts` now pins `fill: none` and the on-control stroke to keep that precondition from regressing, and both checkbox motion specs observe the icon's nested shadow root, since `ShadowRoot.getAnimations()` does not cross into it.
