---
'@greypan/interweave': patch
---

Unset `window.ScrollTimeline` before OverlayScrollbars is evaluated, so the scrollbar thumb follows the list position on WebKit after dynamic height changes instead of stalling partway down the track.
