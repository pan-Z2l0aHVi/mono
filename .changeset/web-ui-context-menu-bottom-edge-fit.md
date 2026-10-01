---
'@greypan/web-ui': patch
---

Stop a tall context menu from spilling past the bottom of the viewport when it is opened near that edge. Clamping used `panel.getBoundingClientRect()`, which includes transforms, and the panel is mid-way through its enter animation `transform: scale(var(--wui-scale-enter, 0.95))` at exactly that moment. The clamp therefore sized the menu 5% smaller than it turns out to be: a 456px menu was positioned as if it were 433.2px tall, and once the animation settled back to `scale(1)` its bottom edge sat 14.8px below the viewport. The panel clips overflow and does not scroll, so the last item — often the destructive one — was cut off and could not be clicked or scrolled to.

Clamping now reads `offsetWidth` / `offsetHeight`, which transforms do not affect. The dialog path is unaffected and stays on Floating UI: measured in a browser, that path lands the menu at exactly `viewport − height − padding`, because Floating UI's own `getDimensions` falls back to `offsetWidth` / `offsetHeight` whenever a measured rect disagrees with them.

This corrects both axes. The same inflated rect was feeding the horizontal clamp, so a menu opened near the right edge overflowed it by the same proportion (measured at 1.2px on a 414px-wide viewport, and scaling with menu width); both axes now have their own regression guards.
