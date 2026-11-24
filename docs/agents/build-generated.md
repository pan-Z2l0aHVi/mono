# 生成链路与校验

本文件承接 [`build.md`](./build.md) 的生成物切面：build 与 test 各自的生成职责、确定性要求、Build 之前的那道只判不改校验，以及壳文案与 bindings 两条旁路。哪些文件是生成的、由谁生成、怎么重新生成，只在 [`generated-artifacts.md`](./generated-artifacts.md) 维护；本文不复述清单。

## 文档语料：输入与消费者

[`packages/web-ui/docs/*.md`](../../packages/web-ui/docs/)、[`packages/web-ui/CHANGELOG.md`](../../packages/web-ui/CHANGELOG.md) 与 `packages/web-ui/README*.md` 是 demo 文档 meta 与代码文件的输入（中文源是 `<name>.CN.md`，英文译文是 `<name>.md`）。generator 在 dev 与 build 时写盘，测试期只判不改；文档 demo 与 `web-ui` 的 parity 测试保证产物与 markdown 一致。改动组件 API 必须同时改对应 markdown。生成器的输入契约与校验规则以 `@greypan/md-to-meta` 的测试为准，宿主侧的呈现契约（示例小节、API 表、语种）以各文档 app 的测试为准。

这些语料是 `web-ui` 的 **test** 输入（build 不读 docs，`files` 只有 `dist`）；demo 侧的 build 与 test 才把它们当真输入。根 [`turbo.json`](../../turbo.json) 排除 Markdown，`web-ui` 包级 [`turbo.json`](../../packages/web-ui/turbo.json) 的 `test` 重新纳入，并由 `pnpm run check-policy` 中的 `web-ui-docs-inputs` 检查守护（只校验 `test`）。语料目录布局与 `test.inputs` 名单的对应关系以该策略为准，新增或移动语料时先看它。

## 确定性

同一份输入与配置必须生成同一份完整字节；机器负载或调度耗时不得决定着色、解析等生成结果。预热和复跑通过不能证明确定性，涉及时间预算或部分结果降级的生成链要用可控调度验证完整产物；仅校验可见文本无法证明着色 HTML 一致。

## Build 之前的生成物校验

CI 在 Build 步之前经各文档 demo 的 `check-generated` turbo 任务以同一份插件配置只判不改地校验产物，紧随其后的 `check-generated-parity` 根任务校验跨 app 对齐：Build 的写盘会把失步产物原地治愈，测试档里的判据到那时永远空转，所以两类检测都要抢在 healing 之前。判据与测试档同源（`@greypan/md-to-meta` 的 `checkArtifacts`），配置直接 import 各 demo `vite.config.ts` 的 `mdToMetaOptions` 与可选的 `mdToMetaAdditionalOptions` 具名导出，不抄第二份。README 单独生成到 `src/generated/readme/`，其代码片段不作为示例执行。相邻的 `npm`、`pnpm`、`bun`、`yarn` 围栏中出现至少两种不同名称时，demo 将其合并为可切换的代码块；其他内容或重复名称结束当前组。

跨包不变量不住包测试，而由根级任务持有：跨 app 的「各 demo 生成物同源、页面结构对齐」由根级 turbo 任务 `//#check-generated-parity` 判定（本地入口 `pnpm run check-generated-parity`，脚本在 [`scripts/checks/check-generated-parity.mjs`](../../scripts/checks/check-generated-parity.mjs)，只用 Node 内置模块、可在 Build 前运行）；跨包 token 一致性（`app-scrollbars` 回退值 ↔ `web-ui` theme 浅色 token）由 `pnpm run check-policy` 的 `theme-token-parity` 判定。根任务的 `inputs` 列了 `scripts/checks/**` 与各文档 demo 的 `src/generated/**`、页面目录（React `src/routes/components/**`、Vue `src/pages/components/**`）：parity 脚本新增外部 import 时必须同步更新这份 inputs，否则缓存会静默陈旧。`doc-demo-kit` 的 nav ↔ `web-ui/docs` 单向存在性契约由 `testing` 子入口的 `runNavCorpusContractTests({ docsDir })` 提供，各文档 demo 在各自 test 里注入语料目录；跨包输入因此落在 demo 的 `test.inputs`，`doc-demo-kit` 自己的测试不再读仓库文件，也不再需要包级 `turbo.json`。

## 生成与测试的执行顺序

读取生成物的测试与会改写同一路径的生成任务必须有明确的执行依赖，不能并行读写：生成器由本 workspace `build` 承担时，`test` 须依赖该 `build` 并保留适用的上游依赖。`inputs` 只影响缓存哈希，不建立执行先后，不能替代 `dependsOn`。

同一个 workspace 的 `build` 若在运行中重写 tracked 生成物，那份产物必须从同类任务的 `inputs` 里排除，只保留它真正的上游（生成器、源文件与模块文件）。turbo 在 run 开始时就固定 hash，写盘发生在之后：生成物留在 `inputs` 里，下一次 run 会拿到与上一次不同的 hash，每次生成内容变化都要多付一次必然 miss。`apps/interweave` 的 `frontend/bindings/**`、`frontend/auto-imports.d.ts` 与 `frontend/typed-router.d.ts` 按这条处理——两个 `build` 与 frontend `test` 都排除它们，用 Go 源、`go.mod`/`go.sum`、bindings generator 与前端源文件表达真正的因。当前 pinned 的 Turbo 已提供 deferred hashing（`mode: "jit"` inputs），但此处不采用：JIT 在依赖完成后、当前 task 执行前取 hash，而 bindings 由该 `build` 脚本自身生成，时机仍早于写盘。要让 JIT 生效必须把 generator 拆成上游 task，并同步改造 policy 依赖的 dry-run hash 判据，需另起任务评估。

## 壳文案（wuchale）

React 与 Vue demo 的**壳文案**（TSX / SFC 中的界面文字）走另一条链：`wuchale` 从源码抽取 msgid，中文为源、英文为译文，落进 `apps/{react,vue}-web-ui-demo/src/locales/<locale>.po`。PO 是入库的译文源、手写不生成；catalog 与 loader（`src/locales/.wuchale/**`、`*.loader.js`、`data.js`、`plural.js`）由 Vite 插件按 PO 重编译，全部 gitignore。dev 与 build 只编译不抽取，所以**增删壳文案必须显式在应用目录跑 `pnpm exec wuchale --clean`** 把新 msgid 写进 PO，否则构建默默用旧语料出页面。`--clean` 会顺带移除代码里已不再引用的条目；不得用 `--modify`——它把译文写回源码，而源码里的中文才是唯一原文。PO 是 tracked 文件，天然在 `$TURBO_DEFAULT$` 里，不需要像 Markdown 那样重新纳入。

壳文案的一致性由各文档应用的 `catalog.spec.ts` 随 `pnpm run test` 验证：各应用用 `@greypan/monorepo-kit` 的 `defineShellI18nCatalog` 声明自己的应用目录、语种与 PO 目录，把它 `.use()` 进一条 `defineRunner()` 链、链尾接 `defineCatch()`，再 `run()`。它分别把每个应用的两份 PO 复制到临时目录、按 `wuchale.config.js` 的 glob 重跑一次抽取，然后逐项检查：en 有空译文、en 与 zh 的 msgid 集合不等（缺译或多译）、PO 里残留 `#~` 废弃条目、代码里有中文没进语料、语料里有中文代码里已不再引用。`wuchale status` 与 `check` 只看 PO 自身，看不见新加的源码文案，也判不出空译文，所以这条检查补的是它够不到的那一半。

测试由 Turbo 的 `^build` 先准备适配器产物；各文档 demo 的 test inputs 包含共享检查实现，修改它会使测试缓存失效。

Vue demo 通过私有 `@greypan/wuchale-vue` 在 Vue 编译前转换 SFC。`wuchale.config.js` 只提取手写壳文案，排除 `src/generated/**`；正文与运行示例继续由 md-to-meta 生成双语输出。语言控制器先准备 catalog、文档与当前页示例，再统一提交；不修改 wuchale 核心。安装版 wuchale 按 Vite mode 判定 build，Vue build 脚本显式使用 `--mode build`。

## Wails bindings

`apps/interweave/frontend/bindings/**` 的生成边界与产出集合守卫见 [`generated-artifacts.md`](./generated-artifacts.md)；本文只记 frontend 的 turbo inputs 由 Go 源、Go 模块文件与 bindings generator 构成，改这些输入或 generator 时同步以免缓存陈旧。
