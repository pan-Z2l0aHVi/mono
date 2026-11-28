---
'@greypan/web-ui': patch
---

The dark-mode raised `<web-ui-segmented>` indicator now uses the control surface (`#3a3a3c`, the same light gray as the secondary button) instead of the page color. In `<web-ui-toast>`, the string passed to `toast()` or to any shortcut is written to `heading` instead of `message`; `message` is now optional and carries the body line, and `toast()` accepts a plain string as `{ heading }`.
