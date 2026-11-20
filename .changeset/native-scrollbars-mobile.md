---
'@greypan/web-ui': patch
'@greypan/app-scrollbars': patch
'@greypan/interweave': patch
---

Use native scrollbars on phones and tablets whose primary pointer is coarse. Component scroll containers restore the platform's default scrollbar width and colors, while application-level OverlayScrollbars keeps native overlaid scrollbars visible instead of rendering custom ones.
