# Monorepo

> 一切，尽在一处。

- [架构地图](./ARCHITECTURE.md) · [贡献与 Agent 工作流](./CONTRIBUTING.md)

[English](./README.md) | 简体中文

## 技术栈

- pnpm
- Turborepo
- Vite Plus
- TypeScript

## 子包

| 包名                                                                                  | 描述                                                    |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`@greypan/js-kit`](./packages/js-kit/README.CN.md)                                   | JavaScript 工具函数                                     |
| [`@greypan/browser-kit`](./packages/browser-kit/README.CN.md)                         | 浏览器工具函数                                          |
| [`@greypan/test-kit`](./packages/test-kit/README.CN.md)                               | Vitest 浏览器模式 + MSW 测试基础设施插件                |
| [`@greypan/web-ui`](./packages/web-ui/README.CN.md)                                   | 基于 Lit 的 Web Components，支持 React、Vue 和原生 HTML |
| [`@greypan/unplugin-web-components`](./packages/unplugin-web-components/README.CN.md) | Web Components 自动导入插件                             |
| [`@greypan/deps-reload`](./packages/deps-reload/README.CN.md)                         | 监听 dist 目录变更并自动刷新页面的插件                  |
| [`@greypan/tsconfig`](./packages/tsconfig/README.CN.md)                               | 共享 TypeScript 配置                                    |

## 应用

私有应用（不发布 npm 包）；`react-web-ui-demo` 与 `vue-web-ui-demo` 部署到 GitHub Pages，`interweave` 以安装包发布到 GitHub Release：

| 应用                                             | 技术栈                               |
| ------------------------------------------------ | ------------------------------------ |
| [`react-web-ui-demo`](./apps/react-web-ui-demo/) | React 19 + TanStack Router + Zustand |
| [`vue-web-ui-demo`](./apps/vue-web-ui-demo/)     | Vue 3 + Vue Router + Pinia           |
| [`interweave`](./apps/interweave/)               | Wails 3 桌面应用（Go + Vue WebView） |
