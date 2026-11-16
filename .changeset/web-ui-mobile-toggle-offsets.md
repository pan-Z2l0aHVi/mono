---
'@greypan/web-ui': major
---

Rename `--wui-layout-mobile-toggle-inset` to `--wui-layout-mobile-toggle-left`, with no compatibility layer for the old name, and give the mobile header Toggle the remaining sides: `--wui-layout-mobile-toggle-top` (already present), `--wui-layout-mobile-toggle-right` and `--wui-layout-mobile-toggle-bottom`. All four are margins on the Toggle; top and left default to `8px`, right and bottom to `0`, so a layout that only sets the old left inset maps one-to-one onto the new name.
