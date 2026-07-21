# @greypan/unplugin-web-components

> Web Components 自动导入插件，支持 React、Vue 和原生 HTML

[English](./README.md) | 简体中文

## 功能

- **自动导入**：在模板中检测到 Web Components 时自动添加导入
- **双标签检测**：支持 kebab-case（`<web-ui-button>`）和 PascalCase（`<WebUiButton>`）
- **样式注入**：可选的 CSS 文件导入
- **多打包工具**：通过 unplugin 支持 Vite、Webpack、Rollup 和 esbuild

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

现在在 Vue 或 React 模板中使用 `<web-ui-button>` 时，导入会自动添加：

```vue
<!-- Vue：自动导入 -->
<template>
  <web-ui-button>点击我</web-ui-button>
</template>
```

```tsx
// React：自动导入
function App() {
  return <web-ui-button>点击我</web-ui-button>
}
```

## API

### `unpluginWebComponents(options)`

创建用于 Web Components 自动导入的 unplugin 实例。

| 参数                  | 类型      | 默认值  | 说明                               |
| --------------------- | --------- | ------- | ---------------------------------- |
| `options.tagPrefix`   | `string`  | -       | 组件标签前缀（如 `'web-ui'`）      |
| `options.packageName` | `string`  | -       | NPM 包名（如 `'@greypan/web-ui'`） |
| `options.sideEffects` | `boolean` | `false` | 使用副作用导入（`import 'pkg'`）   |
| `options.withStyle`   | `string`  | -       | 随组件导入的 CSS 文件              |

### 支持的框架

| 框架  | 文件类型       | 说明              |
| ----- | -------------- | ----------------- |
| Vue   | `.vue`         | `<script>` 块注入 |
| React | `.tsx`, `.jsx` | 顶层导入注入      |
