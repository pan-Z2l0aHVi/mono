# ADR-0033: 跨框架 API 约定与框架调用方绑定约束

## 背景

`@greypan/web-ui` 是 Lit Web Components，同时被 React、Vue 与原生 HTML 消费。不同框架对 custom element 的属性绑定语义不同：

- **Vue** 把 kebab-case 属性名写成字符串 attribute（`shouldSetAsProp` 只在 `'key in el'` 为真时写 property）；
- **React 19** 对 custom element 的 camelCase props 直接写 DOM property；
- **原生 HTML** 的布尔 attribute 遵循「存在即 true」。

这导致同一个布尔属性在不同框架下表现不一致。尤其 `:sidebar-collapsed="false"` 这类多字 kebab-case 布尔绑定会被写成字符串 `"false"`，再被 Lit 的布尔 presence 语义误读为 `true`——`web-ui-layout` 的侧边栏折叠按钮因此失效。此前仓库缺少「如何跨框架传 prop」的权威规范，各 demo 的绑定形态靠「碰巧可用」维持。

## 决策

### 1. 三面 API 约定

`web-ui-*` 元素暴露三面 API，以 **DOM / JavaScript API 为事实来源**：

- **Property** 使用 camelCase：`open`、`sidebarCollapsed`、`noScrollLock`
- **Attribute** 使用 kebab-case：`open`、`sidebar-collapsed`、`no-scroll-lock`
- **Event** 使用 kebab-case：`open-change`、`sidebar-collapsed-change`

### 2. 布尔 Attribute 保持原生 HTML 存在语义

组件**不引入** attribute 字符串解析兜底（如 `"false"` → `false` 的 converter）。布尔 attribute 始终遵循
原生 HTML 语义：不存在 → `false`，存在（含空字符串）→ `true`。因此「存在即 true」是组件层的固定契约，
框架层必须用 Property 表达 `false`。

### 3. 框架调用方绑定约束

约束落在**框架调用方**（demo 与消费者），不改变组件运行时语义：

- **Vue**：动态布尔必须绑定 **Property**，使用 camelCase 属性名（`:sidebarCollapsed="x"`、`:open="x"`）。
  kebab-case 绑定（`:sidebar-collapsed="x"`）会写成字符串 attribute，无法表达 `false`。`.prop` 修饰符只在
  camelCase 名下有效（`:sidebarCollapsed.prop="x"`），kebab `.prop` 会写入一个无意义的同名属性。String/Number
  可保留 kebab-case attribute（`:max-height="120"`）。带值控件（`web-ui-input`、`web-ui-select`、
  `web-ui-autocomplete` 等）支持 `v-model`，编译为元素 `value` property + `input` 事件。
- **React**：React 19 对 custom element props 直接写 DOM property，使用 camelCase props（`open={open}`、
  `noScrollLock`）。**复杂数据（对象、数组）不得经 attribute 字符串传递**，一律绑定为 property；kebab-case
  JSX prop 在 custom element 上会写成 attribute。

### 4. 一致性收编

- 多字布尔 attribute 名统一为 kebab-case；框架动态绑定统一为 camelCase property。
- 带值控件的 `value` 统一 `reflect: true`（`input`/`textarea`/`slider`/`input-number`/`select`）。
- 受控 `checked`（`checkbox`/`radio`/`switch`）保持访问器 + 不 reflect 的既有契约（表单关联与 group 管理需要），与 `segmented-trigger checked`（reflect: true）的差异属有意设计，不强行统一。

## 后果

- README「框架集成」章节与 `docs/agents/web-ui.md` 成为跨框架绑定的权威规范。
- 组件运行时语义不变；框架动态布尔必须用 camelCase Property 绑定。
- 新增布尔 `@property` 遵循原生存在语义，不引入自定义 converter 或字符串解析兜底。
- demo 是规范的第一验证面：Vue demo 的布尔动态绑定全部为 camelCase property，React demo 全部为 camelCase props。

## 替代方案

- **组件层布尔 converter（`"false"`/`"0"` → false）**：会改变「存在即 true」的原生语义契约，且 Lit 不
  re-reflect 外部写入的 attribute 时仍会残留 attribute；维护成本高于收益，已否决。
- **库级运行时框架 wrapper**：与「单一 Lit 实现服务所有框架」冲突（ADR-0003），不采用。
