# @greypan/unplugin-web-components

> Web Components 自动导入插件，支持 React、Vue 与 Vite HTML 入口

[English](./README.md) | 简体中文

## 功能

- **自动导入**：在模板中检测到 Web Components 时自动添加导入
- **双标签检测**：在模块源码中支持 kebab-case（`<web-ui-button>`）和 PascalCase（`<WebUiButton>`）
- **样式注入**：可选的 CSS 文件导入
- **Vite HTML 入口**：向 `index.html` 及其他 Vite HTML 构建入口注入组件导入
- **入口点**：仅发布 `/vite` 与 `/webpack` 子路径导出

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

现在在 Vue 模板、React JSX/TSX 或 Vite HTML 入口中使用 `<web-ui-button>` 时，导入会自动添加：

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

### Vite HTML 入口

对于由 Vite 处理的 HTML 入口，插件会扫描标记，并在 `<head>` 前部注入一个 `<script type="module">`，为每个组件生成静态 import：

```html
<!-- index.html -->
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

`sideEffects: true` 时注入的脚本大致如下：

```html
<script type="module">
  import '@greypan/web-ui/components/button'
</script>
```

HTML 注入说明：

- HTML 中仅识别 kebab-case 自定义元素（`<web-ui-*>` → `web-ui-button`），大小写不敏感——HTML 标签名解析时统一小写化，`<WEB-UI-BUTTON>` 与 `<web-ui-Button>` 都按 `web-ui-button` 处理。驼峰命名（`<WebUiButton>`）不支持：解析器会将其归一到另一个标签（`webuibutton`）。
- 跳过 HTML 注释及 RAWTEXT/RCDATA 区域（`script`、`style`、`title`、`textarea`、`iframe`、`xmp`、`noembed`、`noframes`、`noscript`），其中的伪标签不会产生导入。未闭合区域通常视为延伸到文件末尾；由于正则扫描无法同时模拟注释与 RAWTEXT 的 tokenizer 状态，注释内未闭合的 `<script>`/`style` 伪标签（如 `<!-- <script> --><web-ui-button>`）可能吞掉其后的真实标签。带引号属性值同样跳过，等号两侧允许空白——`<div data-template = "<web-ui-button>">` 不会触发导入。
- HTML 必须经 Vite 构建（`vite build`）。`public/` 中的文件按原样提供，直接双击打开的 HTML 不会被转换。

## API

### `unpluginWebComponents(options)`

创建用于 Web Components 自动导入的 unplugin 实例。

| 参数                  | 类型      | 默认值  | 说明                               |
| --------------------- | --------- | ------- | ---------------------------------- |
| `options.tagPrefix`   | `string`  | -       | 组件标签前缀（如 `'web-ui'`）      |
| `options.packageName` | `string`  | -       | NPM 包名（如 `'@greypan/web-ui'`） |
| `options.sideEffects` | `boolean` | `false` | 使用副作用导入（`import 'pkg'`）   |
| `options.withStyle`   | `string`  | -       | 随组件导入的 CSS 文件              |

### 支持的打包器

| 入口       | 模块转换                              | HTML 注入                      |
| ---------- | ------------------------------------- | ------------------------------ |
| `/vite`    | Vue（`.vue`）、React（`.tsx`/`.jsx`） | Vite HTML 入口（`index.html`） |
| `/webpack` | Vue（`.vue`）、React（`.tsx`/`.jsx`） | —                              |

- 仅发布 `/vite` 与 `/webpack` 子路径导出；不提供 Rollup、esbuild 入口。
- HTML 注入是 Vite 专属能力。Webpack 适配器只做模块源码转换，不提供 HTML 注入——如需 Webpack HTML 注入，需单独集成 `HtmlWebpackPlugin`。
