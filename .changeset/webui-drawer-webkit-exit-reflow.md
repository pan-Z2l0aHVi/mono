---
'@greypan/web-ui': patch
---

Flush the drawer's current layout before switching to the exit transition so WebKit reliably starts the transition when closing immediately after opening.
