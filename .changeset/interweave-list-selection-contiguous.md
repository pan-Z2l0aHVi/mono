---
---

Internal change: consecutive selected rows in the library list now read as one block
instead of a stack of separate pills. The rows sit flush with no gap between them, so a
checked row gives up the two corners on any side where its neighbor is also checked,
leaving the rounded corners only at the ends of the run. A lone checked row, and any row
whose neighbors are unchecked, keeps its full 14px radius.

`ResourceList` reports whether the row above and below are checked; `ResourceRow` owns
the resulting shape. The four cases are spelled out as complete class literals because
Tailwind's scanner cannot see class names assembled in a template. Verified in the browser
for a contiguous run, a non-contiguous selection, a single row and a full selection, in
both themes. No published package version changes.
