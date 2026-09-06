# Collapse / Accordion 组件 API 设计模式研究：Compound Components vs 单组件 Slots

> 针对 Lit + Shadow DOM web component 组件库（`packages/web-ui`）的 collapse 组件（ADR-0038）公开 API 设计模式调研。对比两种模式：**模式 A**（shadcn/Radix 式 compound components，根 + trigger + content 多元素）与**模式 B**（Element Plus 式单组件 + slots）。所有论断均追溯一手来源（官方文档、源码、spec、MDN BCD），来源以「源码事实」或「推断」标注。

---

## 1. 当前仓库实现（web-ui，ADR-0038）

当前实现选择了**模式 A：三元素 compound 组件族**，与 segmented/segmented-trigger 先例对齐（ADR-0038 第 3 节）。

用法（`apps/react-web-ui-demo/src/components/collapse-demo/index.tsx`）：

```html
<web-ui-collapse open="{...}">
  <web-ui-collapse-trigger>…</web-ui-collapse-trigger>
  <web-ui-collapse-content keep-mounted>…</web-ui-collapse-content>
</web-ui-collapse>
```

具体机制（均为源码事实）：

| 关注点   | 实现                                                                                                                                                                                                                                                                                                                                                                                                    | 来源                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 状态位置 | 全部在根元素 `web-ui-collapse` 上：`open` / `disabled` / `horizontal` 均 `@property({type: Boolean, reflect: true})`，`open` 是唯一状态源（严格受控，无内部 fallback state）                                                                                                                                                                                                                            | `packages/web-ui/src/components/collapse/index.ts:32-38`                                        |
| 父子通信 | **不走 slot/事件，走 light DOM 查询 + 直推 context**：根用 `querySelectorAll('web-ui-collapse-trigger/content')` + `closest('web-ui-collapse') === this` 过滤归属，经 `defineGroupPresentation` 把只读 context 直接安装到子元素的 symbol 通道（`installGroupContext`），子元素用 `defineGroupManaged` 接收并 `requestUpdate`。`GroupController` 用 MutationObserver + slotchange 在子元素增删时重新同步 | `collapse/index.ts:42-61`、`packages/web-ui/src/shared/group-management/index.ts:64-78,278-309` |
| 点击处理 | trigger 内部真实 `<button>` 的 click 经 composed path 冒泡到根，根用 `event.composedPath().find(node => node instanceof WebUiCollapseTrigger)` + `closest` 归属识别后统一 `toggle()`；trigger 自身无业务逻辑                                                                                                                                                                                            | `collapse/index.ts:116-124`                                                                     |
| 事件     | `open-change`（`CustomEvent<{open: boolean}>`，`bubbles + composed`），**仅用户来源**（`UserChangeController` 标记）；程序化写入与 `show()/close()/toggle()` 不发音——与 dialog/drawer/popover 契约一致（ADR-0007）                                                                                                                                                                                      | `collapse/index.ts:110-134`、`shared/events/user-change.ts`                                     |
| a11y     | trigger shadow 内渲染原生 `<button type="button">`，`aria-expanded` / `aria-controls`（指向第一个 content 自动生成的 id）/ `?disabled` 全部设在真按钮上；`font: inherit` 继承消费者排版（disclosure 惯例，非 `--wui-font-size`）                                                                                                                                                                        | `collapse-trigger/index.ts:34-44`                                                               |
| 动画     | CSS Grid `0fr ↔ 1fr` 过渡（track + inner 结构），零 JS 测量；水平时切 `grid-template-columns`；reduced motion 由 token 清零 + `getTransitionDuration` 读 computed duration 直落稳态；`transitionend` 失效有 duration + 80ms 兜底定时器；代际计数（`_generation`）丢弃过期管线                                                                                                                           | `collapse-content/index.ts:118-201`、`collapse-content/style.css:30-68`、ADR-0038 第 1 节       |
| 关闭稳态 | 三态：默认宿主 `hidden`（display:none）；`keep-mounted` 时内部 `inert`（保留在 0fr 轨道内，滚动位置与布局可测量）；动画中 `inert` + `pointer-events: none`。消费者 light DOM 永不移动/卸载                                                                                                                                                                                                              | `collapse-content/index.ts:95-114`、ADR-0038 第 2 节                                            |
| 嵌套     | 支持嵌套 collapse：`closest` 过滤保证内层子元素归属内层根；内层 `open-change` 会冒泡穿过外层根，消费者按 `event.target` 区分                                                                                                                                                                                                                                                                            | `collapse.spec.ts:186-215`、ADR-0038「后果」                                                    |
| token    | `--wui-duration-collapse-enter: 200ms` / `--wui-duration-collapse-exit: 160ms`，已加入 reduced-motion 清零列表                                                                                                                                                                                                                                                                                          | `packages/web-ui/src/components/theme/style.css:37-38,58-59,76-77`                              |

### 库内一致性（源码事实）

web-ui 现有组件有两种 slot 惯例，collapse 的选型处在两者交汇点：

- **覆盖层组件用具名 slot**（模式 B 风格）：`popover` 用 `slot="trigger"` + 默认 slot（`popover/index.ts:337,348`，面板 DOM 由组件 portal 移动）；`dialog` 用 `slot="title"/"body"/"footer"`（`dialog/index.ts:143-148`）；`drawer` 用 `slot="header"/"footer"`（`drawer/index.ts:605-617`）；`tooltip` 会把 `[slot="content"]` 节点 move 进 portal（`tooltip/index.ts:210`）。这些场景的共同点是**面板脱离文档流**（portal/floating），内容归属由组件托管。
- **受管子元素组合用独立 custom element**：`select` + `option`（option 在 `connectedCallback` 派发 `option-register` 向根注册，`option/index.ts:20-37`）、`segmented` + `segmented-trigger`、`radio-group` + `radio`、`checkbox-group` + `checkbox`、`button-group`——后四者与 collapse 共用 `defineGroupPresentation`/`defineGroupCoordinator` 基础设施。
- collapse 的内容是**文档流内**的消费者布局（ADR-0038 背景节），不需要 portal，因此选择了与文档流内组合一致的第二种惯例。

---

## 2. 模式 A 代表：Radix UI Collapsible / shadcn/ui

### Radix（源码事实，`packages/react/collapsible/src/collapsible.tsx`）

- **为什么拆三个组件**：Root 持有状态并通过 React Context（`createContextScope`，第 20/30 行）向 Trigger/Content 分发 `{ contentId, disabled, open, onOpenToggle }`（第 24-26 行）。Trigger 是 `Primitive.button type="button"`，从 context 读 `aria-expanded` / `aria-controls`，`onClick` compose `context.onOpenToggle`（第 100-106 行）。
- **Content 隐藏机制**：`Presence` 组件包装（第 136 行）控制挂载/卸载，`forceMount` 可强制常驻（配合 `data-state` 供 CSS 动画）；关闭稳态是 `hidden={!isOpen}`（第 213 行）——React 下「卸载 children」是安全操作（`{isOpen && children}`，第 221 行），这正是 web component 做不到的（消费者 light DOM 不能由组件移除，见 ADR-0038 背景节第 2 点）。
- **动画**：JS 测量。`useLayoutEffect` 中把 `transitionDuration='0s'` 阻断过渡、读 `getBoundingClientRect` 得到目标 height/width（第 183-189 行），以 CSS 变量 `--radix-collapsible-content-height/width` 暴露（第 217-218 行），由消费者在 keyframes 里引用（官方文档「Animating content size」示例）。文档 API Reference 同时列出 `data-state`、`data-disabled`、`forceMount` 与这两个 CSS 变量（https://www.radix-ui.com/primitives/docs/components/collapsible）。
- **Accordion 复用 Collapsible**：`packages/react/accordion/src/accordion.tsx:8-9` 直接 `import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'` 并以 `createCollapsibleScope` 组合——compound 拆分使上游模式可被下游模式整体复用（推断：这是该设计在 React 生态被广泛模仿的主因之一）。
- **a11y**：文档声明遵循 Disclosure pattern，Space/Enter 开合；`aria-expanded`/`aria-controls` 在 Trigger 的真 `<button>` 上。

### shadcn/ui（源码事实）

shadcn 是 Radix 的纯 re-export 薄封装：`apps/v4/registry/new-york-v4/ui/collapsible.tsx`（33 行）只做 `function Collapsible(...) { return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} /> }` 三连，`radix`/`base`/`aria` 三个 base 的 wrapper 内容相同（`apps/v4/registry/bases/radix/ui/collapsible.tsx`）。文档（`apps/v4/content/docs/components/radix/collapsible.mdx`）的 Composition 一节明确 `Collapsible ├─ CollapsibleTrigger └─ CollapsibleContent`，API Reference 直接指向 Radix 文档。shadcn 侧无自有状态/动画逻辑。

---

## 3. 模式 B 代表：Element Plus（实际是根 + item，trigger 内置）

用户所述「Element Plus 式：单组件 + trigger slot + content slot」与其真实结构有出入（源码事实，element-plus 主分支，2026-08-29 核实）：

- **两组件而非单组件**：`el-collapse` 根模板就是一个 `<div><slot /></div>`（`packages/components/collapse/src/collapse.vue:1-3`）；trigger（header）与内容区都内置于 `el-collapse-item`（`collapse-item.vue:1-32`）。真正暴露的定制点是 item 的 `title` slot（带 `is-active` 作用域参数）与 `icon` slot（默认 ArrowRight 图标），不存在独立的 trigger/content 子组件或 slot。
- **状态与通信**：根组件 `use-collapse.ts` 以 `activeNames = ref(ensureArray(props.modelValue))` 为唯一状态源（第 25 行），`accordion` 为真时单开（第 35-36 行），`provide(collapseContextKey, ...)` 分发上下文（第 90 行）；item 侧 `use-collapse-item.ts:7` `inject(collapseContextKey)`，`isActive` 按 `name` 是否在 `activeNames` 中判定，`name` 缺省自动生成。与 Radix Context、web-ui 直推 context 属同一「根持状态、子读 context」家族，只是机制分别是 Vue provide/inject、React Context 与 symbol 通道直推。
- **trigger 不是真 button**：item header 是 `div role="button"`，`aria-expanded` / `aria-controls` / `aria-describedby` / `tabindex` / `aria-disabled` 全部手写在 div 上，Space/Enter 激活靠 `@keydown.space.enter.stop` 手写补齐——对比 Radix / web-ui / Spectrum / FAST / Vaadin 直接用原生 button，多出一层需要自己维护正确的语义。
- **动画是 JS 测量**：`el-collapse-transition` 在 `before-enter` 设 `max-height: 0`，`enter` 中 rAF 读 `scrollHeight` 写 `max-height: Npx`，`after-enter` 清除——与 Radix（CSS 变量 + 消费者 keyframes）、web-ui（grid `0fr↔1fr`）都是不同路线；`max-height` 路线必须精确测量或猜测上限，天然依赖 JS（推断）。

小结：Element Plus 的真实形态是「根 + item」手风琴，与 wa-accordion / sp-accordion / fluent-accordion 同构；与用户描述「单组件 + trigger/content slot」最接近的其实是 `wa-details` / `vaadin-details` 这类单元素 disclosure（见第 4 节）。

---

## 4. 主流 Web Component 库的结构谱系（源码事实，2026-08-29 一手核实）

### Web Awesome（shoelace-style/webawesome，next 分支）

- **`wa-details`（单元素 disclosure）**：slots 为默认内容、`summary`、expand/collapse-icon；`open` reflect；内部包裹真 `<details>` 元素同步状态。动画为 JS `animate()` keyframes `height: 0 → scrollHeight px`（`src/components/details/details.ts:215-233`），稳态写 `body.style.height = 'auto' | '0'`。多个 details 的 `name` 相同即互斥，实现手风琴。
- **`wa-accordion` + `wa-accordion-item`（根 + item）**：item 有 `label` slot、`icon` slot 与默认内容 slot；`expanded` / `disabled` / `heading-level` reflect 在 item。

### Vaadin（vaadin/web-components）

- **`vaadin-details`（单元素 disclosure）**：`slot="summary"` 指向 `vaadin-details-summary`（基于 ButtonMixin，渲染真 native button）+ 默认内容 slot；`opened` 在宿主（`packages/details/src/vaadin-collapsible-mixin.js:19`），内容区 aria-hidden 切换（第 85 行）。

### Adobe Spectrum（@spectrum-web-components v1.12.2）

- **`sp-accordion` + `sp-accordion-item`（根 + item）**：item 只有默认内容 slot，标题是 `label` property（纯文本）；内部为 `h2-h6#heading > button#header`（真 button，带 `aria-expanded` / `aria-controls`）+ `div#content role="region" aria-labelledby="header"`；`open` reflect 在 item。

### Microsoft FAST（@microsoft/fast-foundation 2.50.0）

- **`fluent-accordion` + `fluent-accordion-item`（根 + item）**：item slots 为 `start`、`end`、`heading`、默认内容、`expanded-icon`、`collapsed-icon`；`expanded` 在 item；内部为 `div role="heading" aria-level` + 真 `button`（`aria-controls` 指向 `${id}-panel`）+ `region`；根以 `expandmode` 区分 single/multi。

### Material Web（@material/web 2.5.0）

- **没有 accordion / collapse 组件**：npm tarball 的 `custom-elements.json` 全量 tagname 与 main 分支源码树均无 accordion 路径；issue 检索仅一条无关记录。`labs/item` 是通用列表项 `md-item`（slots：container / start / overline / headline / supporting-text / trailing-supporting-text / end），不是折叠组件。

### 谱系小结

| 库 / 组件               | 结构                   | trigger 形态                           | 标题定制                               |
| ----------------------- | ---------------------- | -------------------------------------- | -------------------------------------- |
| wa-details              | 单元素                 | 内部真 `<details>` 包住 summary slot   | `summary` slot（富内容）               |
| vaadin-details          | 单元素                 | summary 子元素 → ButtonMixin 真 button | `summary` slot（富内容）               |
| wa-accordion            | 根 + item              | item 内置                              | `label` slot（富内容）                 |
| sp-accordion            | 根 + item              | item 内置真 button                     | `label` property（纯文本）             |
| fluent-accordion        | 根 + item              | item 内置真 button                     | `heading` slot（富内容）               |
| el-collapse             | 根 + item              | item 内置 div role="button"            | `title` slot（富内容）                 |
| Radix / shadcn（React） | 根 + trigger + content | trigger 是真 button                    | trigger children（任意 ReactNode）     |
| web-ui collapse（当前） | 根 + trigger + content | trigger 内真 button                    | trigger children（light DOM 任意内容） |

两种主流形态一目了然：**单元素 disclosure**（wa-details / vaadin-details）或**根 + item**（其余全部 accordion），且无一例外把 trigger 做在组件内部。**没有一家 web component 库做 Radix 式「根 + trigger + content」三元素拆分**。

---

## 5. 原生 `<details>` 新特性与浏览器 floor（MDN BCD，2026-08-29 查询）

| 特性                               | Chrome / Edge        | Firefox            | Safari                    | 意义                            |
| ---------------------------------- | -------------------- | ------------------ | ------------------------- | ------------------------------- |
| `::details-content`                | 131+                 | 143+（2025-09 起） | 18.4+（不支持链式伪元素） | 纯 CSS 选择/动画 details 内容区 |
| `interpolate-size: allow-keywords` | 129+（experimental） | 未支持             | 未支持                    | 让 `height: auto` 参与过渡      |

仓库 browserslist floor 为 Chrome 111 / Safari 16.4 / Firefox 128，两者均晚于 floor。这意味着在 floor 约束下：

- `interpolate-size` 不可用，「以原生 `<details>` 为基座 + 伪元素做纯 CSS 动画」的捷径在可预见期内不成立；
- grid `0fr↔1fr`（当前实现）仍是唯一纯 CSS 的 height:auto 动画方案，印证 ADR-0038 第 1 节的选型。

---

## 6. 模式对比：三元素 compound vs 单元素 slots（Lit + Shadow DOM 语境）

综合第 1-5 节，对 web-ui 有意义的候选其实是三种形态：模式 A（三元素 compound，当前实现）、模式 B′（单元素 + summary slot，wa-details 式——即用户「模式 B」描述的真实对应物）、以及根 + item（accordion 形态，Element Plus / wa-accordion 等）。

### 模式 A（三元素 compound）在 Lit 下的结构性优势

1. **trigger a11y 完全可控**：trigger 是独立元素，shadow 内渲染真 `<button type="button">`，`aria-expanded` / `aria-controls` / `?disabled` 原生生效（源码事实）。Spectrum、FAST、vaadin-details-summary 同路线；反例是 Element Plus 的 `div role="button"` + 手写键盘事件。
2. **嵌套归属可用 `closest` 一行表达**：`closest('web-ui-collapse') === this` 判定子元素归属，嵌套 collapse 天然正确（源码事实，`collapse.spec.ts:186-215`）。
3. **三态关闭稳态有自然落点**：默认宿主 `hidden`、`keep-mounted` 内部 `inert`、动画中 `inert`，都建立在 content 是独立元素、消费者 light DOM 不被移动/卸载的前提上（源码事实）。React 下等价语义靠卸载 children（Radix `Presence`），web component 卸载不了消费者节点，只能用 hidden/inert——独立 content 元素正是承载这套语义的位置。
4. **与库内基建同轨**：与 segmented / radio-group / checkbox-group 共用 `defineGroupPresentation` / GroupController（源码事实）；未来 accordion 可整体复用根与基建，每个 panel 仍是 collapse 族——与 Radix 用 Collapsible 组合出 Accordion 的复用路径同构。

### 模式 B′（单元素 + slots）的优势

1. **每面板一个标签**：`<wa-details><span slot="summary">…</span>内容</wa-details>`，用法最轻。
2. **trigger 即 slot 内容**，排版自由，心智模型贴近原生 `<details>`。
3. **真 button 与单元素不冲突**：wa-details 内部真 `<details>` 包住 summary slot、vaadin-details-summary 基于 ButtonMixin，证明单元素路线同样能保住原生 button a11y（源码事实）。

### 模式 B′ 在当前仓库的具体代价（推断，基于第 1、4 节事实）

- trigger 需由组件内部包进真 button（wa-details 路线），点击识别、id 关联、disabled 传播全部改为组件代管；`open-change` 仅用户来源的契约（`UserChangeController`）要重新落到内部 click path。
- 与库内受管子元素惯例（select+option、segmented 等）不一致，`defineGroupPresentation` / GroupController 无法直接复用，未来 accordion 需另起炉灶。
- 失去独立 content 元素后，三态关闭稳态与 `keep-mounted` 语义要在单元素内部重新设计。

---

## 7. 结论

1. **「Element Plus 式」的前提需要修正**：Element Plus 实际是根 + item 两组件、trigger 内置在 item，不是「单组件 + trigger/content slot」；真正符合该描述的先行者是 wa-details / vaadin-details 单元素 disclosure。
2. **web component 生态没有一家做 Radix 式三元素拆分**。主流只有单元素 disclosure 与根 + item 两种形态；三元素拆分是 React 生态特有，其成立依赖 Context 分发与「安全卸载 children」——后者恰是 web component 做不到的（消费者 light DOM 不能由组件移除，ADR-0038 背景节第 2 点）。三元素拆分并非不可行（当前实现即是证明），但它不是任何 web component 库验证过的路线。
3. **模式 A 在 Lit 下有结构性优势**：真 button a11y 完全可控、`closest` 嵌套归属、三态 hidden/inert、与 GroupController 基建同轨；模式 B′ 的优势是标签更少、用法更轻，且单元素也能做对 a11y。两条路线能力上限相近，差异主要在结构惯性与基建复用。
4. **当前实现已完成（测试 / demo / ADR 齐全），推翻重写的成本收益不成立**。合理演进是按 ADR-0038 预留增加 accordion：根与 GroupController 复用，每个 panel 仍是 collapse 族元素——与 Radix Collapsible→Accordion 的复用路径同构，也与 wa-accordion / sp-accordion / fluent-accordion 的根 + item 形态收敛。
