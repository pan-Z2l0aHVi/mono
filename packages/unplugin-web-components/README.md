# @greypan/unplugin-web-components

[![npm version](https://img.shields.io/npm/v/@greypan/unplugin-web-components)](https://www.npmjs.com/package/@greypan/unplugin-web-components)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/unplugin-web-components)](https://www.npmjs.com/package/@greypan/unplugin-web-components)
[![node version](https://img.shields.io/node/v/@greypan/unplugin-web-components)](https://www.npmjs.com/package/@greypan/unplugin-web-components)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/unplugin-web-components)](https://www.npmjs.com/package/@greypan/unplugin-web-components)

> Vite and Webpack plugin that imports web components when their tags appear.

English | [简体中文](./README.CN.md)

**Online Docs:** [Dev Kit Demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/unplugin-web-components/getting-started)

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

## Quick start

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

For Webpack, import from `@greypan/unplugin-web-components/webpack` with the same options.

When you use `<web-ui-button>` in a Vue template, React JSX/TSX, or a Vite HTML entry, the matching import is injected automatically:

```vue
<!-- Vue -->
<template>
  <web-ui-button>Click me</web-ui-button>
</template>
```

```tsx
// React
function App() {
  return <web-ui-button>Click me</web-ui-button>
}
```

## API

### `unpluginWebComponents(options)`

| Parameter             | Type      | Default | Description                                                                                 |
| --------------------- | --------- | ------- | ------------------------------------------------------------------------------------------- |
| `options.tagPrefix`   | `string`  | -       | Component tag prefix, for example `'web-ui'` (regex metacharacters are safely escaped).     |
| `options.packageName` | `string`  | -       | Target npm package name, for example `'@greypan/web-ui'`.                                   |
| `options.sideEffects` | `boolean` | `false` | Emit side-effect imports (`import 'pkg/components/x'`) instead of named imports.            |
| `options.withStyle`   | `string`  | -       | Optional stylesheet filename imported alongside each component (`pkg/components/x/<file>`). |

### Supported bundlers

Only `/vite` and `/webpack` subpath exports are published:

| Entry      | Module transforms                   | HTML injection                 |
| ---------- | ----------------------------------- | ------------------------------ |
| `/vite`    | Vue (`.vue`), React (`.tsx`/`.jsx`) | Vite HTML entry (`index.html`) |
| `/webpack` | Vue (`.vue`), React (`.tsx`/`.jsx`) | -                              |

## Documentation

- [Module Transforms](./docs/module-transforms.md) — Vue SFC & React JSX/TSX injection, directive prologues, and import modes
- [HTML Injection](./docs/html-injection.md) — Vite `transformIndexHtml` rules, ignored regions, and boundaries
