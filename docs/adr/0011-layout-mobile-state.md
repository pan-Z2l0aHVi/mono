# ADR-0011: Layout 暴露移动端视口状态

- **Date**: 2026-10-07
- **Status**: 已接受

## 背景

Layout 和 app 分别判断移动端断点会造成重复判定；两者更新时机不一致时，组件树与调用方布局可能短暂错位。

## 决策

`web-ui-layout` 拥有移动端断点判断，并通过只读 `mobile` property、反射 attribute 和 `mobile-change` 事件向调用方暴露状态。组件使用 media query，调用方消费派生状态，不再另写同一断点的 JavaScript 判断。CSS 可通过 `web-ui-layout[mobile]` 在 layout 子树中选择移动端样式。

`mobile-change` 是状态通知，区别于请求调用方回写的受控事件。框架接入方式、断点值和事件细节以组件 API 与测试为准。

## 后果

- 组件与调用方共享判定，代价是 `mobile` 成为公共契约。
- 属性选择器不覆盖迁移到 layout 子树外的 portal 内容；此类内容需要合适的独立样式策略。
- `@lit/context` 无法向上游框架调用方提供状态，方法也不能主动通知变化，因此使用 property、attribute 和事件。
