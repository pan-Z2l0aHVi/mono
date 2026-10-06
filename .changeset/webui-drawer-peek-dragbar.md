---
'@greypan/web-ui': patch
---

feat(web-ui): 收窄嵌套抽屉层间露边并把拖拽确认态改为中性灰

- `--wui-drawer-nested-peek-base` 桌面基准 `54px` → `43.2px`，窄视口（`width <= 640px`）`36px` → `28.8px`，桌面:窄屏 3:2 比例不变。三处字面量（`CSS.registerProperty` 的 `initialValue`、媒体查询覆盖、JS 侧 jsdom 兜底常量）同步更新。
- 拖拽手柄越过关闭阈值时的确认底色从 `--wui-color-accent` 改为实心中性灰，与 hover/active 的灰阶对齐。
