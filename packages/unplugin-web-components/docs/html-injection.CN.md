# HTML 注入

[English](./html-injection.md) | 简体中文

通过 Vite 的 `transformIndexHtml` 钩子，自动向 HTML 构建入口注入自定义元素的模块导入脚本。

## 使用方式

在 `vite.config.ts` 中启用插件：

```ts
// vite.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import { defineConfig } from 'vite'

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

对于经过 Vite 处理的 HTML 入口：

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

插件在 `transformIndexHtml`（`order: 'pre'`）阶段向 `<head>` 头部（`injectTo: 'head-prepend'`）注入模块脚本：

```html
<script type="module">
  import '@greypan/web-ui/components/button'
</script>
```

## 识别与忽略规则

- **仅识别 kebab-case**：HTML 标签名不区分大小写，`<WEB-UI-BUTTON>` 与 `<web-ui-Button>` 都会归一匹配到 `web-ui-button`；`<WebUiButton>` 这类 PascalCase 写法在 HTML 中不会匹配。
- **忽略带引号属性值**：扫描前会先剥离标签属性中的引号字符串（例如 `title="<web-ui-dialog>"` 或 `data-code="<script>"`），防止伪标签触发误导入或吞掉后续内容。
- **忽略原始文本元素与注释**：HTML 注释（`<!-- ... -->`）以及 `<script>`、`<style>`、`<title>`、`<textarea>`、`<xmp>`、`<iframe>`、`<noembed>`、`<noframes>`、`<noscript>` 内部的内容会被忽略；`<template>` 中的标签仍正常扫描。

## 适用边界

- **仅限 Vite**：HTML 注入依赖 Vite 的 `transformIndexHtml` 钩子。`/webpack` 入口仅转换模块源码，不注入 HTML。
- **仅限 Vite 构建入口**：HTML 必须经过 Vite 开发服务器或 `vite build` 处理；`public/` 下的静态文件或直接从磁盘打开的 HTML 不会被转换。
