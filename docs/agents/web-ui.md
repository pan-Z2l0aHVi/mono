# web-ui 任务路由

这是 `packages/web-ui` 的 task-specific 路由，不是组件百科。实现细节、完整事件表和交互语义以源码、测试与对应 ADR 为准；简单 UI 修改不需要预先加载全部章节或全部 ADR。

## 权威来源

- Lit、Shadow DOM 和框架无关组件边界：[ADR-0003](../adr/0003-web-component-strategy.md)。
- 公共组件契约、原生事件和表单行为：[ADR-0007](../adr/0007-web-ui-contract-convergence.md)；组件 README 是面向消费者的 API 说明。
- Overlay 关闭、焦点和滚动语义：[ADR-0005](../adr/0005-overlay-interaction-policy.md)；Portal 与层叠：[ADR-0006](../adr/0006-layout-layering.md)。
- Drawer 拖拽关闭手势、drag bar 与关闭态无渲染约束：[ADR-0035](../adr/0035-web-ui-drawer-drag-close.md)；非 headless Drawer 的浮动卡片视觉容器（留边、圆角、闭合补偿）：[ADR-0036](../adr/0036-web-ui-drawer-floating-card.md)；Nested Drawer 声明式层叠与自适应阶梯露边：[ADR-0037](../adr/0037-web-ui-nested-drawer-stacking.md)。
- Design token：[ADR-0010](../adr/0010-design-token-restructure.md)；图标 manifest、生成器和导出：[ADR-0008](../adr/0008-icon-system.md)。
- React/Vue 类型适配、`$events` 和复合控件事件边界：[ADR-0011](../adr/0011-framework-type-adaptation-narrowing.md)。
- 跨框架 API 约定（Property camelCase / Attribute kebab-case / Event kebab-case）与布尔 converter 兜底：[ADR-0033](../adr/0033-cross-framework-api-convention.md)；README「框架集成」章节是面向消费者的规范。
- Collapse 单组件形态（default slot trigger + `slot="content"`）、受管组合的下行通道迁移 @lit/context：[ADR-0040](../adr/0040-web-ui-collapse-single-element-and-lit-context.md)。
- 覆盖层内容迁移、menu 族关闭态隐藏与消费者节点写入边界：[ADR-0041](../adr/0041-web-ui-overlay-content-migration.md)。
- slot-trigger 组件的 trigger 状态 ARIA 回写约定（popover/dropdown/collapse）：[ADR-0042](../adr/0042-web-ui-trigger-aria-writeback.md)。
- 测试选择和 browser mode：[`testing.md`](testing.md)；真实浏览器验证：[`browser-verification.md`](browser-verification.md)。

## 修改前路由

- **单个组件的属性、slot、事件、无障碍或表单行为**：先看该组件 README、源码和聚焦测试；只有契约或事件模型发生变化时才读 ADR-0007。
- **受管组合（select+option、segmented、radio-group、checkbox-group、button-group）**：成员追踪由 `GroupController` 驱动，禁用/展示态经 @lit/context 下行广播，选中态上行直写；修改下行通道先读 ADR-0040，不要绕开 `GroupController` 改手搓成员管理。
- **覆盖层内容迁移或消费者节点写入**：打开时 portal 迁移、关闭态隐藏（menu 族隐藏 slot）与消费者 light DOM 写入边界见 ADR-0041。
- **slot-trigger 组件的 ARIA**：popover/dropdown/collapse 的 trigger 状态回写遵守 ADR-0042；不要在 trigger 包装结构上承载 aria-expanded 等状态。
- **Overlay、portal、焦点、滚动锁定或层叠**：读 ADR-0005/0006 中受影响的决策，不加载无关组件语义。
- **主题 token 或图标**：读 ADR-0010/0008 以及对应源码；`src/components/theme/style.css` 是 token 值的权威来源。
- **React/Vue 类型或事件**：读 ADR-0011 和对应的 `src/types/` 源码；不要新增运行时 framework wrapper 或全局 Vue 类型污染。
- **仅 CSS/视觉微调**：优先读取组件源码和相关 token；不因任务名称加载 overlay、框架适配或完整事件模型。

## 局部不可绕过约束

- 保持 Public Component Contract；公共 API 变更时同步 `README.md`、`README.CN.md` 和聚焦契约测试。
- Shadow DOM 样式留在组件内部；不要把组件样式注入 `document.head`。使用公共 `--wui-*` semantic token。
- 共享状态和行为沿用 `definePlugin` factory 的 `defineXxx(...).make(...)` 组合方式，不用继承承载共享状态。
- 组件或交互改动完成后，按影响范围运行聚焦测试，并按 [`browser-verification.md`](browser-verification.md) 在 React/Vue demo 集成表面进行真实浏览器验证。
- 框架动态绑定布尔属性必须使用 camelCase Property；不要在组件内引入 attribute 字符串解析兜底，保持原生 HTML 布尔存在语义（存在即 true）。
