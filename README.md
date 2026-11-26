# Mono

[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/pan-Z2l0aHVi/mono)

> An open, cross-platform, cross-stack, cross-agent monorepo engineering project for code, design resources, and docs.

English | [简体中文](./README.CN.md)

This repository contains npm packages, workspace tooling, and integration apps. It is set up to work with agent tools such as Claude, Codex, Pi, and OpenCode. Pick a package and read its README for installation, usage, and API.

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

| Package                                                                    | What it gives you                                                                                               |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`@greypan/test-kit`](./packages/test-kit/README.md)                       | Test helpers for Vitest browser mode with MSW.                                                                  |
| [`@greypan/app-scrollbars`](./packages/app-scrollbars/README.md)           | Shared overlay scrollbar options for the workspace apps.                                                        |
| [`@greypan/md-to-meta`](./packages/md-to-meta/README.md)                   | Markdown to structured meta module, plus one file per fenced code block.                                        |
| [`@greypan/tsconfig`](./packages/tsconfig/README.md)                       | Shared TypeScript configuration profiles.                                                                       |
| [`@greypan/wuchale-vue`](./packages/wuchale-vue/README.md)                 | Vue single-file component adapter for wuchale.                                                                  |
| [`@greypan/monorepo-kit`](./packages/monorepo-kit/README.md)               | Repository checks, policy helpers, and build coordination.                                                      |
| [`@greypan/pi-rex-orchestrator`](./packages/pi-rex-orchestrator/README.md) | Pi Rex operator and agent coordinator that controls Rex and dispatches, supervises, and verifies worker agents. |
| [`@greypan/doc-demo-kit`](./packages/doc-demo-kit/README.md)               | Shared documentation demo layer for the React and Vue demos.                                                    |
| [`@greypan/route-progress`](./packages/route-progress/README.md)           | Framework-agnostic route progress bar and delayed visibility state machine.                                     |

## Apps

These apps are not published to npm. They are integration surfaces and shippable end-user software: the two web demos deploy to GitHub Pages, and Interweave ships installers through GitHub Releases.

| App                                              | Stack                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| [`react-web-ui-demo`](./apps/react-web-ui-demo/) | React 19, TanStack Router, TanStack Query, Tailwind CSS                     |
| [`vue-web-ui-demo`](./apps/vue-web-ui-demo/)     | Vue 3, Vue Router, Pinia, TanStack Query, Tailwind CSS                      |
| [`dev-kit-demo`](./apps/dev-kit-demo/)           | Vue 3, Vue Router, Tailwind CSS (`@greypan/js-kit`, `@greypan/browser-kit`) |
| [`interweave`](./apps/interweave/)               | Wails 3 desktop app with a Go backend and a Vue WebView frontend            |

## Development

The repository uses Node.js 24.18 or newer and pnpm 12.4 or newer. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, build, and test commands, and [ARCHITECTURE.md](./ARCHITECTURE.md) for the repository layout.
