---
'@greypan/web-ui': major
---

Remove the `@greypan/web-ui/scrollbars` and `@greypan/web-ui/scrollbars.css` subpaths and the optional `overlayscrollbars` peer dependency. Scrollbars are native CSS now: `web-ui-theme` exposes `--wui-scrollbar-handle`, components read it inside their shadow roots through `scrollbar-color` / `scrollbar-width`, and the outermost theme mirrors the token to `documentElement` so `html { scrollbar-color: var(--wui-scrollbar-handle) transparent }` themes the document scroll container.
