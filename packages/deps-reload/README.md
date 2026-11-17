# @greypan/deps-reload

[![npm version](https://img.shields.io/npm/v/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)
[![node version](https://img.shields.io/node/v/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/deps-reload)](https://www.npmjs.com/package/@greypan/deps-reload)

> Reload the page when a dependency's build output changes.

English | [简体中文](./README.CN.md)

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

## Vite

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

When files in `packages/web-ui/dist` change, the browser reloads the page.

This plugin watches build output. It does not alias the dependency to source files, so the app keeps consuming the package build.

## Webpack

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

The Webpack plugin adds each output directory to the watch dependencies. To get a full reload with Webpack Dev Server, enable live reload and disable HMR.

## API

### `depsReload(deps)`

Create the plugin.

| Parameter | Type    | Description           |
| --------- | ------- | --------------------- |
| `deps`    | `Dep[]` | Dependencies to watch |

### `Dep`

| Property     | Type       | Default           | Description                                    |
| ------------ | ---------- | ----------------- | ---------------------------------------------- |
| `name`       | `string`   | -                 | Package name, used for the node_modules path.  |
| `path`       | `string`   | -                 | Local package root for a monorepo or npm link. |
| `outputDir`  | `string`   | `'dist'`          | Build output directory relative to `path`.     |
| `extensions` | `string[]` | `['.js', '.css']` | File extensions to watch.                      |
