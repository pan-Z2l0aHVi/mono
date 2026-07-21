# @greypan/unplugin-web-components

> Unplugin for web components auto-import in React, Vue, and vanilla JS

English | [简体中文](./README.CN.md)

## Features

- **Auto-import**: Automatically import web components when detected in templates
- **Dual tag detection**: Supports both kebab-case (`<web-ui-button>`) and PascalCase (`<WebUiButton>`)
- **Style injection**: Optional CSS import for component styles
- **Multi-bundler**: Works with Vite, Webpack, Rollup, and esbuild via unplugin

## Install

```bash
# npm
npm install @greypan/unplugin-web-components

# pnpm
pnpm add @greypan/unplugin-web-components

# yarn
yarn add @greypan/unplugin-web-components

# bun
bun add @greypan/unplugin-web-components
```

## Quick Start

```ts
// vite.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'

export default defineConfig({
  plugins: [
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    })
  ]
})
```

Now when you use `<web-ui-button>` in a Vue or React template, the import is automatically added:

```vue
<!-- Vue: auto-imported -->
<template>
  <web-ui-button>Click me</web-ui-button>
</template>
```

```tsx
// React: auto-imported
function App() {
  return <web-ui-button>Click me</web-ui-button>
}
```

## API

### `unpluginWebComponents(options)`

Create an unplugin instance for web component auto-import.

| Parameter             | Type      | Default | Description                                 |
| --------------------- | --------- | ------- | ------------------------------------------- |
| `options.tagPrefix`   | `string`  | -       | Component tag prefix (e.g. `'web-ui'`)      |
| `options.packageName` | `string`  | -       | NPM package name (e.g. `'@greypan/web-ui'`) |
| `options.sideEffects` | `boolean` | `false` | Use side-effect imports (`import 'pkg'`)    |
| `options.withStyle`   | `string`  | -       | CSS file to import with each component      |

### Supported frameworks

| Framework | File Types     | Description                |
| --------- | -------------- | -------------------------- |
| Vue       | `.vue`         | `<script>` block injection |
| React     | `.tsx`, `.jsx` | Top-level import injection |
