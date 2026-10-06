---
'@greypan/web-ui': major
---

Close `web-ui-autocomplete` when filtering produces no matching options, and reopen it when matches return. `allow-custom-value` still submits an unmatched value with Enter.

**Breaking removal:** the public `empty` slot and its empty-state UI have been removed. Remove `<div slot="empty">…</div>` from consumers; zero matches now leave the dropdown closed without rendering a panel.
