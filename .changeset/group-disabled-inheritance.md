---
'@greypan/web-ui': patch
---

Make Checkbox Group, Radio Group, and Segmented disabled state inherited without changing child `disabled` properties. Effective disabled child controls now expose `aria-disabled` and leave the tab sequence.
