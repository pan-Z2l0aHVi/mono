# ADR-0005: Web UI 组件架构

- **Date**: 2026-07-21
- **Status**: 已接受

## 1. 技术选型：Lit + Shadow DOM

`@greypan/web-ui` 将组件构建为**带有 Shadow DOM 的 Lit 自定义元素**。

组件内部样式位于 shadow root，`:host` 定义宿主所需的样式。外部 CSS 可作用于宿主，但不能直接选择 shadow root 内部节点。单一 custom element 实现可供不同框架使用。

## 2. 公共 API 约定

### 2.1 三面 API

`web-ui-*` 元素暴露三面 API，以 **DOM / JavaScript API 为事实来源**：

- **Property** 使用 camelCase：`open`、`sidebarCollapsed`、`noScrollLock`
- **Attribute** 使用 kebab-case：`open`、`sidebar-collapsed`、`no-scroll-lock`
- **Event** 使用 kebab-case：`open-change`、`sidebar-collapsed-change`

### 2.2 布尔 Attribute 原生语义

组件**不引入** attribute 字符串解析兜底（如 `"false"` → `false` 的 converter）。布尔 attribute 始终遵循原生 HTML 语义：不存在 → `false`，存在（含空字符串）→ `true`。框架层必须用 Property 表达 `false`。

### 2.3 框架调用方绑定约束

- **Vue**：动态布尔必须绑定 **Property**（camelCase 属性名 `:sidebarCollapsed="x"`）。带值控件支持 `v-model`。
- **React**：React 19 对 custom element props 直接写 DOM property，使用 camelCase props。复杂数据一律绑定为 property。

### 2.4 统一事件模型

| 组件类型 | 事件               | 说明                             |
| -------- | ------------------ | -------------------------------- |
| 值类控件 | `input` + `change` | 用户交互触发；直接设属性不派发   |
| 开闭组件 | `open-change`      | `CustomEvent<{ open: boolean }>` |
| 通知     | `toast-close`      | `CustomEvent<{ id; reason }>`    |

- 统一使用 Pointer Events：`pointerenter`/`pointerleave`/`pointerdown`，拖拽场景使用 `setPointerCapture`
- 复合控件中 group 管理的子项事件以 `bubbles: false, composed: false` 派发；group 只派发一次自己的 `input` 再 `change`

### 2.5 原生表单关联

需要参与原生表单的组件通过共享 form-association mixin 和 `ElementInternals` 接入表单。具体组件和行为以实现及浏览器测试为准。

### 2.6 slot-trigger ARIA 回写

slot-trigger 组件（popover、dropdown、collapse、context-menu）把 `aria-expanded` / `aria-controls` / `aria-haspopup` 回写到 trigger slot 的首个 assigned element。组件不做 `role="button"` 补齐——trigger 由消费者提供交互语义。collapse 例外地不回写 `aria-controls`：它的目标 track 在组件自己的 shadow root 内，跨 shadow root 的 IDREF 无法解析，写出去等同悬空引用，展开关系只由 `aria-expanded` 表达。

## 3. 框架类型适配

### 3.1 `WebUiElementMap` 单一权威来源

组件 barrel 从各组件 `declare global { interface HTMLElementTagNameMap }` 派生并导出。React/Vue 的 `WebUiComponents` 通过 mapped type 生成全部 tag。新增组件只需添加 `HTMLElementTagNameMap` 声明。

### 3.2 事件分层

组件 `$events` 只声明事件本体；宿主 target 注入由适配层 `WithHost` 统一收窄。标准 DOM 事件在 React 中使用 camelCase handler；kebab-case 自定义事件仅生成精确的 `onopen-change` 等绑定。

### 3.3 Vue 适配

每个 `LitVueWrapper` 局部合并 `HTMLAttributes` 并排除与 emit 重名的 handler。使用 Vue 3.5 element 类型参数声明实际 Custom Element host。

### 3.4 框架版本基线

`@types/react` peer `>=19`，`vue` peer `>=3.5`。

## 4. Icon 系统

在构建时从 Iconify JSON 包生成带类型的 icon 数据模块。

- `packages/web-ui/icons.used.json` 是内置 icon 的清单文件
- `pnpm --filter @greypan/web-ui generate-icons` 在 `src/icons/generated/` 下为每个 icon 生成一个模块
- Vite 构建自动运行生成流程，生成文件不可手动编辑
- icon 是带类型的、可 Tree Shaking 的模块，无运行时查找依赖
- `iconify-icon` 不是 `web-ui` 的运行时依赖

## 5. 契约验证

公共 API 和框架适配由契约测试验证；依赖真实浏览器的焦点、键盘、pointer 与 overlay 行为使用浏览器测试。具体用例和测试范围以测试代码与仓库验证指南为准。

## 后果

- 单一 Lit 实现服务所有框架；不引入运行时 wrapper、Custom Elements Manifest 或 codegen
- 新增组件只需维护 `HTMLElementTagNameMap` 声明；适配层自动覆盖
- 框架动态布尔必须用 camelCase Property 绑定
- 新增布尔 `@property` 遵循原生存在语义，不引入自定义 converter
- icon 是带类型的、可 Tree Shaking 的模块
