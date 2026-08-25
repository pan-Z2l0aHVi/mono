---
'@greypan/web-ui': major
---

重构 Web UI CSS token 契约：文本层级改为 `secondary/tertiary/disabled`，focus 指示器拆分为 `--wui-color-focus-ring` 和 `--wui-focus-ring-width`，并删除 `--wui-color-border-strong`。同时将 control surface、track、panel shadow、control size、layout duration 和 back-top 变量统一到语义化命名。

本次不保留旧名兼容别名。需要迁移的主要映射：

- `--wui-color-text-muted` → `--wui-color-text-secondary`
- `--wui-color-text-faint` → `--wui-color-text-tertiary`
- `--wui-color-border-strong` → focused 输入边框改用 `--wui-color-accent`
- `--wui-focus-ring` → `--wui-color-focus-ring` + `--wui-focus-ring-width`
- `--wui-button-size` → `--wui-control-size`
- `--wui-color-surface-raised-mid` → `--wui-color-surface-control`
- `--wui-color-surface-raised-deep` → `--wui-color-surface-track`
- `--wui-shadow-pop` → `--wui-shadow-panel`
- `--web-ui-back-top-*` → `--wui-back-top-*`
- `--wui-duration-regular` → `--wui-duration-layout`
- `--wui-ease-out` → `--wui-ease-enter`
