# @greypan/md-to-meta

> 通用 markdown 结构化引擎：把 markdown 解析成普通 meta 对象、把每个代码围栏落成独立代码文件，并通过 Vite 插件让这些产物保持同步

[English](./README.md) | 简体中文

## 它做什么

一份 markdown 进去，一份结构化模块与它的代码文件出来：

- `<basename>.meta.js`：文档的节点数组（`label` / `content` / `children` / `load`），`label` 是 HTML 标签名，唯一例外是 `codeblock`
- `<basename>.meta.d.ts`：该模块的类型声明
- `codeblock/<sha256>.<ext>`：每个围栏一份文件，按内容 hash 命名，扩展名等于围栏语言名（无语言时 `.txt`）
- `theme.css`：Notion 风格的 markdown 正文版式、shiki 双主题 token 规则与行号槽，全部挂在 `.mdm-*` 前缀下

引擎只认 markdown 结构与围栏。语种、框架、示例小节、API 表、demo manifest 与外观选择器都归宿主应用。

## 内部使用

这是 **private** workspace 包，不发布到 npm。通过 `workspace:*` 协议消费。Turborepo 经 `^build`
把它的 `dist` 提供给依赖方。

```json
{
  "devDependencies": {
    "@greypan/md-to-meta": "workspace:*"
  }
}
```

## 快速开始

```ts
// vite.config.ts
import { mdToMeta } from '@greypan/md-to-meta'

export default {
  plugins: [
    mdToMeta({
      input: ['./docs/*.md', './CHANGELOG.md'],
      output: './src/generated',
      // 只有这些围栏语言会多一个 `load` thunk；所有围栏照常落盘。
      exec: ['tsx'],
      darkSelector: 'html.dark'
    })
  ]
}
```

路径相对 Vite root 解析。dev 与 build 期插件会生成并写盘；在 Vitest（`process.env.VITEST`）下
只校验产物是否最新，不写盘。

## 配置项

| 配置项         | 类型                 | 默认值 | 说明                                                   |
| -------------- | -------------------- | ------ | ------------------------------------------------------ |
| `input`        | `string \| string[]` | —      | 字面路径或 glob，相对 Vite root 解析；只接受 `.md`     |
| `output`       | `string`             | —      | 产物目录，相对 Vite root 解析                          |
| `exec`         | `string[]`           | `[]`   | 生成 `load` thunk 的围栏语言；不影响哪些文件落盘       |
| `darkSelector` | `string`             | —      | `theme.css` 里深色外观的祖先选择器；省略则只产浅色规则 |

每份命中的文档按文件名产出产物；同一 output 里两个来源同名会报错，请改名或收窄 `input`。

## meta 模块

```js
// button.CN.meta.js
const meta = [
  { label: 'h1', id: 'section-1', content: 'Button' },
  { label: 'p', content: '支持 <strong>形态</strong> 与链接' },
  { label: 'ul', children: [{ label: 'li', content: '条目' }] },
  { label: 'table', children: [{ label: 'tr', children: [{ label: 'th', content: '属性' }] }] },
  { label: 'hr' },
  { label: 'img', src: '…', alt: '…' },
  {
    label: 'codeblock',
    lang: 'tsx',
    path: './codeblock/<hash>.tsx',
    content: '<pre class="shiki mdm-code"><code>…</code></pre>',
    load: () => import('./codeblock/<hash>.tsx')
  }
]
export default meta
```

- 行内内容已是渲染好的 HTML，放在 `content`；`children` 只承载结构嵌套（列表、表格、引用块）。
- 标题 id 按文档内顺序为 `section-<n>`。
- `load` 是字面动态 import，Rollup 可静态分析并按需切 chunk；只有 `lang` 命中 `exec` 时才存在。
- 代码文件按内容寻址：同一段围栏出现在两篇文档里只落一份文件。

## 生成产物

- 产物进 git：`output/**` 归宿主所有；插件只通过 `writeIfChanged` 写入，未变化的产物不会污染构建
  哈希或再次触发 watcher。
- `output/**/*.meta.js`、`*.meta.d.ts`、`theme.css` 与 `output/codeblock/**` 归生成器独占，每轮清扫。
- 不要手改产物。改 markdown 文档，让插件重新生成。
