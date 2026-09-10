---
'@greypan/web-ui': patch
---

Add a shared overlay lifecycle transaction so frame callbacks are invalidated on same-frame close, disconnect, and reconfigure. Temporary disconnects can resume safely on reconnect.
