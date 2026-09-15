---
'@greypan/web-ui': patch
---

Flatten the pressed and dragging shadow of `switch`, `segmented` and `slider` to a single soft `0 2px 20px rgb(0 0 0 / 0.2)` layer, replacing the previous three-layer stack. All three now share the same pressed composition: `switch` and `slider` keep the rest of their values, and `segmented` picks up the inset highlight stroke the other two already had. A pressed thumb or indicator reads as one flat lift instead of a deep stack.
