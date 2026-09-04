# ADR-0043: Web UI hover/active 背景反馈即时切换

## 背景

web-ui 各组件的 hover/active 背景变化此前普遍声明 `background-color` transition（`--wui-duration-trigger` 160ms / `--wui-duration-feedback` 100ms），指针悬停或按压后背景颜色平滑渐变。这类渐变让控件状态响应显得迟滞，与目标平台（iOS/macOS 原生控件）的即时反馈手感不一致；且 hover 状态高频进出，过渡动画反而放大视觉噪声。

## 决策

**约定：指针 hover/active 驱动的背景反馈即时切换，组件不为其声明 transition。**

- **即时范围**：`:hover` / `:active` 触发的 `background-color` 变化（button、select trigger、input-number 步进按钮、segmented trigger、drawer drag bar 等）；color 与 background 联动变化的高亮（option、dropdown-item 的 hover 高亮文字变白 + 背景变 accent）整体即时，避免文字渐变与背景瞬变的错位。
- **不即时范围（保留过渡）**：
  - 选中态切换：checkbox/radio 的 `.is-checked`、switch 的 `.is-open`、segmented trigger 的 `.is-checked` 颜色。
  - JS 按压反馈：switch thumb 与 segmented/slider indicator 的 `is-pressed`/`is-dragging` 玻璃化背景与 scale 动画（等效按压手势的一部分，非指针 hover/active 语义）。
  - focus 反馈：input/textarea/autocomplete 的 border/focus halo 过渡。
  - overlay enter/exit、drawer 拖拽跟手、collapse 展开收起、layout 宽度等结构动画。
- **未来新组件**遵循同一约定：hover/active 背景直接写终态色值，不声明 transition。

## 后果

- 控件 hover/active 背景即时响应；`--wui-duration-trigger` / `--wui-duration-feedback` 仍被选中态、opacity 反馈和 overlay 动画使用，token 契约不变。
- 组件 CSS 中不再存在 hover/active 驱动的 `background-color` transition；`prefers-reduced-motion` 块中为该过渡准备的重复声明随之移除。消费者如需恢复渐变只能整组件覆盖样式，库不提供专门开关。
