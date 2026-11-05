# Mono

> An open, cross-platform, cross-stack, cross-agent monorepo engineering project for code, design resources, and docs.

English | [简体中文](./README.CN.md)

This repository contains code, design resources, and docs across platforms and stacks, plus npm packages, workspace tooling, and integration apps. It is set up to work with agent tools such as Claude, Codex, and OpenCode.

## Published packages

| Package                                                                            | What it gives you                                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`@greypan/js-kit`](./packages/js-kit/README.md)                                   | JavaScript utilities and composable plugins. No DOM dependency.                          |
| [`@greypan/browser-kit`](./packages/browser-kit/README.md)                         | Browser storage, tracking, environment detection, files, clipboard, and history helpers. |
| [`@greypan/web-ui`](./packages/web-ui/README.md)                                   | Lit web components, theme tokens, icons, and React/Vue types.                            |
| [`@greypan/unplugin-web-components`](./packages/unplugin-web-components/README.md) | Vite and Webpack plugin that imports web components when their tags appear.              |
| [`@greypan/deps-reload`](./packages/deps-reload/README.md)                         | Vite and Webpack plugin that reloads the page when a dependency build changes.           |

## Workspace packages

These packages stay inside the repository. Add them to a workspace app with the `workspace:*` protocol.

| Package                                                                                        | What it gives you                                                                             |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`@greypan/test-kit`](./packages/test-kit/README.md)                                           | Test helpers for Vitest browser mode with MSW.                                                |
| [`@greypan/app-scrollbars`](./packages/app-scrollbars/README.md)                               | Shared overlay scrollbar options for the workspace apps.                                      |
| [`@greypan/md-to-meta`](./packages/md-to-meta/README.md)                                       | Markdown to structured meta module, plus one file per fenced code block.                      |
| [`@greypan/tsconfig`](./packages/tsconfig/README.md)                                           | Shared TypeScript configuration profiles.                                                     |
| [`@greypan/wuchale-vue`](./packages/wuchale-vue/README.md)                                     | Vue single-file component adapter for wuchale.                                                |
| [`@greypan/monorepo-kit`](./packages/monorepo-kit/README.md)                                   | Repository checks, policy helpers, and build coordination.                                    |
| [`@greypan/pi-orchestrator-memory-bridge`](./packages/pi-orchestrator-memory-bridge/README.md) | Pi extension that connects Herdr orchestration memory and the task board to the lead session. |
| [`@greypan/doc-demo-kit`](./packages/doc-demo-kit)                                             | Shared documentation demo layer for the React and Vue demos.                                  |

## Apps

These apps are not published to npm. They are integration surfaces and shippable end-user software: the two web demos deploy to GitHub Pages, and Interweave ships installers through GitHub Releases.

| App                                              | Stack                                                   |
| ------------------------------------------------ | ------------------------------------------------------- |
| [`react-web-ui-demo`](./apps/react-web-ui-demo/) | React 19, TanStack Router, Zustand, Tailwind CSS        |
| [`vue-web-ui-demo`](./apps/vue-web-ui-demo/)     | Vue 3, Vue Router, Pinia, Tailwind CSS                  |
| [`interweave`](./apps/interweave/)               | Wails 3 desktop app with a Go backend and a Vue WebView |

## Development

The repository uses Node.js 24.18 or newer and pnpm 12.4 or newer. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, build, and test commands, and [ARCHITECTURE.md](./ARCHITECTURE.md) for the repository layout.
