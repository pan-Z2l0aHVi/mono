---
'@greypan/web-ui': patch
---

fix(web-ui): move the header glow's horizontal clip off the header

`web-ui-layout` with `header-glow` showed a hard seam at the header's bottom edge in Safari: content scrolled underneath the sticky header met a sharp cut instead of a fade.

The glow is a `::before` pseudo-element with `inset: 0` and `transform: translateY(-50%) scale(1.05, 2)`, so it deliberately extends half a header height past the header box — that overhang is what feathers into the content below. `header` carried `overflow-x: clip` to stop the glow's horizontal scale from pushing out a page scrollbar, but WebKit applies that clip to both axes, cutting the vertical overhang and with it the fade. Chrome only clips the declared axis, which is why the seam was Safari-only.

The clip now lives on `.layout-content`, which already has `min-width: 0` and is the box that actually contains the horizontal overflow; `header` keeps `overflow: visible`. `clip` does not create a scroll container, so the sticky behaviour of the header and tabbar is unchanged.

Because the clip box is now the content column rather than the header, horizontal overflow from `main` or `tabbar` slot content is clipped instead of producing a page-level horizontal scrollbar. Consumers that need wide content to stay reachable should keep it inside their own `overflow-x: auto` container.
