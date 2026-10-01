---
'@greypan/web-ui': patch
---

Remove the hairline dividers between a drawer's header, content, and footer. `.wui-drawer-header` carried a `border-bottom` and `.wui-drawer-footer` a `border-top`, both the hard-coded literal `rgb(0 0 0 / 0.06)` — the only two occurrences of that colour left in the package. The panel body already carries the `.wui-glass` ring and shadow, and the sections read as separate through padding and typographic hierarchy; on a translucent glass surface the extra 6% black line read as a hard seam. It also followed no token, so it was a leftover that no appearance override could move.

This is a visible change to how an open drawer looks: the two lines are gone, and header/content/footer now meet without a rule between them. Nothing about layout, sizing, or behaviour changes — the sections occupy exactly the same boxes, and the header's and footer's padding tokens are untouched.
