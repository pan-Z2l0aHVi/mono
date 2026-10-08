---
'@greypan/web-ui': patch
---

Shorten the shared scrollbar auto-hide delay and make track clicks land instantly. `webUiScrollbarsOptions` now hides the scrollbars 2000ms after scrolling stops (was 2500ms), and its `clickScroll` resolution gains `clickScrollDuration: 0`, dropping OverlayScrollbars' default 200ms ease so a track click jumps straight to the clicked position instead of animating there (the animation stuttered on the virtualized resource list).
