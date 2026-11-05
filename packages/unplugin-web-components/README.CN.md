# @greypan/unplugin-web-components

> 在标签出现时自动导入 Web Components 的 Vite/Webpack 插件。

[English](./README.md) | 简体中文

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

在 Vue 模板、React JSX/TSX 或 Vite HTML 入口中使用 `<web-ui-button>` 时，会自动加入对应导入。

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

### Vite HTML 入口

对于由 Vite 处理的 HTML 入口，插件会注入一个模块脚本，为每个组件生成一条导入。

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Vanilla + web-ui</title>
  </head>
  <body>
    <web-ui-button>点击我</web-ui-button>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`sideEffects: true` 时，注入的脚本大致如下：

```html
<script type="module">
  import '@greypan/web-ui/components/button'
</script>
```

HTML 注入规则：

- 只识别 kebab-case 自定义元素。HTML 标签名不区分大小写，因此 `<WEB-UI-BUTTON>` 和 `<web-ui-Button>` 都匹配 `web-ui-button`。`<WebUiButton>` 这样的驼峰名不匹配。
- 注释、`script`、`style`、`title`、`textarea`、`iframe` 等原始文本区域中的标签会被忽略。
- HTML 必须经过 Vite 构建。`public/` 中的文件和直接从磁盘打开的 HTML 不会被转换。

## API

### `unpluginWebComponents(options)`

| 参数                  | 类型      | 默认值  | 说明                                  |
| --------------------- | --------- | ------- | ------------------------------------- |
| `options.tagPrefix`   | `string`  | -       | 组件标签前缀，例如 `'web-ui'`。       |
| `options.packageName` | `string`  | -       | npm 包名，例如 `'@greypan/web-ui'`。  |
| `options.sideEffects` | `boolean` | `false` | 使用副作用导入，例如 `import 'pkg'`。 |
| `options.withStyle`   | `string`  | -       | 随组件导入的 CSS 文件。               |

### 支持的打包器

| 入口       | 模块转换                              | HTML 注入                      |
| ---------- | ------------------------------------- | ------------------------------ |
| `/vite`    | Vue（`.vue`）、React（`.tsx`/`.jsx`） | Vite HTML 入口（`index.html`） |
| `/webpack` | Vue（`.vue`）、React（`.tsx`/`.jsx`） | -                              |

只发布 `/vite` 和 `/webpack` 子路径。HTML 注入仅限 Vite。Webpack 适配器只转换模块源码，不注入 HTML。
