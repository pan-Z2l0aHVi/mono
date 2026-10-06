---
'@greypan/web-ui': patch
---

Stop `web-ui-dropdown` from painting the accent `:focus-visible` highlight on its first item when opened by pointer, matching the existing context-menu behavior in WebKit. Keyboard-activated opens keep the highlight, and the first arrow keypress always restores it.
