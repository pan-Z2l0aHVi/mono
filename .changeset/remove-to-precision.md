---
'@greypan/js-kit': major
---

Remove `toPrecision` API (floating-point rounding instability: `toPrecision(1.005, 2)` returned `1`). Use explicit rounding or string-based formatting instead.
