# @greypan/interweave

## 0.0.1

### Patch Changes

- 62bdbec: fix(prototype): restore autofocus for the tag field in the edit-tags dialog
  
  Opening the edit-tags dialog stopped focusing the tag field: the page reached into the `web-ui-autocomplete` shadow root for `.autocomplete-input` and called `focus()` on it, but the autocomplete trigger refactor turned that node into the `web-ui-input` host, which is not focusable, so the call was silently a no-op.
  
  The dialog now calls the component's public `focus()`, which delegates to the active trigger and lands on the inner native input. The dropdown no longer opens on its own when the dialog appears; it opens on pointer click, while typing, or with ArrowDown/ArrowUp from the focused field.
- @greypan/interweave-frontend@0.0.0

## 0.0.0
