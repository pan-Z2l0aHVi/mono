# web-ui 组件指南

在修改 `packages/web-ui` 前请阅读本指南。包级别的 `AGENTS.md` 包含简短的强制规则；本指南解释其背后的实现约定。

## 权威来源

- 主题颜色、层级和动效默认值：`packages/web-ui/src/components/theme/style.css`
- Overlay 定位和主题作用域：`packages/web-ui/src/shared/overlay/` 和 `packages/web-ui/src/shared/theme/`
- 共享 portal 菜单样式：`packages/web-ui/src/assets/menu-portal.css`
- 公共组件 API：`packages/web-ui/README.md` 和 `README.CN.md`

不要在指南中重复 token 值。独立组件使用的每个 `var(--wui-*, fallback)` 必须使用 `theme/style.css` 中等效的 light 主题值。

## 添加或修改组件

- 将新内置图标添加到 `packages/web-ui/icons.used.json`，然后运行 `pnpm --filter @greypan/web-ui generate-icons`。从 `@/icons` 导入生成的图标数据；不要添加运行时图标依赖。
- 在每个组件的模块中添加 `HTMLElementTagNameMap` 声明。组件 barrel 从该映射派生 `WebUiElementMap`；框架类型适配器使用它来暴露每个 `web-ui-*` 条目。
- 将属性、默认值、允许的值、slot、方法、事件、无障碍语义和表单行为视为公共契约。通过 `@/shared/normalize` 规范字面量和数字属性，使 JavaScript 调用者获得文档中描述的回退行为。
- 当公共契约发生变更时，同步更新 `README.md` 和 `README.CN.md`。两者的结构必须保持一致。

## 样式、层级和动效

- 优先使用语义化的 `--wui-*` 颜色、表面、阴影、层级和动效 token，而非字面量值。组件局部变量是实现细节，不是公共 API。
- `surface-glass` 用于透明控件；`surface-overlay` 用于可读的全局 overlay 面板。使用与控件所需视觉对比度匹配的提升表面层级。
- 保持粘性布局头部位于内容和侧边栏之上。非 portal 面板使用局部层级；portal 菜单使用菜单层级；Toast 位于菜单上方；原生 Dialog 和 Drawer 使用浏览器 top layer。BackTop 属于 portal 菜单下方的辅助层级。
- 高频按压交互使用按压 token；颜色和背景反馈使用反馈 token；Dropdown、ContextMenu 和 Select 使用菜单进出 token；通用锚定 overlay 使用 overlay 进出 token；Drawer 使用其抽屉 token。`motion="system"` 遵循 `prefers-reduced-motion`；`reduced` 在其主题作用域内禁用位移；嵌套的 `full` 作用域恢复普通 token。
- Overlay 可见性过渡必须复用 `shared/overlay/presence`；overlay 定位仍由 `defineOverlay` 负责。在 reduced motion 模式下，移除 transform 位移同时保留必要的短暂 opacity 或状态反馈。
- 将指针悬停交互放在 `@media (hover: hover) and (pointer: fine)` 内。

## Overlay 架构

- 共享 overlay 状态通过 `defineXxx(...): Plugin` 工厂定义，每个返回 `definePlugin(...)`；组件通过 `defineXxx(...).make(...)` 实例化，而非使用内部状态类。
- 对锚定到触发器的单个面板复用 `shared/overlay/anchored-panel`。组件保留其触发器、焦点、内容和关闭语义；共享模块负责 local/portal 挂载、定位和存在状态。
- `createOverlayPortal` 以 `display: contents` 挂载 portal 宿主，使 `:host` 规则泄漏到宿主的组件样式（如 `display: inline-block`）不会创建匿名行内盒从而膨胀主题 overlay 容器。修改 portal 挂载方式时保持此样式在宿主上。
- Dropdown 和 ContextMenu 使用 `shared/menu-portal`。它们的公共菜单树操作位于其中，而基于锚点与基于坐标的定位分别保留在各组件内部。
- Dialog 和 Drawer 等原生 `<dialog>` 模态框复用 `shared/overlay/native-dialog-presence`。原生 top layer、背景遮罩和 Escape 策略保留在拥有组件中。
- 通过 `createScrollLockLease()` 获取页面滚动锁定。在断开连接时释放租约；不要对实例未获取的锁调用全局解锁。

## Shadow DOM 和 Lit

- 每个组件样式表以通用的 `box-sizing: border-box` 后代选择器规则开头。
- 保持宿主样式仅限于布局、包含、光标和继承的 token 定义。渲染的视觉样式属于 Shadow DOM 内部，页面重置无法覆盖。
- 不要将全局 HTML 属性（如 `hidden`、`title` 或 `role`）用作组件特定的状态属性。显式映射声明式布尔属性。默认为 true 且必须接受框架提供的 `"false"` 字符串的布尔属性使用 `booleanWithFalseString` 并测试其属性路径。
- 使用 `classMap()` 处理多类状态，使用 `styleMap()` 或安全模板值处理样式，使用 Lit 的 `nothing` 表示缺失的条件内容。当 prop 和 slot 表达相同内容时，slot 优先，slot 变更必须更新依赖的布局状态。
- 根据值类型选择 attribute 还是 property 绑定：静态字面量写为普通属性（`size="18"`），动态字符串写为属性绑定（`attr=${str}`）；动态非字符串值（数字、对象、数组、函数）使用 `.prop` 绑定；动态布尔值使用 `?prop`。ARIA 值写为显式字符串（`aria-selected=${String(x)}`）。永远不要使用 `:` 前缀绑定：Lit 将 `:attr` 视为字面量属性名，因此值永远不会到达属性，声明的类型会被静默忽略。
- 使用顶层 `:host([attribute])` 选择器而非嵌套的宿主属性选择器。
- 优先使用原生 CSS 嵌套处理组件后代状态；当内边距需要随内容滚动时，将滚动视口和带内边距的内容保持为独立元素。
- 自定义元素宿主是公共属性边界。保持全局属性和 `data-*` 在宿主上；永远不要实现通用的 `$attrs` 风格复制到 Shadow DOM。仅当组件文档中声明了一对一的语义拥有者时才映射原生属性，仅当 ARIA 属性适合该拥有者的角色时才映射。不要接受任意的 `role`、状态 ARIA 或跨 Shadow DOM 的 IDREF 属性作为透传。

## 交互、生命周期和无障碍

- 禁用的组件在逻辑上阻止交互；不要使用 `pointer-events: none` 作为禁用机制，因为它会移除光标和 tooltip 行为。
- 全局监听器、portal 资源和滚动锁定只释放该实例获取的资源。在更新生命周期中创建全局资源前，检查元素是否仍然连接。
- 优先使用 Pointer Events 而非鼠标特定事件。对悬停触发的行为忽略触摸指针，对拖拽使用捕获加 `pointercancel`，对外部点击关闭使用 `click`。保留 `contextmenu` 和焦点事件的自身语义。
- 交互组件需要适当的角色和无障碍名称；使用 `:focus-visible`；将宿主 label 转发到原生 Shadow DOM 控件。模态对话框优先使用原生 `<dialog>`，并在关闭前等待其视觉退出。
- 表单关联控件使用 `ElementInternals`，同步表单值和禁用状态，仅对用户发起的变更发出组合冒泡的 `input` 然后 `change` 事件。框架特定的值变更事件名称不是公共 API。
- 让浏览器原生的组合事件在宿主上暴露主要交互；不要重新派发重复事件。状态 CustomEvents 使用 kebab-case，冒泡和组合，仅对用户发起的状态变更发出。仅在有文档记录的组件特定拦截需求时才添加可取消的 `before-*` 事件。

## 事件类型契约（$events）

每个组件通过 `declare readonly $events` 声明公共事件类型。`$events` 只声明事件本体（如 `input: Event`、`focus: FocusEvent`、`'open-change': CustomEvent<{ open: boolean }>`），不重复书写宿主 target —— 组件 barrel 的 `WebUiElementMap` 从各组件 `HTMLElementTagNameMap` 声明派生，框架类型适配器（`types/react.ts`、`types/vue.ts`）经 `WithHost` 统一把每个条目收窄为 `TYPE & { readonly target: WebUiXxx; readonly currentTarget: WebUiXxx }`。事件在宿主上重定向后 `event.target` 恒等于宿主元素，因此该收窄零例外；`WithHost` 注入的 target/currentTarget 标为 readonly，与 DOM `Event` 契约一致。

- **React**：标准 DOM 事件（input/change/focus/blur）使用 React 惯用 camelCase handler（`onInput`/`onChange`/`onFocus`/`onBlur`），保留对应 SyntheticEvent 类型，`currentTarget` 经 `HTMLAttributes<T>` 收窄到组件实例，无需 cast；`target` 遵循 React SyntheticEvent 语义（`EventTarget`），不承诺为组件实例。kebab-case 自定义事件生成精确的 `on<event>` 绑定（如 `onopen-change`），handler 参数携带 `CustomEvent<T> & { target: WebUiXxx; currentTarget: WebUiXxx }`。不再生成 lowercase `oninput`/`onchange` 别名。
- **Vue**：不再全局扩展 `ComponentCustomProps`。每个 `LitVueWrapper` 局部合并 `HTMLAttributes`，排除与该组件 emit 重名的 handler（如 emit `input` → 排除 `onInput`）后再加入精确 emit，因此 `@input`/`@change` 的 `$event.target` 直接是组件实例（`$event.target.value`），cast-free；`$event.detail` 保持 `CustomEvent` 的精确载荷。未声明对应 emit 的原生事件（如 checkbox/radio 的 `@focus`/`@blur`、无 `$events` 组件的 `@click`/`@keydown`）仍通过局部 `HTMLAttributes` 支持，且不影响其他 Vue 组件。Vue 3.5 的 element type 参数使模板 ref/$el 为具体 Custom Element 类型。
- **复合控件**：checkbox/radio/segmented-trigger 被对应 group 管理时，子控件自身仍向直接监听器派发 `input`/`change`，但事件 `bubbles: false, composed: false`，不会冒泡到 group 外；group 用 capture 相位监听子项 change，并只派发一次自己的 `input` 再 `change`，两者 `target`/`currentTarget` 均为 group。独立使用子控件时保持 `bubbles: true, composed: true`。因此 `WebUiEvent<Group, 'change'>` 与 Vue `$event.target` 的收窄承诺在 group 上也成立。
- 具名 handler 或无法从上下文推导 `$event` 的位置，显式标注 `WebUiEvent<WebUiXxx, 'change'>`（`WebUiEvent` 从包入口导出）。
- 无公共事件的组件不声明 `$events`（空的 `Record<string, never>` 无意义）。`web-ui-option` 的注册/更新事件是 select 的内部协议，不作为框架公共事件类型暴露。
- `WebUiElementMap` 是组件标签的单一权威来源：新增组件只需添加 `HTMLElementTagNameMap` 声明，React/Vue 的 `WebUiComponents` 经 mapped type 自动覆盖，勿手写组件清单。

## 测试

- 测试公共契约，而非私有字段、内部类或实现顺序。
- 默认 `*.spec.ts` 测试覆盖宿主属性、事件、反射、slot 和非浏览器 DOM 行为。`*.browser.spec.ts` 覆盖 ElementInternals、FormData、指针交互、焦点、portal 和原生 dialog。
- 使用 `@/shared/test-utils` 中的辅助工具。遵循 [`testing.md`](testing.md) 中的 browser mode 和 reduced-motion 指南。

## 浏览器验证

真实浏览器验证策略、dev server 约束与 fallback 链是全局规则，见根 `AGENTS.md` 的「浏览器验证」与 [`browser-verification.md`](browser-verification.md)，此处不重复。web-ui 组件变更以 `react-web-ui-demo` / `vue-web-ui-demo` 为验证表面（组件展示、交互、console/network）；自动化兜底为 `*.browser.spec.ts`（Vitest browser mode，见 [`testing.md`](testing.md)）。
