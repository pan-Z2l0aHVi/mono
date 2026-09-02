# ADR-0034: Web UI Semantic Token System

## 背景

Web UI 的 token 是已发布公共契约，但早期命名混合了视觉强度、组件来源和实现载体：`text-muted` / `text-faint` 难以表达层级边界；`border-strong` 实际是 focus 态颜色；`button-size` 同时服务 button、input、select 等控件；`shadow-pop` 和 `web-ui-back-top-*` 与整体命名规则不一致。部分内部接线变量也使用公开 `--wui-*` 前缀，容易被误解为可覆盖 API。

## 决策

### 文本层级

文本前景使用稳定层级命名：

- `--wui-color-text`
- `--wui-color-text-secondary`
- `--wui-color-text-tertiary`
- `--wui-color-text-disabled`

`secondary` 表示支撑信息，`tertiary` 表示最弱意图的前景，`disabled` 只表示禁用语义。不使用 `muted`、`faint` 表达禁用。

### Focus 指示器

Focus token 只定义颜色与宽度：

- `--wui-color-focus-ring`
- `--wui-focus-ring-width`

键盘可聚焦控件使用 `:focus-visible` + outline；文本输入类控件在 focused 态使用 accent border 和 focus halo；`:active` 继续使用 state-layer 或按钮状态色。focus 指示器的绘制方式由控件类型决定，不把所有控件强制改成同一种 box-shadow。

### Surface 与共享几何

- 中性交互面命名为 `--wui-color-surface-control`。
- Slider/Switch 轨道命名为 `--wui-color-surface-track`。
- 所有 40px 方形控件尺寸统一为 `--wui-control-size`。
- 小型浮动面板阴影统一为 `--wui-shadow-panel`。
- 半透明浮层和 Layout sidebar 卡片统一使用 `--wui-color-surface-overlay`；不为单个组件背景新增全局 `--wui-<component>-bg` 别名。

### Variant 状态色

语义色源 token 只表达基础含义；组件的 hover/active 背景是 variant state color，在组件内部派生。filled 与 neutral control 的按压反馈向黑色混合，避免深色模式因混入浅色文本而在 active 时变亮。tonal danger 保留既有红色前景和 danger 比例递增的状态面，以维持红色语义强度；其对比度取舍不通过改写全局 danger token 解决。

### 公共与内部边界

对外 CSS custom property 使用 `--wui-*` 并完整记录在 README。仅用于 Shadow DOM 内部接线的变量使用 `--wui-internal-*` 前缀，例如 glass shadow/focus slot、overlay transform origin 和 layout glow 几何。

## 后果

- 旧 `text-muted`、`text-faint`、`border-strong`、`button-size`、`surface-raised-mid/deep`、`shadow-pop` 与 `web-ui-back-top-*` 不保留兼容别名，消费者必须迁移。
- Focus indicator 在不同控件类型上有一致的色彩和宽度，但保留 outline 与 box-shadow 两种合适绘制路径。
- Theme README 成为全局 token 的权威清单；新增全局 token 必须同步双语文档。
- 为单个组件状态调整颜色时，优先派生 component-local token；不改写全局 semantic hue token。
- 组件专属背景若与共享 surface 语义一致，直接引用共享 token；删除 `--wui-layout-sidebar-bg` 时不保留兼容别名。
