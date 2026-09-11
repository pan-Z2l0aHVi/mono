---
'@greypan/web-ui': minor
---

Add a `peek-edge` property to `web-ui-collapse` for an alpha-gradient fade at the cut edge of the `peek` reveal. Defaults to off; pass a CSS length (e.g. `peek-edge="24px"`) to enable. The fade direction follows the animation axis (bottom by default, right when `horizontal`). Customise the fade-stop color via the `--wui-collapse-peek-edge-color` CSS variable.
