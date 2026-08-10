# ADR-0003: Web 组件策略

- **Date**: 2025-01-01
- **Status**: 已接受
- **Supersedes**: 不适用

## 背景

`@greypan/web-ui` 组件库需要在 React、Vue 和原生 JS 之间通用，且不产生重复代码。每个框架有不同的 JSX 类型系统和模板编译器。

## 决策

- 将组件构建为**带有 Shadow DOM 的 Lit 自定义元素**
- `:host` CSS 选择器仅限于 `display` 和 `contain` —— 所有其他样式放在 shadow root 内部
- 在 `packages/web-ui/src/types/vue.ts` 和 `react.ts` 中提供**框架类型封装**，用于 Volar/TSX 补全
- 组件使用 `declare global { interface HTMLElementTagNameMap }` 进行全局 HTML 类型扩展
- 在每个组件上暴露 `$events` 接口，用于框架层面的事件类型提取

## 后果

- 单一实现即可服务于所有框架
- 外部 CSS 重置样式（Tailwind）无法穿透 Shadow DOM —— 只有 `:host` 属性会受到影响
- 框架消费者必须导入 `@greypan/web-ui/types/vue` 或 `@greypan/web-ui/types/react` 以获得 JSX 类型
- 新组件需要同时更新两个类型辅助文件
