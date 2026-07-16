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
        path: '../../packages/web-ui/dist',
        extensions: ['.js', '.css']
      }
    ])
  ]
})
```

When files in `packages/web-ui/dist` change, the browser will automatically reload.

## API

### `depsReload(deps)`

Create an unplugin instance that watches dependency files and triggers full reload.

| Parameter | Type    | Default | Description           |
| --------- | ------- | ------- | --------------------- |
| `deps`    | `Dep[]` | -       | Dependencies to watch |

### `Dep`

| Property     | Type       | Default           | Description                               |
| ------------ | ---------- | ----------------- | ----------------------------------------- |
| `name`       | `string`   | -                 | Package name (used for node_modules path) |
| `path`       | `string`   | -                 | Physical path (for monorepo or npm link)  |
| `outputDir`  | `string`   | `'dist'`          | Output directory name                     |
| `extensions` | `string[]` | `['.js', '.css']` | File extensions to watch                  |
