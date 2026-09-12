---
'@greypan/web-ui': patch
---

Suppress Safari's UA focus ring on native dialog surfaces for dialog, drawer, and image-preview. The modal panel itself is not a focusable control, so keyboard focus remains on the interactive controls inside the panel.
