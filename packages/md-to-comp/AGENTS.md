# md-to-comp

本包**通用**，与具体组件库无关——包内不出现任何宿主名（组件库、自定义元素前缀、外观属性都通过配置或选择器传入）。内置 `react` / `vue` 两个 flavor，但「再加一个」不是改配置就能成的事：`src/highlight.ts` 的 `FLAVOR_LANG` 表、`src/render.ts` 生成模块里写死的 `html: { react; vue }` 类型、`src/sample.ts` 的 `assertSelfContained` 分支都按这两个二分，加 flavor 要同时改这三处。

- 词表：一篇语料是 example（`ExampleDocPayload`、宿主的 `examples.ts` 与 `data-example-*`），页里的一条示例是 sample（`SampleBlock` → `SamplePayload` → 生成的 `Sample`、DOM 上的 `data-sample*`），按锚点落成的可编译文件是 demo（`demos/`、`demoKey`），flavor（`FenceFlavor`）是配置与产物里的那个框架名。四者各指一样东西；合并其中任意两个都会把「一条示例」与「一篇语料」或「落成的文件」重新混起来。
- 契约只有三处：`### 标题` 是示例小节，`## 示例` / `## API` 是两节骨架，`## API` 下的小节要么是登记过的表格（表头与列数由配置给出），要么是散文（标题没登记，正文整段渲染成 HTML）。`## API` 整段可省——省略即「这个组件没有对外契约」的声明（纯展示组件），产物里 `api` 为空；但小节一旦存在就不能空着，表格要有数据行、散文要有正文。其余可配项见 `MdToCompConfig`；frontmatter 的两个键名 `component` / `tag` 不是配置项，由 `src/markdown.ts` 的 `parseFrontmatter` 钉死。
- `flavors` 是「一条示例必须齐这几份围栏」，顺序即配对顺序；围栏语言合法性与「逐 flavor 各一个代码块」都按它判。围栏语言不写框架名而写 `FLAVOR_LANG` 给的值（`react` → `tsx`、`vue` → `vue`），它同时是落盘扩展名：格式化器只按语言名认围栏，语料里写成 `react` 的那份不会被格式化，而落盘的 `.tsx` 归它管，两条判据就此互相打架。配置里只填 flavor 名，扩展名由 `FLAVOR_LANG` 给出，入口不另钉一遍——再写一遍就是可被写歪的第二次机会。
- 同一份源码在三处必须一致：markdown 围栏、落盘文件（`trimEnd()` 后补一个行尾换行，见 `demoFileContent`）、页面 `<pre>` 的可见文本。`src/highlight.ts` 有一条对最终 HTML 的往返自证（审的是发出去的 HTML 而不是 token 流）；另两处由宿主的断言钉。
- 组件示例目录（默认 `demos/`）归生成器独占，每轮按产出集合清扫：改了锚点或删掉一条示例，上一轮那份文件跟着走。孤儿不被任何 markdown 引用，三处等值断言盖不到它，却照样被宿主的按需加载通道（如 `import.meta.glob`）编进构建。
- 落盘必须走 `writeIfChanged`：无条件覆写会改掉这次任务自己的输入哈希、从此拿不到缓存命中，dev 下还会让宿主的 watcher 绕回生成形成死循环。
- 测试期由插件按 `process.env.VITEST` 分叉成只判不改（`checkArtifacts`）。`buildStart` 与 watcher 触发的 `regenerate` 共用 `applyArtifacts` 这一处判据——判据只贴在其中一条上，另一条就会在测试期改写工作区。配置因此就地写在宿主的 `vite.config.ts` 里，不另立配置文件，也不让 spec 去 import 整个 vite config（整文件求值会把插件工厂一并跑一遍）。
- API 表按原文行读（`src/markdown.ts` 的 `readTableLines`），不走 mdast：表格是 GFM 扩展，引入 `remark-gfm` 尚未被授权。表头必须逐字等于配置里的列名，每行列数也要相等——不核对的话多出来的一节会被读成不存在，等于那段话没写。列的语义按位置定：首列是名称、次列是富文本说明、第 3 列起都是普通值列，值列不允许空单元格（无值写 `—`）。类型列里的联合类型写成 `'a' \| 'b'`，`\|` 按 GFM 规则还原成字面竖线。散文小节走另一条路：正文整段渲染成 HTML，出现表格行即报错（说明这一节的表头漏登记了），正文为空也报错。
- 高亮颜色由 shiki 的双主题写成 `--shiki-light` / `--shiki-dark` 落在每个 token 上，取哪一边由本包生成的 CSS 判，所以切外观不必重新生成高亮 HTML。`renderCss(darkSelector)` 同时产出 Markdown 正文版式（`.mdc-markdown` / `.mdc-heading`，按 Notion 的默认阅读口径给标签、间距与颜色；正文与表格字号不抄 Notion 的字面值，统一跟宿主的 `--wui-font-size`（只在 `.mdc-markdown` 声明一次，表格靠继承；脱离主题时回落 14px）），宿主只负责挂 class；给出 `darkSelector` 时再追加代码 token 与正文的深色覆盖规则。那个祖先选择器是宿主 DOM 的概念（本包不知道该叫什么），配置里传，包内不给默认值。
- 文件名（去 `.md`）必须等于 frontmatter 的 `component`：文档的名字就是它的身份，两个名字并存会漂移。
- `src/generated/**` 是宿主的产物落点，本包不碰：本包只回一份 `GeneratedFile[]`，写盘与孤儿清扫由 `emit.ts` 对宿主给定的目录执行。
- `private` 包，不出包；宿主构建时经 turbo 的 `^build` 自动拿到新 `dist`，改引擎不必发版。
