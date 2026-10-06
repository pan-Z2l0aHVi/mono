---
'@greypan/web-ui': patch
---

Give the drawer drag bar breathing room at the panel edge. The drag bar's visual center is still floored at half the bar thickness so it can never cross the panel's inner edge, but that floor now adds a further 4px: consumers that zero `--wui-drawer-content-padding` to fill the panel edge-to-edge previously ended up with the capsule sitting flush against the edge, which read as the handle being squeezed outside the border's shadow line. With the extra inset the capsule keeps a visible gap from the edge. The default 20px padding is unaffected, and the hit zone thickness is unchanged.
