# web-ui 包指令

修改组件、主题 token、overlay、表单行为或框架类型封装前，请先阅读 [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md)。

- 保留文档中记录的公共组件契约：属性、默认值、事件、插槽、方法、无障碍语义和表单行为。
- 使用公共 `--wui-*` 语义 token。`src/components/theme/style.css` 中的值是权威来源；独立 fallback 必须与其 light theme 值匹配。
- 复用共享的 overlay 存在生命周期和语义层 token。不得将组件样式注入 `document.head`。
- 按交互模型选择共享 overlay 模块：锚定面板、坐标菜单或原生 dialog 模态框。不要在通用基类中混合它们的触发、焦点或关闭语义。
- 共享状态模块使用名为 `defineXxx` 的 `definePlugin` 工厂；组件通过 `defineXxx(...).make(...)` 创建实例。
- 使用原生 CSS nesting 组织组件后代状态，同时保持 `:host(...)` 选择器在顶层。
- 遵循 [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md)（Shadow DOM 和 Lit）中的 Lit 绑定约定：静态字面量和动态字符串使用普通属性，动态非字符串值使用 `.prop`，动态布尔值使用 `?prop`，显式 ARIA 字符串；永远不要使用 `:` 前缀绑定。
- 新增或更新聚焦公共契约的测试。浏览器原生行为使用 browser-mode 测试，UI 变更需执行[根目录 `AGENTS.md`](../../AGENTS.md)要求的浏览器验证。
- 公共组件 API 变更时，保持 `README.md` 和 `README.CN.md` 结构对齐。
- 将 custom-element 宿主视为公共属性边界。不要添加通用属性透传：`data-*` 留在宿主上；原生和 ARIA 属性仅通过文档化的、组件特定的映射到达 shadow 内部控件。原生交互事件通过浏览器组合穿越边界；状态 `*-change` 事件保留给用户发起的变更。
- `$events` 是公共类型契约：每个条目声明 `TYPE & { target: WebUiXxx }`（`Event`/`FocusEvent`/`CustomEvent<T>` 统一）。React 经 `LitReactWrapper` 直接获得类型化 `$event`/`currentTarget`；Vue 对原生 value 事件用权威 target cast（`$event.target as WebUiXxx`）、值收窄用值 cast；不要从全局 `ComponentCustomProps` 排除任何原生事件键。详情见 [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md)。
