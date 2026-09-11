# web-ui 任务路由

这是 `packages/web-ui` 的 task-specific 路由，不是组件百科。实现细节、完整事件表和交互语义以源码、测试与对应 ADR 为准；简单 UI 修改不需要预先加载全部章节或全部 ADR。

## 权威来源

- Lit、Shadow DOM 和框架无关组件边界：[ADR-0005](../adr/0005-web-ui-component-architecture.md)。
- 公共组件契约、原生事件、表单行为、跨框架 API 约定和 ARIA 回写：[ADR-0005](../adr/0005-web-ui-component-architecture.md)；组件 README 是面向消费者的 API 说明。
- Overlay 交互/定位/内容迁移、布局层级、design token 和 @lit/context 组合模式：[ADR-0006](../adr/0006-web-ui-composition-rendering-architecture.md)。
- React/Vue 类型适配、`$events` 和复合控件事件边界：[ADR-0005](../adr/0005-web-ui-component-architecture.md)。
- 图标 manifest、生成器和导出：[ADR-0005](../adr/0005-web-ui-component-architecture.md)。

## 修改前路由

- **单个组件的属性、slot、事件、无障碍或表单行为**：先看该组件 README、源码和聚焦测试；只有契约或事件模型发生变化时才读 ADR-0005。
- **受管组合（select+option、segmented、radio-group、checkbox-group、button-group）**：成员追踪由 `GroupController` 驱动，禁用/展示态经 @lit/context 下行广播，选中态上行直写；修改下行通道先读 ADR-0006，不要绕开 `GroupController` 改手搓成员管理。
- **覆盖层内容迁移或消费者节点写入**：打开时 portal 迁移、关闭态隐藏（menu 族隐藏 slot）与消费者 light DOM 写入边界见 ADR-0006。
- **slot-trigger 组件的 ARIA**：popover/dropdown/collapse 的 trigger 状态回写遵守 ADR-0005；不要在 trigger 包装结构上承载 aria-expanded 等状态。
- **Overlay、portal、焦点、滚动锁定或层叠**：读 ADR-0006 中受影响的决策；涉及定位引擎归属或新浮层定位路径时再读 ADR-0006，不加载无关组件语义。
- **主题 token 或图标**：读 ADR-0006/0005 以及对应源码；`src/components/theme/style.css` 是 token 值的权威来源。
- **React/Vue 类型或事件**：读 ADR-0005 和对应的 `src/types/` 源码；不要新增运行时 framework wrapper 或全局 Vue 类型污染。
- **仅 CSS/视觉微调**：优先读取组件源码和相关 token；不因任务名称加载 overlay、框架适配或完整事件模型。

## 局部不可绕过约束

- 保持 Public Component Contract；公共 API 变更时同步 `README.md`、`README.CN.md` 和聚焦契约测试。
- Shadow DOM 样式留在组件内部；不要把组件样式注入 `document.head`。使用公共 `--wui-*` semantic token。
- 共享状态和行为沿用 `definePlugin` factory 的 `defineXxx(...).make(...)` 组合方式，不用继承承载共享状态。
- 组件或交互改动完成后，按影响范围运行聚焦测试，并按 [`browser-verification.md`](browser-verification.md) 在 React/Vue demo 集成表面进行真实浏览器验证。
- 框架动态绑定布尔属性必须使用 camelCase Property；不要在组件内引入 attribute 字符串解析兜底，保持原生 HTML 布尔存在语义（存在即 true）。
