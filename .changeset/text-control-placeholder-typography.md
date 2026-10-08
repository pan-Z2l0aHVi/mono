---
'@greypan/web-ui': patch
---

Text controls pin their placeholder typography to the control itself instead of leaving it to engine inheritance, so placeholder text cannot drift from the control it belongs to:

- `<web-ui-input>`, `<web-ui-textarea>`, `<web-ui-input-number>` and `<web-ui-autocomplete>` keep their placeholder in step with `--wui-font-size`, including the `max(16px, …)` clamp that coarse pointers apply to the control — declaring a separate `font-size` on the placeholder would have bypassed that clamp.
- `<input>`'s placeholder line height now matches the control instead of resolving to `normal`. `<textarea>`'s already did.
- `<web-ui-input-number>`'s placeholder consumes `--wui-color-text-secondary` like the rest of the family; it previously fell back to the user-agent colour.
