---
'@greypan/web-ui': patch
---

Stop a tall context menu from spilling past the bottom of the viewport when it is opened near that edge. Clamping used `panel.getBoundingClientRect()`, which includes transforms, and the panel is mid-way through its enter animation `transform: scale(var(--wui-scale-enter, 0.95))` at exactly that moment. The clamp therefore sized the menu 5% smaller than it turns out to be: a 456px menu was positioned as if it were 433.2px tall, and once the animation settled back to `scale(1)` its bottom edge sat 14.8px below the viewport. The panel clips overflow and does not scroll, so the last item — often the destructive one — was cut off and could not be clicked or scrolled to.

The arithmetic clamp has since given way to Floating UI. Positioning now runs `computePosition` with the trigger point as a zero-size reference: `flip` picks between opening below the trigger point and flipping above it when there is not enough room, and `shift` clamps both axes into the viewport, clearing `--wui-context-menu-safe-area-bottom` along the bottom edge. A tall menu opened near the bottom edge therefore flips above the trigger point with its bottom edge aligned to it, and is clamped into the viewport either way, so the last item stays reachable instead of being cut off.

Sizing is still taken from untransformed dimensions. The panel is mid-way through its enter animation at exactly the moment it is positioned, and Floating UI's `getDimensions` falls back to `offsetWidth` / `offsetHeight` whenever a measured rect disagrees with them — the same protection the offset-based arithmetic gave, and still load-bearing: measuring the 95%-scaled rect would make the menu reserve less room than it ends up needing.

This corrects both axes. The same inflated rect was feeding the horizontal clamp, so a menu opened near the right edge overflowed it by the same proportion (measured at 1.2px on a 414px-wide viewport, and scaling with menu width); both axes have their own regression guards, and the horizontal guard checks that the clamp was computed from the untransformed width rather than pinning an exact distance from the viewport edge.
