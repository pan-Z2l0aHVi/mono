---
'@greypan/web-ui': minor
---

Add semantic radius tokens `--wui-radius-control` (pill), `--wui-radius-menu` (18px) and `--wui-radius-overlay` (28px) to `<web-ui-theme>`; migrate control/menu/overlay components to them. `--wui-drawer-radius` and `--wui-layout-sidebar-radius` now default to `--wui-radius-overlay` (sidebar default 24px → 28px; dialog 32px → 28px; menu panels, textarea and toast 20px → 18px). Non-pill glass surfaces drive `--wui-glass-corner-radius` from their semantic radius so border lighting follows token overrides; pill controls keep a finite physical-size-derived corner. Checkbox, avatar square and empty icon shapes stay component-internal (6/12/16px).
