# Mono

> 一切，尽在一处。

- [架构地图](./ARCHITECTURE.md) · [贡献指南](./CONTRIBUTING.md)

[English](./README.md) | 简体中文

## 技术栈

- pnpm workspaces + Turborepo
- Vite Plus
- TypeScript

## 子包

| 包名                                                                                  | 描述                                                                 |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`@greypan/js-kit`](./packages/js-kit/README.CN.md)                                   | 平台无关的工具函数、类型与可组合插件系统                             |
| [`@greypan/browser-kit`](./packages/browser-kit/README.CN.md)                         | 浏览器工具：storage、tracker、环境检测、文件、剪贴板与 history nav   |
| [`@greypan/test-kit`](./packages/test-kit/README.CN.md)                               | 内部私有 workspace 包：Vitest 浏览器模式 + MSW 测试基础设施插件      |
| [`@greypan/web-ui`](./packages/web-ui/README.CN.md)                                   | 基于 Lit 的 Web Components、主题 token、icon 与 React/Vue 类型适配   |
| [`@greypan/app-scrollbars`](./packages/app-scrollbars/README.CN.md)                   | 内部私有 workspace 包：app 级 OverlayScrollbars 配置与 macOS 主题    |
| [`@greypan/unplugin-web-components`](./packages/unplugin-web-components/README.CN.md) | 在 Vue、React 与 Vite HTML 入口中自动导入 Web Components 的 unplugin |
| [`@greypan/deps-reload`](./packages/deps-reload/README.CN.md)                         | 依赖构建产物变化时刷新页面的 Vite/Webpack 插件                       |
| [`@greypan/md-to-meta`](./packages/md-to-meta/README.CN.md)                           | 内部私有 workspace 包：通用 Markdown 结构化引擎，带 Vite 插件        |
| [`@greypan/tsconfig`](./packages/tsconfig/README.CN.md)                               | 内部私有 workspace 包：共享 TypeScript 配置                          |

## 应用

私有应用（不发布 npm 包）；`react-web-ui-demo` 与 `vue-web-ui-demo` 部署到 GitHub Pages，`interweave` 以安装包发布到 GitHub Release：

| 应用                                             | 技术栈                                              |
| ------------------------------------------------ | --------------------------------------------------- |
| [`react-web-ui-demo`](./apps/react-web-ui-demo/) | React 19 + TanStack Router + Zustand + Tailwind CSS |
| [`vue-web-ui-demo`](./apps/vue-web-ui-demo/)     | Vue 3 + Vue Router + Pinia + Tailwind CSS           |
| [`interweave`](./apps/interweave/)               | Wails 3 桌面应用（Go + Vue WebView + SQLite）       |

## 开发

开发环境准备、构建与测试命令见 [贡献指南](./CONTRIBUTING.md)。
