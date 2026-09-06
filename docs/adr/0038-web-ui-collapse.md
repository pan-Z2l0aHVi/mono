# ADR-0038: Web UI Collapse 组件族

> **状态（2026-08-30）**：本文档的三元素家族结构（第 3 节）与 trigger 实现（第 4 节）已被 [ADR-0040](0040-web-ui-collapse-single-element-and-lit-context.md) 的单组件 + slots 方案取代；动画选型（第 1 节）与三态关闭语义（第 2 节）仍有效并由 ADR-0040 继承。collapse 组件在首次发布前完成重构，无发布兼容成本。

## 背景

组件库缺少折叠面板（Collapse / Disclosure）能力。与 Dialog/Drawer/Popover 等覆盖层组件不同，Collapse 是**文档流内**的展开收起组件：无 portal、无滚动锁定、无焦点管理、无 Escape/outside-click 语义（ADR-0005/0007 的 overlay 交互策略不适用）。

需要回答的核心技术问题：

1. **高度动画如何实现**：仓库没有任何组件 transition 过 `height` 类属性（全库无 grid-template-rows / max-height / interpolate-size 使用），无可复用先例。
2. **关闭态内容放哪里**：overlay 组件的面板常驻 shadow DOM 只切 `hidden`，而 collapse 的内容是消费者编写的 light DOM，组件无法像 React 那样安全地"卸载/重建"它。

## 决策

### 1. 动画：CSS Grid `0fr ↔ 1fr` 过渡（否决 JS 测量）

内部 track 结构：

```
.wui-collapse-track    display:grid; grid-template-rows: 0fr ↔ 1fr; transition
└── .wui-collapse-inner    overflow:hidden; min-height:0
    └── <slot>（消费者 light DOM）
```

- `0fr ↔ 1fr` 过渡在 Chrome 107 / Safari 16 / Firefox 66 起原生支持，均不高于仓库 floor 的任一浏览器（Chrome 111 / Safari 16.4 / Firefox 128），即 floor 浏览器全部可用，零 feature detection；内容高度自适应、零 JS 测量、中断可逆（从当前插值自然续接）；
- inner 的 `min-height: 0`（水平时 `min-width: 0`）是轨道能收缩到 0 的必要条件；`overflow: hidden` 裁剪收起中的内容；
- **否决 base-ui 式 JS 测量**（open 时测 `scrollHeight` 写 inline height）：其复杂度主要来自支持消费者自定义 keyframes 动画——本组件不需要；测量方案还有测量时序、SSR 闪烁、内容动态变化重测等长尾问题。

**水平方向的特例**：块级 grid 默认撑满可用宽度，`1fr` 列会解析为剩余空间而非内容宽度。处理：`data-horizontal` 时宿主 `display: inline-block`（不撑满父宽）、track `width: max-content`（1fr 列按内容贡献解析）。

**已知限制（有意接受）**：水平动画期间内容随宽度 reflow 换行。JS 测量方案可通过固定宽度规避，但 grid 方案换取零测量，代价可接受（记录于 README）。

**时长 token**：新增全局 `--wui-duration-collapse-enter: 200ms` / `--wui-duration-collapse-exit: 160ms`（对齐 `duration-{component}-{enter|exit}` 命名模式），按 ADR-0010 要求加入 reduced-motion 清零列表与双语文档。过渡收尾沿用 `getTransitionDuration` 读 computed duration 的模式：duration 为 0（reduced motion）直接落稳态，`transitionend` 不触发时按时长 + 80ms 兜底。

### 2. 关闭稳态：三态 hidden 语义（消费者 DOM 永不移动）

组件**从不**移动/卸载消费者的 light DOM（仓库首个遵守此约束的展开类组件；React/Vue 管理的子树被外部 remove 有集成风险）。关闭稳态由 `keep-mounted` 属性选择：

| 状态       | `keep-mounted=false`（默认）                        | `keep-mounted=true`                                                |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| 打开       | 正常布局                                            | 正常布局                                                           |
| 收起动画中 | 内部 `inert`（防焦点落入收起区域）                  | 内部 `inert`                                                       |
| 关闭稳态   | 宿主 `hidden`（display:none，脱离渲染与可访问性树） | 宿主可见性保留，内部 `inert`（0fr 裁剪，保留滚动位置、布局可测量） |

`inert` 自 Chrome 102 / Safari 15.5 / Firefox 112 起支持，仓库 floor（Chrome 111 / Safari 16.4 / Firefox 128）全部覆盖。

### 3. 家族结构：根 + trigger + content 三元素

- 标签：`web-ui-collapse` / `web-ui-collapse-trigger` / `web-ui-collapse-content`（多目录对齐 segmented/segmented-trigger 先例）；
- 关联：`GroupController` + `defineGroupPresentation` 按最近的根元素归属推送只读 context（`closest('web-ui-collapse')` 过滤保证嵌套时子元素归属内层根）；
- **严格受控**：`open` 是唯一状态源（reflect），`open-change` detail 仅 `{ open: boolean }` 且仅用户来源（trigger 点击走 `UserChangeController`），程序化写入与 `show()/close()/toggle()` 不发音——与 dialog/drawer/popover 契约一致（ADR-0007）；
- 无 `default-open`：初始 `open` attribute 直接落稳态不播动画（popover 先例）。

### 4. Trigger：内部真实 `<button>` 包裹 slot

`web-ui-collapse-trigger` 的 shadow 内渲染原生 `<button><slot></slot></button>`：

- Enter/Space 激活、焦点、disabled 语义全部原生，`aria-expanded` / `aria-controls` / `aria-disabled` 集中设在真按钮上（对齐 base-ui；popover 把 aria 设在内部包裹 div 是已知弱 a11y，不复制）；
- **字号有意 `font: inherit` 而非 `--wui-font-size`**：collapse trigger 是 disclosure 模式，常嵌在标题、列表项等消费者排版结构内，触发器应继承周围字号（`<details><summary>` 原生语义同款）；这与 button/segmented 等"独立控件统一 token"的约定是两条规则——前者文档流内、后者独立控件。
- 点击由**根元素**经 composed path 识别 trigger 归属后统一处理（`instanceof WebUiCollapseTrigger` + `closest` 过滤），trigger 自身无业务逻辑；
- `disabled` 设在根元素、trigger 从 context 读取，不提供 trigger 级覆写（保持 API 面最小）。

**已知限制**：slot 内放交互元素会形成嵌套 button（HTML 不合法），README 约定建议非交互内容，不做运行时强制。

### 5. 方向：boolean `horizontal`（默认垂直）

沿用 slider 的 boolean 反射属性风格（`@property({type: Boolean, reflect: true})`），命名取"切换轴"：默认 false = 垂直高度动画，`horizontal` = 水平宽度动画。不用 `direction` 枚举（button-group 先例）：枚举与 boolean 各有先例，取与"折叠默认垂直"的领域惯例兼容的 boolean 形态。

## 后果

- 仓库首例 height/grid 轨道过渡组件；后续 disclosure/accordion 类组件（多 panel 手风琴）可复用该 track 结构与三态关闭语义。
- `open-change` 事件会从嵌套内层冒泡穿过外层根（bubbles + composed 契约），消费者按 `event.target` 区分。
- 不提供 `hiddenUntilFound`：Safari/ Firefox floor 版本不支持（等价普通 hidden），base-ui 场景依赖 find-in-page 的收益在 floor 上不成立；待基线提升后随 `beforematch` 一并评估。
- 无 overlay 交互（Escape/outside-click/focus 管理/scroll lock）——文档流组件不适用 ADR-0005。
