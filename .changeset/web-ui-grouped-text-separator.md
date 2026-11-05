---
'@greypan/web-ui': minor
---

Add a `separator` prop to `web-ui-grouped-text` that renders a display delimiter between groups. The separator is rendered as CSS generated content (`::after` fed by `content: attr()`), never entering the text nodes, so copy, in-page find, double-click word selection and per-character selection still yield the original continuous string. Default is an empty string, which renders node for node identically to before.

`@greypan/web-ui/icons` now also exports `iconGallery`, a `Record<string, IconifyIcon>` aggregating every icon currently shipped by the whitelist generator, keyed by the same camelCase names as the named exports. It is a standalone named export: importing single icons stays tree-shakeable, and only callers that import `iconGallery` pull in the full set.
