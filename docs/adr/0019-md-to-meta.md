# ADR-0019: md-to-comp 收敛为通用 markdown 结构化引擎 md-to-meta

- **Date**: 2026-11-01
- **Status**: 已接受

## 背景

`@greypan/md-to-comp` 是示例文档引擎：把 markdown 解析成宿主要的数据，同时知道 markdown 的通用结构与本仓示例文档的业务契约——frontmatter、`## Samples` / `## API` 骨架、按语种登记的 API 表列名、`react` / `vue` flavor、demo manifest 与 `{.CN}` 后缀。业务契约写进引擎后：frontmatter 与文件名可推导却并存而漂移；表格按登记表解析，每加一节要改语种配置；demo manifest 只为绕开宿主缓存特性；`flavors` 让引擎必须知道框架。

## 决策

包重命名为 `@greypan/md-to-meta`（`private`），定位为**通用 Vite 插件**：只认 markdown 结构与围栏，其余全部回到宿主。三条核心取舍：

1. **meta 是结构投影，不是业务模型**：节点 `label` 直接用 HTML 标签名，唯一例外是围栏的 `codeblock`；行内内容在解析期渲染成 HTML 放进 `content`，`children` 只承载结构嵌套，宿主不知道该节点来自哪一节。
2. **去业务契约**：frontmatter、locale、flavor、示例小节、API 表列名与 demo manifest 全部移出引擎；表格按原文行手写解析（「行首 `|` + 第二行分隔行」），不依赖登记表。
3. **thunk 代替 manifest**：围栏一律落盘，只有 `exec` 命中的语言在 meta 里多一个 `load: () => import('./codeblock/<hash>.<ext>')`；字面 specifier 让 Rollup 静态可分析、按需切 chunk，不再需要 manifest 模块。

配套：单 output（多入口、单出口，重名报错）、内容寻址、每份 output 一份 `.mdm-*` 主题 CSS、`private` 包与 `.`/`./contract` 双入口；细节见 `packages/md-to-meta/AGENTS.md`。

## 后果

- 引擎不含任何宿主名字、路径或数据；新增 locale、框架或文档约定不需要改引擎。
- 宿主要负责把 meta 渲染成页面：通用渲染器 + 一个代码块组件（有 `load` 时挂成真组件，否则只显示源码）。
- 语料可以彻底去掉 frontmatter，文件名是唯一身份；`markdown` 子入口删除，浏览器侧只经 `./contract` 取纯文本与行号契约。
- 每个围栏都落一份代码文件，即使不被任何 `load` 引用；这不是冗余，是「代码与页面同源」的落点。

## 替代方案

- **保留业务契约，只改名**：迁移成本为零，但引擎继续跟着本仓语料漂移，换仓库仍要重写。
- **运行时 `import(path)` 代替 thunk**：变量 specifier 构建不可分析、相对基准错位，按需切 chunk 失效。
- **保留 demo manifest**：只为某种宿主缓存特性存在的通道，与「结构投影」定位冲突。
- **多 input 多 output 成对映射**：路径配置翻倍，且要回答「哪个 input 落到哪个 output」这类引擎不该关心的问题。
