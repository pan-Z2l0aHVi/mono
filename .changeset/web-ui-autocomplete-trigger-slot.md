---
'@greypan/web-ui': minor
---

feat(autocomplete): add a `trigger` slot so the default input can be replaced by any editable component

The default trigger is now an internal `web-ui-input`, following the `web-ui-select` wrapper-div pattern: the wrapper div carries the combobox ARIA, marks itself with `data-custom-trigger` when a custom trigger is present, and hosts `slot[name="trigger"]`. The panel stays anchored to the trigger element, and the `trigger` slot stays on the host while options migrate into the portal panel.

Delegation is shared between the two triggers: `value`, `input`, `click`, `focus` and `blur` are read and forwarded through the trigger, so a custom trigger only needs a string `value` property and has to be focusable. `web-ui-input` and `web-ui-textarea` work as-is.

Multiline triggers (a trigger whose editable element is a `<textarea>`) keep Enter for newlines: Enter no longer selects the highlighted option nor commits a custom value, so close the panel with Escape or blur. Selecting an option still writes its label back to the trigger.

While the panel is open in a multiline trigger, ArrowUp/ArrowDown move the text caret instead of navigating options (same exception as Enter); with the panel closed they still open it. The trigger wrapper div is never a tab stop (`tabindex="-1"`) — sequential focus belongs to the trigger itself, which has to be focusable per the documented contract.

Adds public `focus()` / `blur()` methods to `web-ui-autocomplete`: they delegate to the active trigger (the default `web-ui-input` or the custom trigger), so consumers can focus the field without reaching into internals. `web-ui-input` gains the matching public `focus()` / `blur()` — the host itself is not focusable, so `focus()` on it used to be a no-op; `web-ui-textarea` already had them.
