# @greypan/md-to-comp

## 0.0.2

### Patch Changes

- 046addb: Give the dark `segmented` raised indicator the invariant light already has — the resting chip is the page colour, floating in a track that sinks one step below it — instead of the brighter gray it shipped with. `--wui-color-surface-selected` therefore moves from `#5c5c5e` to `#242628` in dark, the same value as `--wui-color-page` there, and the convex track gets its own token, `--wui-color-surface-segmented-track` (`#e5e5ea` in light, `#17191a` in dark), opened below the page rather than above it; `--wui-color-surface-segmented` keeps naming the inset indicator face. The convex reading survives because the chip stays lighter than the track in both appearances (WCAG luminance ratio 1.26:1 in light, 1.16:1 in dark), and the two variants no longer collapse onto one gray pair in dark: `inset` keeps its pressed-in `#3a3a3c` chip on a `#2c2c2e` track. Because the chip is pinned to the page tier rather than to whatever container holds it, a raised segmented placed on a `--wui-color-surface` card reads one step darker than that card in dark.
  
  Dark had the inset chip on the neutral control tier already; light did not. `--wui-color-surface-segmented` light default moves from `#e5e5ea` to `#dfdfdf`, so in both appearances the resting inset chip is the same face a `secondary` button uses (`--wui-color-surface-control`). The two variants now each pin one tier — `raised` to the page, `inset` to the control surface — and a spec asserts each equality against a live probe of the referenced token rather than a colour literal.
  
  Generated Markdown body text follows `--wui-font-size` instead of Notion's hard-coded pixel sizes, and tables take that size by inheritance, so a documentation page is no longer set larger than the components it documents.
  
  Every generated code block now carries a line-number gutter. `@greypan/md-to-comp` runs shiki's own `transformerRenderLineNumber` in the same `codeToHtml` pass that highlights the code, so the numbers come from the highlighter rather than from a CSS counter, and a line the gutter numbers is the line the reader can quote back. The generated `examples.css` styles the slot — `user-select: none`, a right-aligned column as wide as three digits, held at 45% of the surrounding colour in both appearances — so it neither joins a text selection nor competes with the code for attention. Injecting that text is the one exception to "the fence and the rendered block are the same bytes": the generator's round-trip self-check and both demos' visible-text assertions strip the gutter span before comparing, and the copy button clones the `<pre>`, drops those spans and writes the fence verbatim, so the clipboard still gets runnable source.
  
  An empty default-value cell in an API table is a `—` placeholder meaning "this member has no default", which is prose about the row rather than a literal a reader could write, so the corpus no longer wraps it in backticks and the demos render only real literals as inline code.
- 046addb: The `react` flavor's fence language is now `tsx` instead of `react`, so the corpus, the emitted demo file and the formatter all speak one name. ` ```react ` blocks were invisible to the formatter while the `.tsx` files they produced were governed by it, which left "the artifact equals the fence byte for byte" and "the artifact is formatted" only reconcilable by hand. `FLAVOR_LANG` is the single table behind the fence language, the shiki grammar id and the file extension, and the parser's error now names the language each flavor expects.
  
  Breaking for consumers of the module surface: `flavorExtension` is no longer exported from `@greypan/md-to-comp`, because the extension it returned was the same value `FLAVOR_LANG` already holds. Read `FLAVOR_LANG[flavor]` instead. The package is private and has no importer for that name.

## 0.0.1

### Patch Changes

- 9816fbd: feat(web-ui,md-to-comp): 命令式 API 的表格改用 `### Options` 小节，image-preview 的 option 表补全
  
  引擎的小节名来自宿主配置（`apiTables.columns` 的键），这次在两个 demo 各加一条 `Options`，列形状与
  `Props` 一样是四列。区别是语义：`Props` 记元素属性，`Options` 记命令式 API 的 option——`imagePreview()`
  与 `toast()` 都没有声明式契约，把它们的参数摆在 `Props` 标题下会让人以为那是元素属性。
  
  `packages/web-ui/docs/image-preview.md` 的这张表原本只有元素上的 9 个 `@property`，漏了
  `ImagePreviewOptions` 独有的三个（`index` 默认 `0`、`target`、`container`），正文里的示例却在用
  `index`（issue #360）。换成 `### Options` 后补成完整的 12 项，`images` 是必填项、默认值记 `—`。
  `packages/web-ui/docs/toast.md` 换成 `### Options`，放 `toast()` 接受的 9 项（`message` / `type` /
  `duration` / `closable` / `id` / `heading` / `position` / `target` / `container`）；只存在于元素上的
  `toastId` / `visible` / `no-close-button` 移到「直接使用元素」那条示例的说明里，不再混进同一张表。
  
  两个 demo 的 `ExampleDoc` 不再按小节名（原先写死 `'props'`）判断要不要渲染类型与默认值两列，改看这一节
  的行带不带 `type`——四列小节的行都由解析器补上这两个字段，所以列形状仍然只由配置声明一次；渲染端因此
  不必知道有哪些小节是四列的，新增 `Options` 也没有再改一处硬编码。`src/markdown.ts` 里那句「只有 props
  有类型与默认值两列」的注释跟着改成按小节列数表述。
- 9816fbd: feat(md-to-comp,web-ui,react-web-ui-demo,vue-web-ui-demo): `## API` 小节支持散文，README 独有的表格与行为说明搬进 `docs/*.md`
  
  `## API` 下的小节过去只有表格一种形状，列数还由渲染端按「这一节的行带不带类型」猜。现在解析端按配置
  分流：标题登记在 `apiTables.columns` 里的按表格解析，表头字面量与列数由那一项给出；没登记的按散文解析，
  正文整段渲染成 markdown HTML（行为说明、迁移说明、已知限制这类写在这里，正文里出现表格行即报错，那说明
  这一节的表头漏登记了）。列的语义按位置定——首列是名称、次列是富文本说明、第 3 列起都是普通值列——所以
  每一节有几列由配置说了算，不再受「四列 / 两列」两种形状限制。
  
  payload 随之从 `ExampleApiRow { name; descriptionHtml; type?; default? }` 换成 `rows: string[][]` 加
  `columns: { title; kind }[]`，`ExampleApiSection` 成为 `{ kind: 'table' } | { kind: 'prose' }` 的并集。
  两个 demo 的 `ExampleDoc` 改成照 `columns` 逐列渲染——名称列与值列进 `font-mono`、说明列走富文本——于是
  新增一节、给某一节多配一列都只是改配置，渲染端不再认识任何一节叫什么。
  
  同一件事在 README 与 `docs/*.md` 两处各写一遍是这轮要拆掉的重复。`packages/web-ui/README.md` 与
  `README.CN.md` 里只存在于 README 的内容——24 张 CSS 自定义属性表、theme 的 8 张 token 表（颜色与阴影两族
  各带浅色/深色两列）与 `### 返回 handle`、以及 72 段散文小节（行为说明、迁移说明、已知限制这类）——全部搬进
  对应的 `docs/*.md`，`docs/` 下因此多出 105 个小节。`## API 参考` / `## API Reference` 整段删除，两份 README 收成一张指向
  `docs/*.md` 的索引表。
  
  `### 返回 handle` 只收命令式 API 返回对象上的只读成员（`index` / `scale` / `images` / `closed`），
  同名的方法仍归 `### Methods`，避免同一件事在两节里各写一遍。
- 9816fbd: feat(md-to-comp): 示例文档换成 remark/shiki 引擎，带 `{#id}` 锚点的示例变成真组件
  
  原来 `scripts/generate-web-ui-examples.mjs` 是一根 1400 行的手写 markdown 解析棍：小节按行找、表格按
  `|` 切、代码着色靠自研 tokenizer（`.hl-tag` 那一套类名与取色都在脚本里）。它能把表格与组件源码
  join 住，但示例只能是静态代码块——页面上写着的 React/Vue 片段与屏幕上真正跑的 demo 代码来自两套人肉
  维护的源码，漂了没人报警。
  
  现在解析走 `unified`/`remark`（frontmatter 用 `remark-frontmatter`，正文用 `remark-rehype` +
  `hast-util-to-html`），着色走 `shiki` 的双主题（`github-light` / `github-dark`，`defaultColor: false`
  把颜色写成 `--shiki-light` / `--shiki-dark` 落在每个 token 上，取哪一边由生成的 CSS 跟着
  `web-ui-theme` 的 `resolved-appearance` 判，切外观不必重新生成）。引擎独立成私有包
  `@greypan/md-to-comp`：包内不出现任何宿主概念——围栏语言、API 表的表头与列数、锚点写法、产物目录、
  深色外观的祖先选择器全部由配置传入，内置 `react` / `vue` 两个 flavor（入口分别是
  `@greypan/md-to-comp/react` 与 `/vue`；再加一个要同时改 `FLAVORS` 表、生成模块里的 `html` 类型与
  `assertSelfContained` 的分支）。两个 demo 的 `vite.config.ts` 里挂上对应 flavor
  的 Vite 插件，dev 与 build 都按 markdown 重新生成，「改完文档要记得手跑一行命令」从开发循环里消失。
  仓库入口 `scripts/generate-web-ui-examples.mjs`（连同它的 `--check` 与给 fixture 用的 `--docs-dir` /
  `--out-dir`）一并删掉：它 `import` 的是已构建的 `dist`，`dist` 过期就静默跑旧引擎；新鲜度判据本来
  就已经在 app 的 `turbo test` 里（插件在 `VITEST` 下只判不改），篡改 fixture 搬进
  `@greypan/md-to-comp` 自己的单测（`generate()` 端到端跑；表格形状在 `markdown.spec.ts` 里对着
  `parseMarkdown()`），不再经 CLI。两个 demo 的运行时依赖图不变，
  仍然只吃 `src/generated/**` 那几份产物。
  
  API 表随之换成了单一来源。原来表格的名称与顺序取自组件源码（`@property` / `$events` / `<slot>`），markdown 只供中文描述；现在 316 行（Props 225、Events 43、Slots 48）的名称、说明、类型、默认值全部手写在那 37 份 markdown 里，读源码的 `src/component-source.ts`（336 行）与按名字 join 的 `src/join.ts`（51 行）一起删掉。列形状由 `API_COLUMNS` 逐小节定：Props 是四列（名称 / 说明 / 类型 / 默认值），Events 与 Slots 仍是两列——类型与默认值在那两张表里没有渲染位置，写了也没有消费者。删掉 join 换来的是「组件内部怎么重构都不会让文档隐形变更」，代价有两条：组件改了 API 时这张表要人跟着手改，没有脚本来提醒；从前由 join 做的三道核对（`tag` 与源码 `@customElement` 一致、`component` 解析得到真实的组件目录、表里的名字就是源码声明的那个 attribute）没有了。作为补回来的部分，表格的形状现在是硬判据：表头字面量、每行列数、空的名称/说明/类型/默认值、同表重名、API 小节正文里出现非表格行（漏了行首 `|` 的表格就是这一型）、有 `### Props` 标题却零表格行、`## API` 里三张表一行都没有——全部非零退出，不再出现「一节静默变成零行」。Events 那 39 个 `type` 字段从前生成却从未渲染，这次不再进 payload。
  
  live 通道按示例逐个开：标题写 `### 受控值 {#controlled}`，生成器就把那一段围栏落成
  `apps/{react,vue}-web-ui-demo/src/generated/demos/slider--controlled.<tsx|vue>`（落盘前 `trimEnd()` 再补
  一个行尾换行，mdast 的 code 节点值不含它），`ExampleDoc` 用 `import.meta.glob` 配
  `lazy` / `defineAsyncComponent` 把它挂成真组件。显示与执行同源这件事的机器判据钉在三处，各负责一段：引擎里
  `src/highlight.ts` 对最终 HTML 的往返（剥掉标记、一趟解完实体必须逐字等于输入）、
  `scripts/example-docs.test.mjs` 钉「落盘文件 == 围栏 + 行尾换行」与「payload 可见文本 ==
  围栏」、两个 demo 的 `example-doc.browser.spec.*` 把页面 `<pre>` 的可见文本逐条钉到那份落盘文件上（不是只钉其中一条）。这些落盘文件不在根
  `vite.config.ts` 的 `fmt.ignorePatterns` 里——它们是被真正编译执行的示例源码，格式与 lint 跟人手写代码
  同一口径，围栏写得不合规会在 `check-code` 上直接红。
  
  那个目录归生成器独占，每轮按本轮产出集合清扫：改了一个 `{#id}` 或删掉一条示例，上一轮那份文件会被删掉，
  测试期的 `checkArtifacts` 判到孤儿则让那次 `turbo test` 非零退出。本轮就撞见过一次——anchor 改名后留下的 `slider--vertical.tsx` 不被任何
  markdown 引用，上面那三条判据盖不到它，却被 `import.meta.glob` 收成了编进 dist 的死组件。
  
  插件在测试期只判不改：按 `process.env.VITEST` 分叉成 `checkArtifacts`，于是两个 demo 的 test 各多一道
  「产物 == markdown」的门，且与 dev / build 共用同一份写在 `vite.config.ts` 里的配置——不另立配置文件，
  也不让 spec 去 import 整个 vite config（整文件求值会把插件工厂无谓地跑一遍）。dev 与 build 走写盘那一支，
  但只有内容真变了才落盘（`writeIfChanged`），否则这次构建会改掉自己的输入哈希、从此拿不到 turbo 缓存，
  dev 下还会让宿主 watcher 绕回生成形成死循环。
  
  本轮只迁 `slider.md` 一篇作为试点：围栏改写成自带 `import { useState } from 'react'` / `import { ref }
  from 'vue'` 的完整用法形态。其余 29 篇没写锚点，因此只出高亮代码、照旧通过同一套新引擎，迁移可以逐篇
  推进而不断构建。`react` 侧要求 `export default function Demo()`、`vue` 侧要求含 `<template>` 的 SFC 且
  模板里有事件绑定/指令/插值时必须带 `<script setup>`，这些形状由 `src/sample.ts` 的 `assertSelfContained`
  挡住——把片段当文件发出去，症状是 demo 页面挂一个空壳组件。
  
  已知取舍：仓里还没授权引入 `remark-gfm`，而表格是 GFM 扩展、不在 CommonMark 里，所以 API 表目前仍按行
  读原文（`src/markdown.ts` 的 `readTableLines`，与旧脚本同口径）。表格改成手写之后这条取舍更值钱：
  联合类型必须写成 `'a' \| 'b'`，未转义的 `|` 会被当列边界；漏写行首 `|` 的表格会被读成零行，而零行现在
  是错误、不是一张空表。拿到授权后
  删掉它，改用 mdast 的 `table` 节点。真机测过从围栏到页面这一整条路——改 `slider.md` 的围栏后不动任何
  命令，React 与 Vue 两侧都不整页刷新，组件示例和 `<pre>` 的可见文本同时换成新内容。
- 9816fbd: chore(md-to-comp,react-web-ui-demo,vue-web-ui-demo): 示例这条链上的命名一个词只表一件事
  
  原来同一个东西挂两个词：页里的一条示例在引擎内部叫 `sample`（`SampleBlock`、`doc.samples`、`sample.ts`），
  产物类型与 DOM 上却叫 `ExampleSamplePayload` / `ExampleSample` / `data-example-sample`。现在按层级分死：
  
  - 一篇语料 = example：`ExampleDoc`、`exampleDocs`、`src/generated/examples.ts`、`data-example-doc|intro|api`
    一律不动（路由文件、产物文件名、页面标记都保持原样）。
  - 页里的一条示例 = sample：`ExampleSamplePayload` → `SamplePayload`，写进宿主 `src/generated/examples.ts`
    的 `ExampleSample` → `Sample`，页面标记 `data-example-sample` → `data-sample`、
    `data-example-preview` → `data-sample-preview`。
  - 按锚点落成的组件源码文件 = demo：`demos/`、`demoKey`、`demoFileName`、`emitsDemoFile` 不变。
  - 围栏语言 = flavor：`SampleFlavor` → `FenceFlavor`——它指的是 `tsx` / `vue`，与「一条示例」无关，
    旧名把两件事混在一起。
  
  `packages/md-to-comp/src/markdown.ts` 里那条 `## 示例` 小节的局部名也跟着改成 sample 系
  （`EXAMPLES_SECTION` → `SAMPLES_SECTION`、`examples` → `samplesSection`、`exampleGroups` → `sampleGroups`），
  报错文案与 `## 示例` / `## API` 的中文小节名不动。行为零变化：产出的 `examples.ts` / `examples.css`
  除类型名外逐字节相同，页面渲染不变。
  
  顺带修掉两个在同一批全量测试里暴露的既有缺陷（都不是这次改名引入的）：
  
  - `highlight.ts` 不再走 shiki 的 `codeToHtml` 懒加载快捷方式，改为自建高亮器并在初始化时预热：
    模块冷启动后的**第一次**调用会返回一份着色错乱的 HTML（同一进程、同一输入能给出两种字节），
    而产物校验比的是字节，「生成物与 markdown 不一致」于是会随机报在一份没被改过的产物上。
    一轮 `turbo build test` 会起多个进程、每个进程冷启一次，冷启后的第一次调用因此每轮都出现好几回——
    修复前的七轮全量运行里五轮报过这条不一致，修复后的三轮为零。
  - `vue-web-ui-demo` 的 `example-doc` browser spec 里 `mountDemos` 用上与 React 面相同的 8 秒等待预算：
    第一份 demo 的 dynamic import 是冷的，vitest 默认的 1 秒在高负载下不够，会以「挂载 0 个」随机红。
- 9816fbd: feat(md-to-comp): 子组件补上 API 语料，覆盖守卫不再要求「一页一文档」，`## API` 小节改为可省
  
  `radio-group` / `checkbox-group` / `button-group` / `option` / `dropdown-item` / `dropdown-divider` /
  `dropdown-header` 这 7 个组件此前只在父组件的示例里露过面，自己没有语料，于是页面上没有一棵属于它们的
  API 表。这次按它们实际被用在哪儿补语料：radio 页渲染 `radio-group`，checkbox 页渲染 `checkbox-group`，
  button 页渲染 `button-group`，select 与 autocomplete 两页渲染 `option`，dropdown 与 context-menu 两页
  渲染 `dropdown-item` / `dropdown-divider` / `dropdown-header`。示例按 live 口径写——每节都带 `{#id}`
  锚点、围栏是自包含的完整组件源码，两侧各落成一份 `src/generated/demos/<component>--<id>.<tsx|vue>` 并在
  页面上挂成真组件。语料至此 37 篇（Props 225 行、Events 43 行、Slots 48 行），其中 8 篇带锚点。
  
  `scripts/example-docs.test.mjs` 的覆盖守卫从「路由 ↔ 页面 ↔ markdown 一一同名」改判四条：路由名集合
  == 页面名集合；每个路由 / 页面仍渲染自己那份 `<ExampleDoc component="<自己的名字>" />`；每份 markdown
  至少被一个页面渲染；`<ExampleDoc component="X">` 引用不存在的 markdown 非零退出。第 2、3 条合起来仍然
  挡住「加了页面却没有文档」与「加了 markdown 却没人渲染」，只是不再要求 1:1——`dropdown-item` 一条语料被
  两个页面渲染就是这一型。四条判据都在同一份脚本里配了合成输入的负例，判据自己写错（例如把 `includes`
  写成恒真）时会当场红。
  
  引擎侧跟着放宽一条：`## API` 小节由必填改为可省。整段省略是「这个组件没有对外契约」的明确声明
  （`web-ui-dropdown-divider` 只有一条 divider，没有属性、事件与插槽），页面在 `api` 为空时整段跳过、不留
  一个空标题。小节一旦存在就仍须有数据行——「留着标题却没有表格行」只会在页面上渲染成一个空标题，照旧
  非零退出。
