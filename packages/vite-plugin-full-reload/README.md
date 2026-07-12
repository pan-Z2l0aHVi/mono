# @greypan/vite-plugin-full-reload

Vite HMR plugin for full page reload when dependencies change

English | [简体中文](./README.CN.md)

## Features

- **Full reload**: Trigger full page refresh when dependency files change during dev
- **Configurable watching**: Custom file extensions and output directories
- **Debounced reload**: Prevents rapid successive refreshes
- **Monorepo-friendly**: Watch local package build outputs

## Install

```bash
# npm
npm install @greypan/vite-plugin-full-reload

# pnpm
pnpm add @greypan/vite-plugin-full-reload

# yarn
yarn add @greypan/vite-plugin-full-reload

# bun
bun add @greypan/vite-plugin-full-reload
```

## Quick Start

```ts
// vite.config.ts
import { fullReload } from '@greypan/vite-plugin-full-reload'

export default defineConfig({
  plugins: [
    fullReload([
      {
        name: '@greypan/web-ui',
        path: './packages/web-ui/dist',
        extensions: ['.js', '.css']
      }
    ])
  ]
})
```

When files in `packages/web-ui/dist` change, the browser will automatically reload.

## API

### `fullReload(deps)`

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
