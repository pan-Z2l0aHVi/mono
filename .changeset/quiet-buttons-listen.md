---
'@greypan/web-ui': patch
---

fix(web-ui): preserve grouped button colors and refine dark surface hierarchy

- Preserve the danger variant and consumer `--wui-button-color` overrides inside groups.
- Refine dark page, text, control, overlay, and menu surface hierarchy.
- Add a lightweight glass border ring using `--wui-color-glass-border`, with a subtler dark-mode tint.
