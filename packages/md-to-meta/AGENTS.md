# md-to-meta

通用 markdown 结构化引擎：一份 markdown → 一份 meta 模块（`<basename>.meta.js` / `.meta.d.ts`）、每个围栏一份代码文件（`codeblock/<hash>.<ext>`）、一份 `theme.css`，外挂一个驱动生成的 Vite 插件。包内不出现任何宿主名字、路径或业务契约；取舍与理由见 [ADR-0019](../../docs/adr/0019-md-to-meta.md)。

- 词表：一篇文档的产物是 **meta**（节点数组），节点用 **label**（HTML 标签名）区分形状，唯一例外是 **codeblock**（围栏）。围栏落成的文件是 **code 文件**；**exec** 是「哪些围栏语言额外带 `load`」的配置，与落盘无关；**theme** 是每份 output 一份、挂在 `.mdm-*` 前缀下的主题 CSS。四个词各指一样东西。
- meta 是结构投影，不是业务模型。行内内容（加粗、链接、行内代码）在解析期渲染成 HTML 字符串放进 `content`，`children` 只承载结构嵌套（列表、表格、引用块）；宿主按 label 决定怎么渲染，引擎不知道该节点来自哪一节。`img` 是唯一带结构化字段（`src` / `alt`）的标签，段落的唯一子节点是图片时提成它。
- 块级 label 是 HTML 标签名：`h1`–`h6`、`p`、`ul`、`ol`、`li`、`blockquote`、`hr`、`table`、`tr`、`th`、`td`、`img`，唯一例外是 `codeblock`。标题 `id` 一律 `section-<n>`，n 为文档内标题顺序（1 起）。
- 去业务契约：没有 frontmatter（`remark-frontmatter` / `js-yaml` 已移除）、没有 locale、没有 flavor、没有示例小节或 API 表解析。表格是 GFM 扩展而 `remark-parse` 只做 CommonMark，所以表格按原文行手写解析：识别规则是「行首 `|` + 第二行分隔行」，形状不成立时交回普通段落；单元格的 `\|` 还原成字面竖线。未授权引入 `remark-gfm`，拿到授权后可以换回 mdast 的 `table` 节点。
- **所有围栏都落盘**，不设语言白名单。扩展名 = 围栏语言名（`tsx` → `.tsx`、`bash` → `.bash`），无语言 → `.txt`；语言名来自文档作者，不能带路径分隔符或空白，否则产物会写到 `codeblock/` 之外。代码文件按内容寻址（sha256 前 12 位）：同一段围栏跨文档、同文档重复出现都共享一个文件，改一块只换一个文件名。
- **exec 只控制 `load`**：命中 `exec` 的围栏在 meta 里多一个 `load: () => import('./codeblock/<hash>.<ext>')`，其余照常落盘、只是不会被 import。序列化时写的是字面 specifier，Rollup 才能静态分析并按需切 chunk；禁止运行时变量 `import(path)`。`path` 只用于显示与报错定位，宿主不靠它 import。
- 代码文件内容逐字节来自围栏：`trimEnd()` 后补一个行尾换行（mdast 的 code 值不含行尾换行），落盘文件因此可直接编译。同一份源码在两处必须一致：markdown 围栏与页面 `<pre>` 的可见文本。`src/highlight.ts` 对最终 HTML 有一条往返自证（先摘行号槽、再剥标记、解实体，必须逐字等于输入），宿主复制代码时也要摘行号槽（它读的是 DOM 文本）。
- 主题契约是「八字」：类名前缀 `.mdm-*`（`mdm-markdown`、`mdm-heading`、`mdm-code`），每份 output 一份 `theme.css`，宿主 import 它。shiki 的 `defaultColor: false` 把颜色写成 `--shiki-light` / `--shiki-dark` 落在每个 token 上，取哪一边由这份 CSS 按配置的 `darkSelector` 判，所以切外观不必重新生成高亮 HTML。正文字号 token 是 `--mdm-font-size`，缺省 14px，宿主可覆盖。深色选择器是宿主 DOM 的概念，配置里传，包内不给默认值；深色块里 `darkSelector .mdm-code span` 比重最高，浅色侧想跨外观生效的属性（行号槽的压暗）必须在深色块里同值再写一遍。
- 行号是生成期的事：`@shikijs/transformers` 的 `transformerRenderLineNumber` 把 `<span class="line-number">` 塞在每行最前面（空行照号，编号按真实行序），栏宽、右对齐与取色在 `renderCss` 里；类名由 `highlight.ts` 的 `LINE_NUMBER_CLASS` 一处给出，`visibleText` 的豁免读同一个常量。
- 单 output：多入口（`input` 支持字面路径与 glob）、单出口。同一 output 内按解析后绝对路径去重，产物按 md 文件名平铺；`<basename>` = 文件名去掉 `.md`（`button.CN.md` → `button.CN`，不做 locale 解释）。重名直接报错并带两个源文件路径，由调用方改名或收窄 input，引擎不猜。`input` 用 `tinyglobby` 匹配，只接受 `.md`，匹配到其他扩展名视为配置错误并列出。
- output 归生成器独占的部分只有它写得出来的东西：目录根下的 `theme.css` 与 `*.meta.js` / `*.meta.d.ts`，以及 `codeblock/` 里的全部文件；每轮按产出集合清扫。宿主自己的其它文件不在清扫面里。
- 落盘必须走 `writeIfChanged`：无条件覆写会改掉当前构建的输入哈希、从此拿不到缓存命中，dev 下还会让宿主 watcher 绕回生成形成死循环。
- 测试期由插件按 `process.env.VITEST` 分叉成只判不改（`checkArtifacts`）。`buildStart` 与 watcher 触发的 `regenerate` 共用 `applyArtifacts` 这一处判据——判据只贴在其中一条上，另一条就会在测试期改写工作区。配置就地写在宿主的 `vite.config.ts` 里，不另立配置文件，也不让 spec 去 import 整个 vite config（整文件求值会把插件工厂一并跑一遍）。
- meta 模块必须 lint-clean：禁止匿名 default export，所以模块写成 `const meta = […]` + `export default meta`。code 文件逐字节来自围栏，不参与 lint 与 format——自动改写会破坏它与页面 `<pre>` 的一致性。
- watch：`configureServer` 把 input 命中的 markdown 加入 watcher（它们可能不在 app root 的默认 watch 面里），add / change / unlink 都重新生成，50ms 去抖。
- `output/**` 是宿主的产物落点，本包只回一份 `GeneratedFile[]`；写盘与孤儿清扫由 `emit.ts` 对宿主给定的目录执行。
- `private` 包，不出包；宿主构建时经 turbo 的 `^build` 自动拿到新 `dist`，改引擎不必发版。
