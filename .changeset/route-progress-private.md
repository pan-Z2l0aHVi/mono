---
'@greypan/web-ui': patch
---

Use GPU-composited `translate3d` positioning for `web-ui-progress` indicator transitions in determinate mode to avoid layout reflows on frequent progress updates while preserving pill border-radius.
