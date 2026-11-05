---
'@greypan/web-ui': minor
---

Gate every overlay's automatic opening on content presence. `web-ui-autocomplete` now keeps its panel open whenever there is anything to show — a matching candidate or any other node in the `default` slot — instead of closing as soon as no candidate matches. `web-ui-select`, `web-ui-dropdown`, `web-ui-popover` and `web-ui-tooltip` use the same rule: opening gestures do nothing when the panel has nothing to show. `show()` and writing `open` still open an empty panel, content added while closed does not open it, and clearing the last content while open collapses the panel immediately without an exit transition. Non-option content in the autocomplete and select `default` slot counts as panel content, so authors can render a custom empty state there.
