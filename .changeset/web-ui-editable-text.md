---
'@greypan/web-ui': minor
---

Add `<web-ui-editable-text>`, an inline plain-text editor. Clicking the text edits it in place with the caret at the clicked offset, `Enter` adds a newline, `Escape` cancels and restores the previous value, and blur commits the draft. The text layer and the editing layer share one box, so entering edit mode does not shift the rendered text by a single pixel. The component is form-associated: it submits through `FormData` and restores the declarative `value` on `form.reset()`.
