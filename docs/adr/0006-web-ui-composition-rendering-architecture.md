# ADR-0006: Web UI Composition & Rendering Architecture

- **Date**: 2026-07-30
- **Status**: 已接受

## 1. Overlay 交互策略

Overlay 组件族共享滚动锁定与焦点管理两类横切行为；按组件显式声明，不由全局默认隐式推导。

- `no-scroll-lock` 可选择退出背景文档的滚动锁定；Dialog 保持原生模态行为；Select、Dropdown 和 Context Menu 暴露 `no-scroll-lock`，Popover 和 Tooltip 始终不锁定滚动
- Select 打开时焦点保持在其 combobox 触发器上，通过 `aria-activedescendant` 暴露当前选中项
- Dropdown 和 Context Menu 使用循环方向键导航、Home/End 键、子菜单导航、Enter/Space 激活、单次 Escape 关闭最深层的已打开菜单
- Popover 仅聚焦其第一个可用的 `[autofocus]` 后代元素

## 2. Overlay 定位引擎

**定位引擎唯一，定位路径按语义准入分级。**

- 全库唯一定位引擎为 `@floating-ui/dom`，版本由 workspace catalog 锁定
- 语义一致的浮层默认经 `defineOverlay` / `defineAnchoredPanel` 定位
- 语义分歧的浮层可拥有私有定位路径，准入条件：(a) 同一引擎与版本；(b) 分歧理由成文于组件内；(c) 引擎级通用知识在第二个组件出现时下沉到 shared
- `defineOverlay` 不为单一消费者扩展配置旋钮；能力面扩展以出现第二个真实消费者为前提

## 3. 布局层叠

- `web-ui-layout` 管理同级区域的层叠顺序：基础内容和侧边栏位于固定头部下方
- 默认保留本地 Overlay；Portal Overlay 使用独立语义层叠顺序：锚定 Portal → Toast → 加载 Overlay
- 原生 Dialog 和 Drawer 始终位于浏览器 top layer
- 显式 `overlayContainer` 的层叠上下文由调用方拥有；库不修改祖先样式

## 4. 覆盖层内容迁移

覆盖层面板在文档流外（portal），消费者以声明式框架编写内容，组件在打开时物理迁移节点。

1. **打开态内容迁移**：tooltip、select、dropdown、context-menu 使用「打开迁入 portal、关闭迁回 + 身份追踪与注入补偿」
2. **menu 族关闭态隐藏**：通过 slot 属性改写实现「未分配 → 不渲染」；节点始终留在文档流原位
3. **slot 属性边界约束**：组件对消费者节点的写入仅限上述两类；其余公开 DOM 属性一律不得写入

## 5. Group Management（@lit/context 下行通道）

受管子元素组合（segmented、radio-group、checkbox-group、button-group）使用 `ContextProvider` / `ContextConsumer`（`@lit/context`）：

- **载荷形状**：`ReadonlyMap<HTMLElement, Context>`——root 上单个 provider 以整表广播，子项按自身元素取条目
- **通信边界**：仅下行（disabled 继承、direction/isLast 展示态）；成员追踪、点击归因、选中态上行写回由 GroupController 直驱
- **离开组语义**：子项被移出 provider 子树时 `ContextConsumer` 静默退订；`defineGroupManaged` 在 `hostDisconnected` 显式清空上下文

## 6. Design Token 体系

### 6.1 语义命名

文本前景使用稳定层级：`--wui-color-text` / `text-secondary` / `text-tertiary` / `text-disabled`。不使用 `muted`、`faint`。

Focus token 只定义颜色与宽度：`--wui-color-focus-ring` / `--wui-focus-ring-width`。

中性交互面 `--wui-color-surface-control`；Slider/Switch 轨道 `--wui-color-surface-track`；40px 控件尺寸 `--wui-control-size`；浮动面板阴影 `--wui-shadow-panel`；浮层卡片 `--wui-color-surface-overlay`。

对外 CSS custom property 使用 `--wui-*`；内部接线变量使用 `--wui-internal-*` 前缀。

### 6.2 Duration / Easing / Scale

- `--wui-duration-focus: 200ms`；`--wui-duration-trigger`（原 `--wui-duration-fast`）；`--wui-duration-drawer-enter: 280ms` / `--wui-duration-drawer-exit: 240ms`
- `--wui-ease-enter`（原 `--wui-ease-out`）；`--wui-ease-slide`（原 `--wui-ease-standard`）
- `--wui-scale-enter: 0.97`

### 6.3 语义 Radius Token

三个公开语义 token，不引入数字 scale 或 shape 层：

- `--wui-radius-control: calc(infinity * 1px)` — pill 形小控件
- `--wui-radius-menu: 18px` — menu/popover 类浮动面板
- `--wui-radius-overlay: 28px` — 大型覆盖层与独立浮动卡片

非 pill radius 与 glass corner 联动：覆盖 token 时 border-radius 与对角光影一起变化。

## 后果

- 每个 Overlay 遵循明确的焦点模型；定位引擎唯一，私有路径需满足三条准入条件
- 调用方拥有祖先层叠上下文；库不修改也不兜底
- 组件对消费者节点的写入面严格受限
- 新增受管组合时以 GroupController 承担成员与上行逻辑，@lit/context 仅下行
- 旧 token 命名不保留兼容别名；新组件属于哪一族就用哪个语义 radius token
