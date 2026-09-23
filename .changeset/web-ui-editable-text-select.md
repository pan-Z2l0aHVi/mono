---
'@greypan/web-ui': minor
---

Add a public `select()` method to `<web-ui-editable-text>`: it enters edit mode with the whole content selected, and only re-selects when already editing. While `disabled` it does nothing, matching `focus()`.
