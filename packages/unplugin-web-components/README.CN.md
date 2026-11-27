# @greypan/unplugin-web-components

[![npm version](https://img.shields.io/npm/v/@greypan/unplugin-web-components)](https://www.npmjs.com/package/@greypan/unplugin-web-components)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/unplugin-web-components)](https://www.npmjs.com/package/@greypan/unplugin-web-components)
[![node version](https://img.shields.io/node/v/@greypan/unplugin-web-components)](https://www.npmjs.com/package/@greypan/unplugin-web-components)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/unplugin-web-components)](https://www.npmjs.com/package/@greypan/unplugin-web-components)

> 在标签出现时自动导入 Web Components 的 Vite/Webpack 插件。

[English](./README.md) | 简体中文

**在线文档：** [Dev Kit Demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/unplugin-web-components/getting-started)

## 安装

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

## 快速开始

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

使用 Webpack 时，将入口改为 `@greypan/unplugin-web-components/webpack`，选项完全一致。

在 Vue 模板、React JSX/TSX 或 Vite HTML 入口中使用 `<web-ui-button>` 时，会自动注入对应组件导入：

```vue
<!-- Vue -->
<template>
  <web-ui-button>点击我</web-ui-button>
</template>
```

```tsx
// React
function App() {
  return <web-ui-button>点击我</web-ui-button>
}
```

## API

### `unpluginWebComponents(options)`

| 参数                  | 类型      | 默认值  | 说明                                                                          |
| --------------------- | --------- | ------- | ----------------------------------------------------------------------------- |
| `options.tagPrefix`   | `string`  | -       | 组件标签前缀，例如 `'web-ui'`（内部自动转义正则元字符）。                     |
| `options.packageName` | `string`  | -       | 目标 npm 包名，例如 `'@greypan/web-ui'`。                                     |
| `options.sideEffects` | `boolean` | `false` | 为 `true` 时生成副作用导入（`import 'pkg/components/x'`），否则生成命名导入。 |
| `options.withStyle`   | `string`  | -       | 可选，随每个组件一并导入的样式文件名（`pkg/components/x/<file>`）。           |

### 支持的打包器

仅发布 `/vite` 和 `/webpack` 两个子路径：

| 入口       | 模块转换                              | HTML 注入                      |
| ---------- | ------------------------------------- | ------------------------------ |
| `/vite`    | Vue（`.vue`）、React（`.tsx`/`.jsx`） | Vite HTML 入口（`index.html`） |
| `/webpack` | Vue（`.vue`）、React（`.tsx`/`.jsx`） | -                              |

## 文档导航

- [模块转换](./docs/module-transforms.CN.md) — Vue SFC 与 React JSX/TSX 注入、指令序言保留与导入模式
- [HTML 注入](./docs/html-injection.CN.md) — Vite `transformIndexHtml` 注入规则、忽略区域与边界说明
