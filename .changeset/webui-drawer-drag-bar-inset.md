---
'@greypan/web-ui': patch
---

Keep the drawer drag bar inside the panel when content padding is zero. The drag bar's visual center follows half of `--wui-drawer-content-padding`, now floored at half the bar thickness, so consumers that zero the padding to fill the panel edge-to-edge no longer push half the capsule past the panel's inner edge (where it stayed visible over the backdrop, since the dialog is `overflow: visible`). The default 20px padding is unaffected.
