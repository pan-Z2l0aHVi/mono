---
'@greypan/web-ui': patch
---

Fix `web-ui-layout`'s `header-glow` so its feather no longer ends in a hard band in Safari.

`header` sets `isolation: isolate`, which makes it a local stacking context and a clipping boundary for its own `z-index: -1` pseudo-element. The glow necessarily overflows that box — `translateY(-50%) scale(1.05, 2)` pushes its bottom edge half a header height below the header — and `filter: blur()` extends the feather further outside the box still, where WebKit cuts it off. The result was a visible step at the bottom edge: the ramp reached a non-zero alpha and dropped straight to zero inside a single device row.

The feather is now painted inside the box by a `linear-gradient` (opaque to 50%, then fading to fully transparent) instead of by a blur, so nothing depends on drawing outside the box and no cut exists. The transparent endpoint is the bare `transparent` keyword rather than `color-mix(in srgb, var(--wui-layout-header-glow-color) 100%, transparent)`: colour mixing is premultiplied, so that expression resolves to the fully opaque colour and leaves no fade at all.

Geometry, colours, horizontal clipping and sticky behaviour are unchanged, and no DOM is added. The glow still follows the header's measured box, so it adapts to slot height as before.
