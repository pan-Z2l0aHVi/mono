# Mono

> 跨端、跨技术栈、跨 agent 的开源 monorepo 工程项目，包含代码、设计资源与文档。

[English](./README.md) | 简体中文

本仓库包含跨端、跨技术栈的代码、设计资源与文档，以及 npm 包、workspace 工具和集成应用，可直接配合 Claude、Codex、OpenCode 等 agent 工具使用。按需选择包，再阅读对应 README 了解安装、用法与 API。

## 发布到 npm 的包

| 包名                                                                                  | 提供什么                                                        |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`@greypan/js-kit`](./packages/js-kit/README.CN.md)                                   | JavaScript 工具函数与可组合插件，不依赖 DOM。                   |
| [`@greypan/browser-kit`](./packages/browser-kit/README.CN.md)                         | 浏览器存储、埋点、环境检测、文件、剪贴板与历史记录工具。        |
| [`@greypan/web-ui`](./packages/web-ui/README.CN.md)                                   | 基于 Lit 的 Web Components、主题 token、图标与 React/Vue 类型。 |
| [`@greypan/unplugin-web-components`](./packages/unplugin-web-components/README.CN.md) | 在标签出现时自动导入 Web Components 的 Vite/Webpack 插件。      |
| [`@greypan/deps-reload`](./packages/deps-reload/README.CN.md)                         | 依赖构建产物变化时刷新页面的 Vite/Webpack 插件。                |

## Workspace 内部包

这些包只在仓库内部使用。在 workspace 应用中通过 `workspace:*` 协议添加依赖。

| 包名                                                                                           | 提供什么                                                         |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`@greypan/test-kit`](./packages/test-kit/README.CN.md)                                        | Vitest 浏览器模式与 MSW 的测试辅助。                             |
| [`@greypan/app-scrollbars`](./packages/app-scrollbars/README.CN.md)                            | workspace 应用共用的覆盖式滚动条配置。                           |
| [`@greypan/md-to-meta`](./packages/md-to-meta/README.CN.md)                                    | 把 Markdown 转成结构化 meta 模块，并为每个代码围栏生成一个文件。 |
| [`@greypan/tsconfig`](./packages/tsconfig/README.CN.md)                                        | 共享 TypeScript 配置。                                           |
| [`@greypan/wuchale-vue`](./packages/wuchale-vue/README.md)                                     | wuchale 的 Vue 单文件组件适配器。                                |
| [`@greypan/monorepo-kit`](./packages/monorepo-kit/README.md)                                   | 仓库检查、策略辅助与构建编排。                                   |
| [`@greypan/pi-orchestrator-memory-bridge`](./packages/pi-orchestrator-memory-bridge/README.md) | 把 Herdr 编排记忆与任务板接入 Pi lead 会话的扩展。               |
| [`@greypan/doc-demo-kit`](./packages/doc-demo-kit)                                             | React 与 Vue 文档 demo 共用的文档示例层。                        |

## 应用

这些应用不发布到 npm。它们是集成示例和可分发的终端软件：两个 Web demo 部署到 GitHub Pages，Interweave 通过 GitHub Releases 发布安装包。

| 应用                                             | 技术栈                                           |
| ------------------------------------------------ | ------------------------------------------------ |
| [`react-web-ui-demo`](./apps/react-web-ui-demo/) | React 19、TanStack Router、Zustand、Tailwind CSS |
| [`vue-web-ui-demo`](./apps/vue-web-ui-demo/)     | Vue 3、Vue Router、Pinia、Tailwind CSS           |
| [`interweave`](./apps/interweave/)               | Wails 3 桌面应用，Go 后端与 Vue WebView 前端     |

## 开发

仓库要求 Node.js 24.18 或更高版本，以及 pnpm 12.4 或更高版本。环境准备、构建与测试命令见 [CONTRIBUTING.md](./CONTRIBUTING.md)，目录结构见 [ARCHITECTURE.md](./ARCHITECTURE.md)。
