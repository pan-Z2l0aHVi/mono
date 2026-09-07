---
'@greypan/web-ui': patch
---

fix(web-ui): make hover/active background feedback instant

- Remove background-color transitions driven by :hover/:active from button, select, input-number, segmented-trigger, option, dropdown-item, and drawer drag bar.
- Keep transitions for checked/pressed/focus states and overlay enter/exit animations unchanged.
