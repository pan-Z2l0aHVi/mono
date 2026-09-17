# ADR-0013: Web UI 主题过渡

- **Date**: 2026-09-17
- **Status**: 已接受

## 1. 决策

主题过渡是 `web-ui-theme` 的公开作用域能力，不是 demo 层工具：

1. `transition` 是 boolean HTML 属性，默认 `false`，reflect；属性存在即开启，框架动态关闭时必须绑定 property。
2. 根主题使用 document View Transition 做整页圆形揭示；嵌套主题为 host 临时分配唯一 `view-transition-name`，只揭示局部范围。
3. 动效通过 WAAPI 写到 `::view-transition-old/new(...)` 伪元素；动画必须从 `document.documentElement` 创建，因为伪元素属于根元素生成的 View Transition 树，挂在组件 host 上会被默认过渡生命周期提前销毁。时长与缓动读取 `--wui-theme-transition-duration` / `--wui-theme-transition-easing`。
4. View Transition 期间关闭默认 crossfade 与 `plus-lighter` 混合，只保留 clip 揭示；这些 `:root` 伪元素规则放入 `document.adoptedStyleSheets`，结束后立即移除。这是「组件样式不进入 `document.head`」约束的显式例外：`::view-transition-*` 伪元素只能从 document 侧触达。
5. 嵌套 capture 需要 host 有盒子，飞行期间临时把 `display: contents` 覆写为 `display: block`，结束后恢复消费者 inline style。
6. 不支持 View Transitions、`adoptedStyleSheets`、reduced motion、时长为 0、capture 失败或 document 级 flight owner 已存在时立即提交新 appearance。

## 2. 边界

- `appearance="system"` 的 OS 深浅翻转当前版本不动画；显式 light/dark 变化才启动过渡。
- 单 flight 采用 last-wins：飞行中新 appearance 直接落到目标状态，由当前 transition 收尾。
- 组件不向 `document.head` 注入 `<style>`，也不要求消费者复制 demo 层 CSS。

## 后果

- 主题过渡可随 `web-ui-theme` 复用，React/Vue demo 不再维护各自实现。
- 嵌套主题的过渡范围由组件边界决定，避免整页意外闪烁。
- 浏览器不支持时行为可预期：只有动效降级，状态更新语义不变。
