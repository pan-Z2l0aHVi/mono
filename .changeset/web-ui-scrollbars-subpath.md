---
'@greypan/web-ui': minor
---

Add the `@greypan/web-ui/scrollbars` subpath. It exports `webUiScrollbarsOptions` (macOS-aligned OverlayScrollbars options: auto-hide with hover reveal, track click-to-scroll) and `WEB_UI_SCROLLBARS_THEME`, and registers the `ClickScrollPlugin` the options depend on. `@greypan/web-ui/scrollbars.css` carries the theme together with the library's structural styles in one stylesheet.

Minor rather than major: the two new export entries and the widened `sideEffects` list are additive, and the new `overlayscrollbars` peer is optional (`peerDependenciesMeta.optional`), so no existing consumer's install or import changes.
