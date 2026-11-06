---
'@greypan/web-ui': minor
---

Redesign `trigger` across the overlay family (`web-ui-tooltip`, `web-ui-popover`, `web-ui-dropdown`, `web-ui-select`, `web-ui-autocomplete`) and route every open and close through one shared state machine, `defineTriggerController`, which replaces `defineTriggerGestures`.

The vocabulary is `click`, `hover`, `focus` and `none`, written space- or comma-separated; the property reads back comma-separated (`hover,focus`). Unknown tokens are dropped, a value naming no known gesture falls back to the component default, and `none` is exclusive with the gestures — it wins and a development warning is logged. `trigger` is string-only: the array form accepted by 12.2.0 no longer applies, and the former `manual` literal is now an unknown token. `none` means "programmatic only": no gesture opens or closes the layer, outside clicks, Escape and focus loss leave it alone, and the layer does not intercept Escape. `web-ui-context-menu` has no `trigger` prop, so right-click and long-press stay dedicated.

All five components expose `show-delay` / `hide-delay` (defaults 200ms / 100ms). The delays apply only to hover-originated opens and closes; click, focus, outside-click, Escape and programmatic calls act immediately. Focus opens on `:focus-visible`, and focus loss closes every non-`none` layer. Hover closes only after the pointer has left both the trigger and the panel and focus is outside them, and touch pointers do not trigger hover. Clicking the autocomplete input only opens the panel, never closes it.

`open` remains declarative and silent. `show()`, `hide()` and `toggle()` are the imperative entry points and now dispatch `open-change` on every component; gestures and internal closes dispatch the same event, and `detail` stays `{ open }`. On `web-ui-dropdown`, `show()` / `hide()` replace the removed `openMenu()` / `closeAll()`. `web-ui-select` renames its appearance prop from `trigger="label"|"icon"` to `variant="label"|"icon"`.

Removing `manual`, the array form, `openMenu()` / `closeAll()` and the select `trigger` appearance is breaking; no known external consumers are affected, so it ships as a minor.
