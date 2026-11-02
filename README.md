# Mono

> Everything, one repo.

- [Architecture map](./ARCHITECTURE.md) · [Contributing](./CONTRIBUTING.md)

English | [简体中文](./README.CN.md)

## Tech Stack

- pnpm workspaces + Turborepo
- Vite Plus
- TypeScript

## Packages

| Package                                                                            | Description                                                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [`@greypan/js-kit`](./packages/js-kit/README.md)                                   | Platform-agnostic utilities, types, and a composable plugin system                                |
| [`@greypan/browser-kit`](./packages/browser-kit/README.md)                         | Browser utilities for storage, tracking, environment detection, files, clipboard, and history nav |
| [`@greypan/test-kit`](./packages/test-kit/README.md)                               | Internal private workspace package: Vitest browser mode + MSW test infrastructure                 |
| [`@greypan/web-ui`](./packages/web-ui/README.md)                                   | Lit-based web components, theme tokens, icons, and React/Vue type adapters                        |
| [`@greypan/app-scrollbars`](./packages/app-scrollbars/README.md)                   | Internal private workspace package: app-level OverlayScrollbars options and macOS theme           |
| [`@greypan/unplugin-web-components`](./packages/unplugin-web-components/README.md) | Unplugin that auto-imports web components in Vue, React, and Vite HTML entries                    |
| [`@greypan/deps-reload`](./packages/deps-reload/README.md)                         | Vite/Webpack plugin that reloads the page when a dependency's build output changes                |
| [`@greypan/md-to-meta`](./packages/md-to-meta/README.md)                           | Internal private workspace package: generic Markdown-to-meta engine with a Vite plugin            |
| [`@greypan/tsconfig`](./packages/tsconfig/README.md)                               | Internal private workspace package: shared TypeScript configuration profiles                      |

## Apps

Private apps (not published to npm); the two web demos deploy to GitHub Pages, and `interweave` ships installers via GitHub Releases:

| App                                              | Stack                                                   |
| ------------------------------------------------ | ------------------------------------------------------- |
| [`react-web-ui-demo`](./apps/react-web-ui-demo/) | React 19 + TanStack Router + Zustand + Tailwind CSS     |
| [`vue-web-ui-demo`](./apps/vue-web-ui-demo/)     | Vue 3 + Vue Router + Pinia + Tailwind CSS               |
| [`interweave`](./apps/interweave/)               | Wails 3 desktop application (Go + Vue WebView + SQLite) |

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for environment setup, build, and test commands.
