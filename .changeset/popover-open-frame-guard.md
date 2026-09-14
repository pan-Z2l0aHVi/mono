---
'@greypan/web-ui': patch
---

Prevent orphaned empty popover portal panels when controlled `open` changes back to `false`, or the popover is removed, before its open frame callback runs.
