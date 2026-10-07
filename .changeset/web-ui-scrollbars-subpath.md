---
'@greypan/web-ui': minor
---

Scrollbars now match macOS across the library and the apps.

- New `@greypan/web-ui/scrollbars` subpath: `webUiScrollbarsOptions` (macOS theme, auto-hide while scrolling, click the track to scroll to that spot), `WEB_UI_SCROLLBARS_THEME`, and `@greypan/web-ui/scrollbars.css` — the theme plus the library's structural styles in one stylesheet.
- `select`, `autocomplete`, `dialog` and `drawer` skin their own scroll areas with it, inside their shadow roots, so no setup is needed.
- `overlayscrollbars` moves from an optional peer to a runtime dependency, which is why this is a minor: it is installed with the package, and existing imports and installs keep working.
