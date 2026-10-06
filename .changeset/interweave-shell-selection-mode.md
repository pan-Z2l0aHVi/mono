---
---

Internal change: only `apps/interweave/frontend` is touched, and `@greypan/interweave` stays unbumped because the page is a prototype surface that nothing published reads.

The shell prototype sidebar nav no longer recolors its label on the active item: selection is carried by the surface-control pill alone, while the icon sits on `--wui-color-accent` through the icon-only `--wui-icon-color` token in both themes. The label now follows the `web-ui-theme` `appearance` attribute instead of the OS media query.

The header gains a selection mode. A plain 选择 button sits between 添加 and 筛选; entering it hides every other right-side action and renders 全选, a `web-ui-button-group` of two icon buttons (删除, 找回), and a primary 确认 check button that returns to the resting state. 删除 is the only red member — its icon takes `--wui-color-danger` and its tooltip text migrates through `slot="content"` with an inline color, because the portalled panel lives in a shadow root that Tailwind classes cannot reach. No bulk action is wired yet.
