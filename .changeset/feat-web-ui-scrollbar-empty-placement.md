---
'@greypan/web-ui': minor
---

Center the autocomplete dropdown by default: `placement` now defaults to `bottom` (panel centered below the trigger) instead of `bottom-start`. Set `placement="bottom-start"` explicitly to keep the previous left-aligned expansion.

Theme the scrollbar of every scrollable container: the native scrollports of `web-ui-textarea` and the `web-ui-editable-text` editor, the toast container created inside an explicit `options.container`, and the `web-ui-popover` panel now adopt the shared scrollbar styles. Popover panels scroll when `--wui-popover-max-height` is set; the panel stays unconstrained by default, matching the previous behavior.

Adjust empty-state spacing: the gap between the icon and the title grows to 16px, and the gap between the title and the description shrinks to 4px.
