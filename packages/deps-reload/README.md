# @greypan/deps-reload

[![npm version](https://img.shields.io/npm/v/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)
[![node version](https://img.shields.io/node/v/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)

> Reload the page when a dependency's build output changes.

English | [简体中文](./README.CN.md)

**Online Docs:** [Dev Kit Demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/deps-reload/getting-started)

## Install

```bash
# npm
npm install @greypan/deps-reload

# pnpm
pnpm add @greypan/deps-reload

# yarn
yarn add @greypan/deps-reload

# bun
bun add @greypan/deps-reload
```

## Quick start

### Vite

```ts
// vite.config.ts
import depsReload from '@greypan/deps-reload/vite'

export default defineConfig({
  plugins: [
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui',
        extensions: ['.js', '.css']
      }
    ])
  ]
})
```

When files in `packages/web-ui/dist` change, the browser reloads the page. The plugin watches compiled build output rather than aliasing to source files, so your app keeps consuming the real package build.

### Webpack

```ts
// webpack.config.ts
import depsReload from '@greypan/deps-reload/webpack'

export default {
  plugins: [
    depsReload([
      {
        name: '@greypan/web-ui',
        path: '../../packages/web-ui'
      }
    ])
  ],
  devServer: {
    hot: false,
    liveReload: true
  }
}
```

The Webpack plugin adds each output directory to `compilation.contextDependencies`. To trigger a full reload with Webpack Dev Server, enable `liveReload` and disable `hot`.

## API

### `depsReload(deps)`

Available via `@greypan/deps-reload/vite` and `@greypan/deps-reload/webpack` (default export).

| Parameter | Type    | Description                           |
| --------- | ------- | ------------------------------------- |
| `deps`    | `Dep[]` | Local or linked dependencies to watch |

### `Dep`

| Property     | Type       | Default           | Description                                                                   |
| ------------ | ---------- | ----------------- | ----------------------------------------------------------------------------- |
| `name`       | `string`   | -                 | Package name. Resolves `node_modules/<name>` when `path` is omitted.          |
| `path`       | `string`   | -                 | Local package root directory for a monorepo or `npm link`.                    |
| `outputDir`  | `string`   | `'dist'`          | Build output directory relative to the package root.                          |
| `extensions` | `string[]` | `['.js', '.css']` | File extensions watched in Vite (normalized to lowercase with a leading `.`). |

Matching notes:

- Path matching in Vite is separator- and case-insensitive; `.map` source maps are always ignored.
- Rapid file writes during a single rebuild are debounced (`300ms`, max wait `3000ms`) into one full reload.

## Documentation

- [Vite](./docs/vite.md) — Module graph invalidation, debounce behavior, and monorepo `fs.allow`
- [Webpack](./docs/webpack.md) — `contextDependencies`, Dev Server settings, and Vite differences
