---
'@greypan/web-ui': patch
---

Fix `web-ui-layout`'s `header-glow` so its feather no longer ends in a hard band in Safari.

`header` sets `isolation: isolate`, which makes it a local stacking context and a clipping boundary for its own `z-index: -1` pseudo-elements. The glow necessarily overflows that box, and `filter: blur()` extended the feather further outside the box still, where WebKit cuts it off. The result was a visible step at the bottom edge: the ramp reached a non-zero alpha and dropped straight to zero inside a single device row.

Nothing now depends on drawing outside the box, so no cut exists. The colour is painted inside the box by a `linear-gradient`, and the real blur moved to a second pseudo-element whose `backdrop-filter` is faded to zero alpha by a `mask` before it reaches any clip line. Both layers expand with a negative `margin` rather than `transform: scale`, and the mask's alpha is already zero where the blur would have spilled out. The transparent endpoint is the bare `transparent` keyword rather than `color-mix(in srgb, var(--wui-color-page) 100%, transparent)`: colour mixing is premultiplied, so that expression resolves to the fully opaque colour and leaves no fade at all.

Horizontal clipping, sticky behaviour and the glow's colour are unchanged, and the glow still follows the header's measured box, so it adapts to slot height as before.
