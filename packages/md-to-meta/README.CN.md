# @greypan/md-to-meta

> 把 Markdown 文件转成结构化 meta 模块，并为每个代码围栏生成一个文件。

[English](./README.md) | 简体中文

## 内部使用

这是私有 workspace 包。在 workspace 包中通过 `workspace:*` 协议添加依赖。

## 产物

每份 Markdown 文件会生成：

- `<basename>.meta.js`：文档的节点数组。
- `<basename>.meta.d.ts`：该模块的类型声明。
- `codeblock/<hash>.<ext>`：每个代码围栏一个文件。扩展名取围栏语言，没有语言时用 `.txt`。
- `theme.css`：`.mdm-*` 前缀下的 Markdown 排版与语法高亮样式。

生成器只处理 Markdown 结构和代码围栏。语种、框架、示例小节、API 表与外观选择器由宿主应用负责。

## 配置

```ts
// vite.config.ts
import { mdToMeta } from '@greypan/md-to-meta'

export default {
  plugins: [
    mdToMeta({
      input: ['./docs/*.md', './CHANGELOG.md'],
      output: './src/generated',
      exec: ['tsx'],
      darkSelector: 'html.dark'
    })
  ]
}
```

路径相对 Vite root 解析。dev 与 build 期间插件会写入产物。在 Vitest 下只检查产物是否为最新，不写盘。

## 参数

| 参数           | 类型                 | 默认值 | 说明                                                       |
| -------------- | -------------------- | ------ | ---------------------------------------------------------- |
| `input`        | `string \| string[]` | -      | 文件路径或 glob，相对 Vite root 解析。只接受 `.md` 文件。  |
| `output`       | `string`             | -      | 产物目录，相对 Vite root 解析。                            |
| `exec`         | `string[]`           | `[]`   | 生成 `load` 函数的围栏语言。不影响哪些文件会写入。         |
| `darkSelector` | `string`             | -      | `theme.css` 中深色外观的祖先选择器。省略时只生成浅色规则。 |

每份命中的文档按文件名生成产物。同一 output 中两个来源同名会报错。请重命名文件或收窄 `input`。

## meta 模块

```js
// button.CN.meta.js
const meta = [
  { label: 'h1', id: 'section-1', content: 'Button' },
  { label: 'p', content: '支持 <strong>形态</strong> 与链接' },
  { label: 'ul', children: [{ label: 'li', content: '条目' }] },
  { label: 'table', children: [{ label: 'tr', children: [{ label: 'th', content: '属性' }] }] },
  { label: 'hr' },
  { label: 'img', src: '...', alt: '...' },
  {
    label: 'codeblock',
    lang: 'tsx',
    path: './codeblock/<hash>.tsx',
    content: '<pre class="shiki mdm-code"><code>...</code></pre>',
    load: () => import('./codeblock/<hash>.tsx')
  }
]
export default meta
```

- `label` 是 HTML 标签名，唯一例外是 `codeblock`。
- 行内格式已经渲染成 HTML，放在 `content` 中。
- `children` 承载列表、表格和引用块的结构嵌套。
- 标题 id 按文档内顺序为 `section-<n>`。
- `load` 是动态 import，方便打包器单独切分。只有 `lang` 出现在 `exec` 中时才存在。
- 相同内容的代码围栏共享一个文件。

## 生成文件

生成文件需要提交。`output/**` 归宿主应用所有。每次运行时，生成器会写入 meta 模块、类型声明、`theme.css` 和 `codeblock` 目录。

不要手改生成文件。修改 Markdown，让插件重新生成。
