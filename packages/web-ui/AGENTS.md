# web-ui

修改组件、主题 token、overlay、表单行为或框架类型封装前，先确认受影响的契约面。只改局部 UI 时不必读完整组件语义。ADR 路由与权威来源索引见 [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md)。

- [`src/components/theme/style.css`](src/components/theme/style.css) 是 token 值的权威来源。复用共享 overlay 生命周期和 semantic token，不要把组件样式注入 `document.head`。
- 不承担框架运行时 wrapper 与全局应用样式。
- 共享状态和行为使用 `defineXxx(...).make(...)` 的 `definePlugin` factory。Lit、Shadow DOM、属性绑定和框架事件类型沿用既有模式。
- browser-mode 测试覆盖无法由 jsdom 证明的原生行为。UI、UX 和交互改动还必须在真实浏览器验证。
- 受管组合（select+option、segmented、radio-group、checkbox-group、button-group）的成员追踪、下行广播与上行写回统一走 `GroupController`，不要绕开它手搓成员管理。
- slot-trigger 组件（popover/dropdown/collapse）的 ARIA 状态（如 `aria-expanded`）不挂在 trigger 包装结构上，按 [ADR-0005](../../docs/adr/0005-web-ui-component-architecture.md) 回写。
- 框架动态绑定布尔属性必须用 camelCase Property；组件内不加 attribute 字符串解析兜底，保持原生 HTML 布尔存在语义。

## 公共契约变更清单

涉及属性、slot、event、form、导出、框架类型、token 或组件可见行为时，按实际影响检查：

- [`src/components/`](src/components/) 或 [`src/types/`](src/types/) 的实现与出口
- 包 README（[`README.md`](README.md) 与 [`README.CN.md`](README.CN.md)）中对应组件的章节
- 受影响的 ADR
- 聚焦测试和 browser-mode 测试
- React/Vue demo 的 type fixtures 与集成表面
- [`apps/interweave/frontend`](../../apps/interweave/frontend)（若被公共组件消费）
- package `exports`、Changeset 和 `agent:inspect-contract` 报告

不要机械同步全部项目，以 `agent:find-usages`、manifest、源码引用和测试确定实际影响。
