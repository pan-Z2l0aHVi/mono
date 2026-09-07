---
'@greypan/web-ui': major
---

style(web-ui): unify sidebar overlay token

- Remove `--wui-layout-sidebar-bg`; layout sidebars use `--wui-color-surface-overlay`.
- Set the dark overlay surface to `rgb(32 34 34 / 0.9)`, compositing to about `#202223` over the page background.
