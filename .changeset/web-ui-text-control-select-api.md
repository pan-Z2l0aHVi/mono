---
'@greypan/web-ui': minor
---

Add a public `select()` to `<web-ui-input>` so callers can select the full current value through the component API instead of reaching into its shadow root or using deprecated `document.execCommand`. `<web-ui-textarea>` already exposed the same method; both now share an explicit `disabled` no-op and remain safe when the native control has not rendered.

The consistency review also adds `readonly` to `<web-ui-editable-text>`: it keeps focus, selection, and copying available while rejecting input and leaving edit mode without a `change`, matching the read-only contract of `<web-ui-input>` and `<web-ui-textarea>`. Existing `value` read/write, `input`/`change` paths, form association, and the documented non-reflected `value` attribute on `<web-ui-editable-text>` remain backward compatible.
