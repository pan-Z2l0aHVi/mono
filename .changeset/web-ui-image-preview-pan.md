---
'@greypan/web-ui': minor
---

Let `imagePreview()` be dragged to pan in any direction at any zoom level, and make that the stage's default drag behaviour. Previously a drag only did something while zoomed in, and the offsets were clamped to how far the image overflowed the stage — which is zero at 1x. The bound is now half the absolute size difference between the image and the stage: zoomed in it still reveals the cropped edges, at 1x it moves the image around inside the viewport, and either way the image can never be dragged out of the viewport. Holding the mouse button down and resting a single finger take the same Pointer path, so desktop and mobile behave identically.

Narrow `swipe` to own the horizontal axis only when it actually applies — 1x, with more than one image. Everything else pans, direction free, which keeps the swipe demonstrations behaving exactly as before while 1x vertical drags and every zoomed drag now pan instead of doing nothing.

Because panning also works at 1x, `resetZoom()` now has something to reset when the image is merely displaced, so the toolbar reset button is enabled whenever the image is zoomed _or_ panned rather than only above 1x.
