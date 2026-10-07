---
'@greypan/web-ui': patch
---

Fix the `<web-ui-context-menu>` modal panel rendering with light fallback colors under a dark appearance.

The scrim `<dialog>` was appended to `document.body`, but `<web-ui-theme>` writes `--wui-color-*` on its own `:host` and `document.body` is that host's **parent** — custom properties only inherit downwards, so the scrim and the panel mounted inside it both fell back to the light literals baked into `var(--wui-color-*, …)`. The scrim now mounts into the nearest theme's overlay root, the same path dropdown / select / popover already resolve, so the menu picks up the theme-scoped tokens and follows appearance changes while it is open. Without a theme scope the scrim still mounts on `document.body`, exactly as before.
