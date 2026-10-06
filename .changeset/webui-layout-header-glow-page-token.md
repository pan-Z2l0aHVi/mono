---
'@greypan/web-ui': patch
---

Remove the `--wui-layout-header-glow-color` custom property from `<web-ui-layout>`'s `header-glow`; the glow now reads `--wui-color-page` directly.

**Breaking removal:** `--wui-layout-header-glow-color` was a public custom property, and no compatibility alias is kept. External consumers that set it must override `--wui-color-page` on `web-ui-layout` instead.

The property was declared on the layout's own `:host`, so it shadowed any value set on an ancestor — including `<web-ui-theme>`. A theme could therefore never change the glow's colour, and the only place an override worked was on the `web-ui-layout` element itself. Reading the theme token directly makes the glow follow light and dark appearance like every other semantic colour, and lets an override set at the theme, the page or the layout take effect.

Two pseudo-elements back the glow: `::before` paints the colour as a `linear-gradient` inside the header box, and `::after` adds a real `backdrop-filter: blur(4px)` layer masked to zero alpha before it reaches any clip line. Separating them means blur strength and colour strength no longer pull on each other.
