# Monorepo

> Everything, one repo.

English | [简体中文](./README.CN.md)

## Tech Stack

- pnpm
- Turborepo
- Vite Plus
- TypeScript

## Packages

| Package                                                                            | Description                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`@greypan/js-kit`](./packages/js-kit/README.md)                                   | JavaScript utility functions                                       |
| [`@greypan/browser-kit`](./packages/browser-kit/README.md)                         | Browser utility functions                                          |
| [`@greypan/test-kit`](./packages/test-kit/README.md)                               | Test infrastructure plugins for Vitest browser mode + MSW          |
| [`@greypan/web-ui`](./packages/web-ui/README.md)                                   | Lit-based web components for React, Vue, and vanilla JS            |
| [`@greypan/unplugin-web-components`](./packages/unplugin-web-components/README.md) | Unplugin for web components auto-import                            |
| [`@greypan/deps-reload`](./packages/deps-reload/README.md)                         | A Plugin that watches dist folder for changes and reloads the page |
| [`@greypan/tsconfig`](./packages/tsconfig/README.md)                               | Shared TypeScript configuration profiles                           |

## Apps

Private apps (not published to npm); the two web demos deploy to GitHub Pages, and `wails-starter` ships installers via GitHub Releases:

| App                                              | Stack                                      |
| ------------------------------------------------ | ------------------------------------------ |
| [`react-web-ui-demo`](./apps/react-web-ui-demo/) | React 19 + TanStack Router + Zustand       |
| [`vue-web-ui-demo`](./apps/vue-web-ui-demo/)     | Vue 3 + Vue Router + Pinia                 |
| [`wails-starter`](./apps/wails-starter/)         | Wails 3 desktop starter (Go + Vue WebView) |
