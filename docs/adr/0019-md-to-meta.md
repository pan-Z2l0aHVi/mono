# ADR-0019: md-to-comp 收敛为通用 markdown 结构化引擎 md-to-meta

- **Date**: 2026-11-01
- **Status**: 已接受

## 背景

`@greypan/md-to-comp` 是示例文档引擎，它把一篇 markdown 解析成宿主要的数据。它同时知道两件事：markdown 长什么样（通用），以及本仓的示例文档长什么样（业务契约）——`component` / `tag` frontmatter、`## Samples` / `## API` 两节骨架、按语种登记的 API 表列名、`react` / `vue` 两个 flavor、demo manifest、`{.CN}` 后缀。这些知识一旦写进引擎，就带来了几个已经发生的代价：

- frontmatter 的 `component` / `tag` 与文件名完全可推导，两个名字并存只会漂移；
- 表格按「登记过的小节名 + 逐字表头」解析，每加一节要改语种配置；
- demo manifest 存在的唯一理由是绕开宿主 `import.meta.glob` 在 Vitest 持久缓存里保留旧文件集合，这是一个只为某种宿主工具特性存在的通道；
- `flavors` 把「一条示例必须齐哪几份围栏」写进引擎，引擎必须知道框架。

## 决策

包重命名为 `@greypan/md-to-meta`（`private`），定位为**通用 Vite 插件**：只认 markdown 结构与围栏，其余全部回到宿主。

```text
markdown ─┬─ <basename>.meta.js    节点数组（label / content / children / load）
          ├─ <basename>.meta.d.ts  类型声明
          ├─ codeblock/<hash>.<ext> 每个围栏一文件，按内容 hash 寻址
          └─ theme.css             .mdm-* 主题
```

三条核心取舍：

1. **meta 是结构投影，不是业务模型**。节点 `label` 直接用 HTML 标签名（`h1`–`h6`、`p`、`ul`、`ol`、`li`、`blockquote`、`hr`、`table`、`tr`、`th`、`td`、`img`），唯一例外是围栏的 `codeblock`。行内内容在解析期渲染成 HTML 字符串放进 `content`，`children` 只承载结构嵌套。宿主按 label 决定渲染，不知道该节点来自哪一节。
2. **去业务契约**。frontmatter 彻底去掉；locale / flavor / 示例小节 / API 表列名 / demo manifest 全部移出引擎。表格按原文行手写解析（GFM 表格不在 CommonMark，`remark-gfm` 未引入），识别规则是「行首 `|` + 第二行分隔行」，不依赖任何登记表。
3. **thunk 代替 manifest**。围栏一律落盘（不设语言白名单，扩展名即语言名，无语言落 `.txt`）；只有 `exec` 命中的语言在 meta 里多一个 `load: () => import('./codeblock/<hash>.<ext>')`。字面 specifier 让 Rollup 静态可分析、按需切 chunk，也让「新增示例迫使宿主重新展开文件集合」不再需要一个 manifest 模块。

配套决定：

- **单 output**：多入口、单出口。同一 output 内按解析后绝对路径去重，产物按 md 文件名平铺，重名直接报错（错误信息带两个源文件路径），由调用方改名。
- **内容寻址的代码文件**：同一段代码跨文档、同文档重复出现都落同一个文件，改一块只换一个文件名，diff 噪音最小。
- **主题八字契约**：类名前缀 `.mdm-*`，每个 output 一份 `theme.css`，宿主 import 它即可拿到 Markdown 版式与 shiki 双主题取色。
- **发布面不变**：`private` 包，不出 npm；宿主构建时经 turbo 的 `^build` 拿到新 `dist`。

## 后果

- 引擎不含任何宿主名字、路径或数据；新增 locale、框架或文档约定不需要改引擎。
- 宿主要负责把 meta 渲染成页面：通用 meta 渲染器 + 一个代码块组件（有 `load` 时挂成真组件，否则只显示源码）。
- 语料可以彻底去掉 frontmatter；文件名是唯一身份，`button.CN.md` → `button.CN`，语种由宿主按 `.CN` 判定。
- `markdown` 子入口（浏览器内运行时 markdown → HTML）删除：changelog 之类页面改为直接消费生成的 `.meta.js`。
- 每个围栏都落一份代码文件，即使它不被任何 `load` 引用；这不是冗余，是「代码与页面同源」的落点。

## 替代方案

- **保留业务契约，只改名**：迁移成本为零，但引擎继续跟着本仓语料漂移，换仓库仍要重写。
- **运行时 `import(path)` 代替 thunk**：变量 specifier 构建不可分析、相对基准错位，按需切 chunk 失效。
- **保留 demo manifest**：只为某种宿主缓存特性存在的通道，与「结构投影」定位冲突。
- **多 input 多 output 成对映射**：路径配置翻倍，且必须回答「哪个 input 落到哪个 output」这类引擎不该关心的问题；单 output + 重名报错更接近打包工具的直觉。
