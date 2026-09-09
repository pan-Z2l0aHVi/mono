# ADR-0006: 本地 Overlay 的布局层叠

- **Date**: 2026-07-30
- **Status**: 已接受

## 背景

`web-ui-layout` 中固定头部、基础内容、侧边栏与各类 Overlay 共存于同一层叠空间；窄视口下头部组件内的非 Portal Overlay 可能溢出其网格区域，需要明确的层叠顺序保证其可交互。

## 决策

- `web-ui-layout` 管理其同级区域的层叠顺序：基础内容和侧边栏位于固定头部下方；窄视口导致头部组件内的非 Portal Overlay 溢出其网格区域时，仍能正常交互。
- 默认保留本地 Overlay，而非强制使用 Portal。Portal Overlay 使用独立的语义层叠顺序：锚定的 Portal Overlay 和菜单，然后是 Toast，然后是加载 Overlay；子菜单位于其父菜单之上，而原生 Dialog 和 Drawer 始终位于浏览器顶层。Select、Popover 和 Tooltip 仅在其 `portal` 属性启用时才加入菜单层。
- 显式的 `overlayContainer` 使用这些层叠值，但其调用方拥有任何祖先层叠上下文；库不会修改该祖先或注入父级样式。当未显式指定容器时，位于打开原生 Dialog 或 Drawer 内的 Portal target 会解析到该 Dialog，使浮层一并进入 top layer。

## 后果

- 调用方拥有祖先层叠上下文：库不修改也不兜底，自定义容器的层叠问题由调用方自行约束。
- BackTop 是应用辅助层，位于基础内容之上、Portal 菜单之下。
