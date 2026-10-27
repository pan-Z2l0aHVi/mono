# @greypan/md-to-comp

> Markdown 示例文档引擎：把带围栏的示例与 API 表生成为示例数据、可编译的 demo 文件，并提供让它们保持同步的 Vite 插件

[English](./README.md) | 简体中文

## 它做什么

每个组件一份 Markdown 文档作为唯一事实来源。引擎解析后产出：

- `examples.ts`：给宿主页面用的示例元数据（`ExampleDocPayload`）与渲染好的 API 表
- `demos/<component>--<sample>.<ext>`：每条示例落一份可编译文件，文件名取自示例标题
- `examples.css`：Markdown 正文版式、代码高亮 token 与行号样式

它与具体组件库无关：组件名、tag 前缀、属性与外观选择器都通过配置传入。内置 `react` 与 `vue` 两个 flavor。

## 内部使用

这是 **private** workspace 包，不发布到 npm。通过 `workspace:*` 协议消费。Turborepo 经 `^build`
把它的 `dist` 提供给依赖方。

```json
{
  "devDependencies": {
    "@greypan/md-to-comp": "workspace:*"
  }
}
```

## Markdown 契约

文档由 YAML frontmatter 与两个可选骨架小节组成：

````md
---
component: button
tag: web-ui-button
---

一段介绍。

## Samples

### Basic

说明这条示例的正文。

```tsx
export default function Demo() {
  return <web-ui-button>Click me</web-ui-button>
}
```

```vue
<template>
  <web-ui-button>Click me</web-ui-button>
</template>
```

## API

### Properties

| Name | Description | Type | Default |
| ---- | ----------- | ---- | ------- |
| ...  | ...         | ...  | ...     |
````

- `component` 必须等于去掉语种后缀的文件名；`tag` 是自定义元素 tag。
- `## Samples` 与 `## API` 在所有语种里都保持这两个名字。示例标题（`### Basic`）同样保持英文：
  它会派生成 id、文件名与 `demoKey`。
- 每条示例必须按 `flavors` 顺序，为每个配置的 flavor 各提供一个围栏。围栏语言 `react` 写 `tsx`、
  `vue` 写 `vue`；围栏语言同时也是落盘扩展名。
- `## API` 下的小节要么是登记过的表格（表头与列数由该语种的 `apiTables` 给出），要么是散文。
  散文整段渲染为 HTML，正文里不能出现表格行。纯展示组件可以整段省略 `## API`。
- 表首列是行的身份，次列是富文本说明，之后都是普通值列。值列不允许空单元格；无值写 `—` 占位。

## 快速开始

Vite 入口是钉死 flavor 的薄壳。`@greypan/md-to-comp/react` 与 `@greypan/md-to-comp/vue`
各自导出可直接使用的插件工厂：

```ts
// vite.config.ts
import mdToComp from '@greypan/md-to-comp/react'

export default {
  plugins: [
    mdToComp({
      input: '../../packages/web-ui/docs',
      flavors: ['react', 'vue'],
      locales: [
        {
          locale: 'en',
          suffix: '.md',
          apiTables: { columns: { Properties: ['Name', 'Description', 'Type', 'Default'] } }
        },
        {
          locale: 'zh-CN',
          suffix: '.CN.md',
          apiTables: { columns: { 属性: ['名称', '说明', '类型', '默认值'] } }
        }
      ],
      outputs: [
        { output: 'src/generated/en', locale: 'en' },
        { output: 'src/generated/zh-CN', locale: 'zh-CN' }
      ],
      styles: 'src/generated/examples.css',
      darkSelector: 'html.dark'
    })
  ]
}
```

路径相对 Vite root 解析。dev 与 build 期插件会生成并写盘；在 Vitest（`process.env.VITEST`）下
只校验产物是否最新，不写盘。

## 导出

| 入口                        | 内容                                                         |
| --------------------------- | ------------------------------------------------------------ |
| `@greypan/md-to-comp`       | 解析、生成、渲染、高亮、emit 辅助，以及 `createMdToCompVite` |
| `@greypan/md-to-comp/react` | 钉死 `react` flavor 的 Vite 插件                             |
| `@greypan/md-to-comp/vue`   | 钉死 `vue` flavor 的 Vite 插件                               |

## 配置项

`MdToCompConfig`（引擎）与 `MdToCompViteOptions`（Vite 入口）共享这些字段；Vite 入口把路径按
Vite root 解析。

| 配置项         | 类型                   | 默认值      | 说明                                                                   |
| -------------- | ---------------------- | ----------- | ---------------------------------------------------------------------- |
| `input`        | `string`               | —           | Markdown 文档所在目录                                                  |
| `dir`          | `string`               | `'demos'`   | 生成的 demo 文件子目录，相对每份 output                                |
| `anchor`       | `AnchorFn`             | `titleSlug` | 从示例标题派生 id                                                      |
| `flavors`      | `FenceFlavor[]`        | —           | 每条示例必须齐的围栏，顺序即配对顺序                                   |
| `locales`      | `DocsLocale[]`         | —           | 各语种的文件后缀与 API 表列名                                          |
| `darkSelector` | `string`               | —           | 深色外观的祖先选择器；省略则只产浅色规则                               |
| `outputs`      | `{ output; locale }[]` | —           | 产物目录，以及每份产物渲染哪个语种                                     |
| `styles`       | `string`               | 每份 output | 共享的 `examples.css` 路径；省略时每份 output 各写一份（内容必须相同） |

## 生成产物

- 产物进 git：`src/generated/**` 归宿主 demo 所有；插件只通过 `writeIfChanged` 写入，未变化的产物
  不会污染构建哈希或再次触发 watcher。
- demo 目录（`dir`）归生成器独占，每轮清扫，改标题或删示例不会留下孤儿文件。
- 不要手改 `src/generated/**`。改 Markdown 文档，让插件重新生成。
