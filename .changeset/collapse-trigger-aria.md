---
'@greypan/web-ui': patch
---

Expose `aria-expanded` and `aria-disabled` on the native button inside `<web-ui-button>` when it is used as a collapse trigger. Keep `aria-controls` on the host because its IDREF cannot resolve across shadow roots; `aria-disabled="true"` also suppresses button activation.
