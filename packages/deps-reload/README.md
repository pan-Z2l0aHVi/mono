# @greypan/deps-reload

> A Plugin that watches dist folder for changes and reloads the page

English | [简体中文](./README.CN.md)

## Features

- **Full reload**: Trigger full page refresh when dependency files change during dev
- **Configurable watching**: Custom file extensions and output directories
- **Debounced reload**: Prevents rapid successive refreshes
- **Monorepo-friendly**: Watch local package build outputs

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

## Quick Start

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

When files in `packages/web-ui/dist` change, the browser will automatically reload.

## Webpack

The Webpack plugin adds each configured output directory to Webpack's watch dependencies. To use the same full-reload behavior with Webpack Dev Server, enable native live reload and disable HMR:

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

This plugin does not alias dependencies to source files. The app continues to consume the package build output.

## API

### `depsReload(deps)`

Create an unplugin instance that watches dependency files and triggers full reload.

| Parameter | Type    | Default | Description           |
| --------- | ------- | ------- | --------------------- |
| `deps`    | `Dep[]` | -       | Dependencies to watch |

### `Dep`

| Property     | Type       | Default           | Description                                     |
| ------------ | ---------- | ----------------- | ----------------------------------------------- |
| `name`       | `string`   | -                 | Package name (used for node_modules path)       |
| `path`       | `string`   | -                 | Local package root (for monorepos or npm links) |
| `outputDir`  | `string`   | `'dist'`          | Build output directory relative to `path`       |
| `extensions` | `string[]` | `['.js', '.css']` | File extensions to watch                        |
