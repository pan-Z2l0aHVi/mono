---
'@greypan/web-ui': minor
---

Add a `closed` event to `web-ui-dialog`. It is dispatched once after the exit
animation finishes and the native dialog leaves the top layer, so hosts can run
post-close cleanup without polling `open`.
