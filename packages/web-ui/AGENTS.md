# web-ui 包指令

修改组件、主题 token、overlay、表单行为或框架类型封装前，先按 [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md) 路由到受影响的 ADR、源码和测试；不要为简单 UI 修改加载完整组件语义。

- `src/components/theme/style.css` 是 token 值的权威来源；复用共享 overlay 生命周期和 semantic token，不将组件样式注入 `document.head`。
- 共享状态和行为使用 `defineXxx(...).make(...)` 的 `definePlugin` factory；Lit、Shadow DOM、属性绑定和框架事件类型以对应 ADR 为准。
- browser-mode 测试覆盖无法由 jsdom 证明的原生行为；UI/UX/交互改动还必须按 browser-verification guide 做真实浏览器验证。


## 公共契约变更清单

涉及属性、slot、event、form、导出、框架类型、token 或组件可见行为时，按实际影响检查：

- `src/components/` 或 `src/types/` 的实现与出口
- 对应组件 README（`README.md` 与 `README.CN.md`）
- 受影响的 ADR（0003、0005、0006、0007、0008、0010、0011）
- 聚焦测试和 browser-mode 测试
- React/Vue demo 的 type fixtures 与集成表面
- `apps/weave/frontend`（若被公共组件消费）
- package `exports`、Changeset 和 `repo:contract` 报告

不要机械同步全部项目；以 `repo:impact`、manifest、源码引用和测试确定实际影响。
