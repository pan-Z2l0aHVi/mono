# web-ui 包指令

修改组件、主题 token、overlay、表单行为或框架类型封装前，先按 [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md) 路由到受影响的 ADR、源码和测试；不要为简单 UI 修改加载完整组件语义。

- `src/components/theme/style.css` 是 token 值的权威来源；复用共享 overlay 生命周期和 semantic token，不将组件样式注入 `document.head`。
- 共享状态和行为使用 `defineXxx(...).make(...)` 的 `definePlugin` factory；Lit、Shadow DOM、属性绑定和框架事件类型以对应 ADR 为准。
- browser-mode 测试覆盖无法由 jsdom 证明的原生行为；UI/UX/交互改动还必须按 browser-verification guide 做真实浏览器验证。
