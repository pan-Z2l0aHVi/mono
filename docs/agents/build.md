# 构建与 CI

修改包脚本、Vite/Turbo 配置、外部化或 CI 流程时，先读本指南；这些细节变化时，在同一变更里更新本文档。包清单、依赖边界与发布边界以 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为权威，本指南描述包级构建、生成物生命周期与 CI / workflow 拓扑。发布流程（changesets、PR、review、合并后验证）在 [`release.md`](release.md)；发布**禁令与首次发布工具**在本文末尾，那几条不归 `release.md`。worktree 的初始化、共享缓存与 shell 激活边界由 [`worktree.md`](worktree.md) 承担。

## 各包命令

可构建的包都有 `build`，多数有持久监听的 `dev`。`build`、`test`、`dev` 是 turbo 任务，用 `pnpm exec turbo <task> --filter=@greypan/<name>` 运行，turbo 按 `^build` 先建好上游依赖；裸 `pnpm --filter` 绕过这一层，会用到陈旧或缺失的 `dist`。其余脚本（例如 `generate-icons`）用 `pnpm --filter @greypan/<name> <script>` 直接跑。影响面定位用 contract-change-review skill 的 `verify` 查询，语义见 `agent-context.md`。全量根命令由 CI 在 pull request 上执行，本地只在复现全仓范围问题时运行。

`check-pack` 在构建可发布 package 或修改其 `exports`、`files`、Vite 输出时，于根构建成功后运行。它用 `pnpm pack --dry-run` 验证实际发布文件与 manifest export targets，不判断 API 语义或版本级别。

## Demo 开发

| 应用                 | 开发命令                     |
| -------------------- | ---------------------------- |
| React Web UI demo    | `pnpm dev:react-web-ui-demo` |
| Vue Web UI demo      | `pnpm dev:vue-web-ui-demo`   |
| Interweave Wails app | `pnpm dev:interweave`        |

根目录 aliases 通过 Turbo `dev` task 构建上游工作区包，并启动每个包的持久 `dev` 进程。不要改用 `turbo watch`：包级 Vite 与 tsdown 监听器已经会重建源文件变更，`turbo watch` 还会监控 Git 控制文件，编辑器或 agent 工具更新工作树时可能重启全部 dev 进程。修改包图、lockfile 或 Turbo 配置后需重启开发命令；普通源文件变更由运行中的包级监听器继续处理。

Interweave 由 Wails 宿主管理嵌套前端，其 alias 只启动 Wails host，并构建/监听 WebView frontend 的上游依赖，不要额外启动重复的前端进程。修改 Vite 插件、TypeScript 配置或工作区依赖图后需重启宿主进程。

## 生成物生命周期

生成文件不是 source of truth，禁止手动编辑，但这不等于禁止使用仓库配置的 generator。本仓的 `build` 不止编译一步：`vp build` 期间会有插件或前置脚本产出受版本控制的生成物。若源码或配置的变更会影响这些生成物，必须运行所属 generator 让工具产生 diff，再验证生成结果与消费者。不要用复制、补丁或格式化工具直接改写输出。

构建期自动生成的有四类：`web-ui` 的图标模块由 `buildStart` 钩子生成；React demo 的路由树由 TanStack Router 插件生成；Vue demo 与 interweave frontend 的路由类型与 auto-import d.ts 由 `vue-router/vite` 与 `unplugin-auto-import` 生成；interweave frontend 的 TS bindings 由构建前置的 `generate-bindings.mjs` 生成。

另有一类生成物也受版本控制，但由两个 demo 的构建自己产出：输入只有 [`packages/web-ui/docs/*.md`](../../packages/web-ui/docs/)，API 表的名称 / 说明 / 类型 / 默认值全部手写在那份 markdown 里，组件源码不参与生成，所以改了组件 API 之后表格不会自己跟上。引擎是私有包 `@greypan/md-to-comp`（不进任何 demo 的运行时依赖图），两个 demo 的 `vite.config.ts` 里各挂一个 flavor 的 Vite 插件：`buildStart` 写盘、`configureServer` 给输入目录挂 watcher，所以 dev 与 build 都会重新生成，改完 markdown 不必手跑命令。测试期（`process.env.VITEST`）分叉成只判不改，于是两个 demo 的 `turbo test` 各自带一道「产物 == markdown」的断言，且与 dev / build 共用同一份写在各自 `vite.config.ts` 里的配置——不另立配置文件，也不让 spec 去 import 整个 vite config。写盘只在内容真变了时才落（`writeIfChanged`）：无条件覆写会改掉这次构建自己的输入哈希，从此拿不到 turbo 缓存，dev 下还会让宿主 watcher 绕回生成形成死循环。

语料住在它描述的那个包里，所以缓存闭包得由包自己重开：根 `turbo.json` 的 `!**/*.md` 把 md 排除在哈希外，而排除项是绝对的、包含扳不回来，于是 [`packages/web-ui/turbo.json`](../../packages/web-ui/turbo.json) 覆写本包 `build` 与 `test` 的 `inputs`——语料重新进哈希，四篇散文 md（`README.md` / `README.CN.md` / `AGENTS.md` / `CHANGELOG.md`）按名字排掉，`build` 原本从根定义继承的 `!**/*.spec.ts` / `!**/*.test.ts` / `!**/__tests__/**` 也因为整表替换而在这里重写一遍。代价是改一篇语料会让 `@greypan/web-ui` 的 `build` 与 `test` 连同每个依赖它的包一起重算（一次约 175s），这是「文档跟组件同包」换来的。两个方向都由 [`.agents/checks/web-ui-docs-inputs`](../../.agents/checks/web-ui-docs-inputs) 守着：包内多出一篇名单外的 md，覆写里出现能盖住语料的排除项（例如把 `!**/*.md` 抄回来，或写成锚定的 `!/docs/**`），都直接红。

语料 join 的判据分三处住，各自贴着被测的那一侧：两个 app 各自的 `src/__tests__/example-docs.spec.ts`（接入各自的 `turbo test`）判「示例显示 == markdown 围栏」「带锚点的示例落成可编译文件（落盘 == 围栏 + 行尾换行）」与本侧的页面 ↔ 语料覆盖（每个页面渲染自己那份、每份 markdown 至少被本侧渲染一次、引用必须存在）；跨 app 的一半住在语料所有者 [`packages/web-ui/src/__tests__/generated-parity.spec.ts`](../../packages/web-ui/src/__tests__/generated-parity.spec.ts)——两端 `examples.{ts,css}` 逐字节一致、路由名集合 == 页面名集合，外加几条把「手写值列从 markdown 一路走到产物」钉住的语料判据。生成器那侧的判据在 `@greypan/md-to-comp` 的单测里：篡改与孤儿对着 `generate()` 端到端跑（`generate.spec.ts`），表格形状对着 `parseMarkdown()` 跑（`markdown.spec.ts`）；新鲜度由两个 app 的 `turbo test` 判，那里插件走 `checkArtifacts`。spec 直接 import 生成的 TS 模块与引擎导出（`demoFileName` / `demoFileContent` / `visibleText`），从前根 `scripts/example-docs.test.mjs`「node 读不了 TS、只能拿正则抠 JSON 字面量」的那层 hack 随拆分消失。

那份 markdown 的形状就是生成器的输入契约：frontmatter 写 `component` 与 `tag`；`### <示例名>` 各带一个 `react` 与一个 `vue` 代码块；`## API` 下的小节分两种——标题登记在 `apiTables.columns` 里的按表格解析，表头字面量与列数由那一项给出；没登记的按散文解析，正文整段渲染成 markdown HTML（行为说明、迁移说明、已知限制这类都写在这里，正文里出现表格行即报错，说明这一节的表头漏登记了）。列形状按位置定：首列是名称、次列是富文本说明、第 3 列起都是普通值列，所以 `### Props` / `### Options` 是 `| 名称 | 说明 | 类型 | 默认值 |`，`### Events` / `### Slots` / `### Methods` 是 `| 名称 | 说明 |`，名称就是页面上要显示的那个 attribute / 选项名 / 事件名 / slot 名 / 方法名——写成什么就显示什么，已经没有源码来核对它写得对不对。元素属性归 Props，`imagePreview()` / `toast()` 这类没有声明式契约的命令式 API 的选项归 Options；渲染器不再靠「这一节的行带不带类型」猜列，而是照配置逐列渲染，每一节的列数因此由配置说了算（`返回句柄` 是 `| 名称 | 说明 | 类型 |`，theme 的颜色与阴影 token 表多出浅色/深色两列）；Methods 与 Events 同形但记的是另一件事：组件对外的公开方法调用形态 —— 元素实例方法、静态方法与命令式 API 返回句柄上的方法都算（名称写成 `show()` / `replay(options?)` 这样的调用形态，静态方法带类名写成 `WebUiSpinner.show()`，不是裸属性名），没有方法的组件就不写这一节；Events 的 `CustomEvent<…>` 从前由源码生成、写进 payload 却一个字节都不显示，手写之后就没有为它新增人工维护的理由。表头字面量、每行的列数、空的名称/说明/值列、同一张表里重名，**任一条不符都直接非零退出**，宁可拦下生成也不让表格静默缺格；小节级别同一条口径——表格小节的正文只允许表格行（漏了行首 `|` 的行过去既读不成表格也不报错，实测能把 14 行截成 2 行）、只有标题没有表格行、散文小节正文为空、`## API` 里一个小节都没有，全部非零退出；`## API` 整段省略则是合法的——它就是「这个组件没有对外契约」的声明（`web-ui-dropdown-divider` 只有一条分隔线），渲染层在 `api` 为空时整段跳过、不留一个空标题，而小节一旦存在就仍须有内容（表格小节要有数据行，散文小节要有正文）。覆盖面到此为止：把 `### Props` 连标题带表一起删掉、只剩 Events / Slots 是判不出来的——没有源码可比，谁也不知道这个组件本该有一张 Props 表，页面少一张表这件事只剩 review 兜。反过来，源码那边也不再报警：删掉源码解析一并删掉了 join 提供的三道核对（`tag` 与 `@customElement` 是否一致、`component` 是否解析得到真实的 `packages/web-ui/src/components/<name>/`、表格里的名字是否就是源码声明的那个 attribute），剩下的判据（引擎单测，以及两个 app `turbo test` 里的 `checkArtifacts`）都只保证产物等于 markdown。值列在 markdown 里就是原样字符串（页面按 markdown 的列序逐列渲染，名称列与值列进 `font-mono`，说明列走富文本），union 类型的竖线必须转义成 `\|`——未转义会被当列分隔符切出多余列，生成器再把 `\|` 还原成字面竖线。示例代码与 API 表由同一个生成器产出后，两个 demo 各渲染自己那一份 `flavor`（react / vue），样式文件逐字节相同。

示例标题尾部的 `{#id}` 是这条示例的 live 开关。写了锚点，生成器就把那一段围栏落成 `apps/{react,vue}-web-ui-demo/src/generated/demos/<component>--<id>.<tsx|vue>`（落盘前 `trimEnd()` 再补一个行尾换行：mdast 的 code 节点值不含行尾换行，而文本文件与格式化器都要它有），两端 `ExampleDoc` 用 `import.meta.glob` 配 `lazy` / `defineAsyncComponent` 把它挂成真组件；页面上 `<pre>` 显示的、落盘文件里的、围栏里的必须是同一份源码（两个 demo 的 `example-docs.spec.ts` 按文件名逐个断言前两者，`example-doc.browser.spec.*` 再把页面 `<pre>` 的可见文本逐条钉到那份文件上）。因此围栏得是能独立编译的完整用法：react 侧以 `export default function Demo()` 自带组件包装、并 import 自己要用的 `useState`；vue 侧是含 `<template>` 的 SFC，模板里出现事件绑定、指令或插值时必须有带 `setup` 独立属性的 `<script>` 块声明来源。没写锚点的示例只出高亮代码——这是 39 篇文档能逐篇迁移、中途不打断构建的原因。`src/generated/demos/**` 不在根 `vite.config.ts` 的 `fmt.ignorePatterns` 里：它们是被真正编译执行的示例源码，格式与 lint 跟人手写代码同一口径，所以围栏写得不合规会在 `check-code` 上直接红，而不是靠生成器代为格式化。那个目录归生成器独占，每轮按本轮产出集合清扫：改了 `{#id}` 或删掉一条示例，上一轮那份文件会被删掉，测试期 `checkArtifacts` 判到孤儿会让那次 `turbo test` 非零退出——孤儿不被任何 markdown 引用、上面那组字节断言盖不到它，却照样被 `import.meta.glob` 编进构建。

| 场景                       | source of truth                                            | 受控生成入口                                                                                                                                                           | 完成证据                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 文件路由             | `apps/react-web-ui-demo/src/routes/**` 与 `vite.config.ts` | `pnpm exec turbo build --filter=@greypan/react-web-ui-demo`（TanStack Router Vite plugin）                                                                             | `src/routeTree.gen.ts` 仅由 generator 更新；`check-code` 通过，并在真实浏览器访问新增/修改的路由。                                                                                                                                                                                                                                                                                                                                                                   |
| Vue 文件路由与 auto import | Vue 源码与两个 Vue 应用的 `vite.config.ts`                 | `pnpm exec turbo build --filter=@greypan/vue-web-ui-demo` 或 `--filter=@greypan/interweave-frontend`（`vue-router/vite` 与 `unplugin-auto-import`）                    | `auto-imports.d.ts`、`typed-router.d.ts` 仅由 plugin 更新；`vue-tsc --build` 与受影响路由/页面验证通过。                                                                                                                                                                                                                                                                                                                                                             |
| Wails frontend bindings    | 公开 Go API、`apps/interweave/frontend/package.json`       | `pnpm exec turbo build --filter=@greypan/interweave-frontend`（构建前置经 `apps/interweave/scripts/generate-bindings.mjs` 调 `wails3 generate bindings`）              | 核对 `frontend/bindings/**` 的 generator diff，并运行 frontend 类型检查/构建和受影响调用点验证。                                                                                                                                                                                                                                                                                                                                                                     |
| web-ui icons               | `packages/web-ui/icons.used.json`                          | `pnpm --filter @greypan/web-ui generate-icons` 或 `pnpm exec turbo build --filter=@greypan/web-ui`（`buildStart` 钩子）                                                | 图标模块只由 generator 更新，并完成 package build 与公开契约验证。                                                                                                                                                                                                                                                                                                                                                                                                   |
| demo 示例文档              | `packages/web-ui/docs/*.md`                                | `pnpm exec turbo build --filter=@greypan/react-web-ui-demo` 或 `--filter=@greypan/vue-web-ui-demo`（插件 `buildStart`；引擎 `@greypan/md-to-comp` 由 `^build` 先构建） | `apps/{react,vue}-web-ui-demo/src/generated/examples.{ts,css}` 与 `src/generated/demos/**` 只由 generator 更新（本轮没产出的 demos 文件会被删掉），两个 app 的 `examples.{ts,css}` 逐字节一致；两个 app 的 `example-docs.spec.ts` 断言围栏字节 == 落盘文件（差一个行尾换行）== payload 可见文本、本侧页面 ↔ markdown 没有孤儿引用，`web-ui` 的 `generated-parity.spec.ts` 断言两端逐字节一致且路由 / 页面两侧集合相等；`turbo test` 下插件只判不改，同样会拦下漂移。 |

`apps/interweave/frontend/bindings/**` 的生成只走一个入口 `node apps/interweave/scripts/generate-bindings.mjs`：`apps/interweave/build/Taskfile.yml` 的 `generate:bindings` 与 `apps/interweave/frontend` 的 `build` / `build:dev` 都指向它。该入口做两件事：

- 以 `-clean=false` 生成。`wails3` 的 `-clean` 不是先删目录再重建，而是先生成到临时目录、再逐文件同步；同步的删除阶段会删掉这一次没产出的文件，而包加载或类型检查问题只记 Warning、命令仍 exit 0。危险形状是 exit 0 的静默少产出，会删掉受版本控制的 bindings，`-clean=false` 让写入阶段完全没有删除。代价是不再清理陈旧生成物：改名或删掉一个 Service 后旧文件会留在 `bindings/` 里，需要人工 `git rm`。直接写 `bindings/`（而非临时目录加同步）在 dev server 开着时会产生 HMR 事件，但没有 delete 加 recreate 环，不触发 chokidar 的重命名循环。
- 生成前后对 `bindings/**` 做产出集合收缩守卫：生成前快照（相对路径加内容），生成后只要少了文件就把目录精确还原到快照并以非零退出。它按产出集合判定、不看退出码，挡的是工具删文件这一形状。在 `-clean=false` 下 wails3 不再有删除阶段，这条分支基本不会被触发，它更像一个「wails3 若改了语义就报警」的哨兵。陈旧生成物不由守卫处理，守卫只因少了文件报警，不因多了陈旧文件报警。

`**/__screenshots__/` 与 `**/.vitest-attachments/` 是测试证据，不是应用代码生成物。除非任务明确要求并已完成对应的视觉或浏览器验证，不要创建、手改或提交。根 [`AGENTS.md`](../../AGENTS.md#不可绕过的仓库边界)在入口层声明同一约束，本节承载处方。

## TypeScript 配置

共享配置在 `packages/tsconfig/`，通过 `"extends": "@greypan/tsconfig/<profile>.json"` 引用，各 profile 与使用者以该目录为准。面向 DOM 与 Node 的包把配置拆成 `tsconfig.node.json`、`tsconfig.app.json` 和 `tsconfig.vitest.json`，纯 Node 包只用单个 `tsconfig.json`。每个包添加自己的 `include`、`paths` 与 `tsBuildInfoFile`。

## 库构建模式

单入口包用 `vp pack`（基于 tsdown，输出 `.mjs` 与 `.d.mts`，无需 `vite-plugin-dts` 即生成声明文件，并从依赖中自动外部化）。子路径导出包用 `vp build`（Vite library 模式配 `preserveModules`，输出 `.js` 与 `.d.ts`，用 `vite-plugin-dts` 生成声明文件，需要手动配置外部化）。`packages/tsconfig` 无构建步骤，它提供通过 TypeScript `extends` 消费的 JSON 文件。

## 外部化规则

匹配 `@greypan/*` 的工作区依赖与 Node 内置模块（例如 `node:path`）必须外部化，这保证监听模式可解析，并避免重复的消费端代码。第三方依赖在设计意图为零配置消费时可以打包，期望消费端自行提供时外部化。优先用正则而非工作区包列表，并让它同时匹配子路径导入（例如 `/^lit($|\/)/`）。逐包的外部化清单以各包 `vite.config.ts` 为准。

## 应用

两个 demo 与 `web-ui` 共享同一 browserslist 目标（Chrome/Edge >=111、Safari/iOS >=16.4、Firefox >=128、非 dead），与 Tailwind v4 的支持矩阵一致。`web-ui` 是唯一在构建时输出 CSS 的包，其静态 `color-mix()` 由 lightningcss 求值，含 `var()` 的 `color-mix()` 作为运行时 CSS 保留并依赖上述目标。库包（`js-kit`、`browser-kit`、`test-kit`、`deps-reload`、`unplugin-web-components`）只含 JavaScript、不输出 CSS，因此没有 `browserslist` 字段，统一声明 `engines.node >=20.11.0`：该下限覆盖 `deps-reload` 的 `import.meta.dirname`（Node 20.11+），并与 vite/vitest 的 peer 范围（^20.19 / ^20）对齐。

两个 demo 用 `basicSsl()` 给 dev server 开 HTTPS 是为拿到安全上下文：Service Worker 与 `navigator.clipboard` 只在安全上下文可用，而 demo 设了 `server.host: true`，从非 localhost 地址访问时 http 不满足条件。该插件只作用于 dev server，生产构建不受影响。各 demo 的插件、测试面与构建差异以各应用 `vite.config.ts` 与 [`verification.md`](verification.md) 为准；组件契约与浏览器运行时行为由 `web-ui` 的测试面与浏览器验证承担。`depsReload` 监听库的 `dist/` 目录，本地依赖变化时触发整页刷新。嵌套 WebView 前端的集成应用遵循对应框架 demo 的 Vite 插件与本地包约定，宿主运行时的插件负责生成其绑定。

## CI 门控与 workflow 拓扑

真实的触发面、`permissions`、job `needs`/`if`、step `id`、发布分支字面量、桌面构建矩阵与安装面只写在 `.github/scripts/ci-topology.mjs`，同目录的 `ci-topology.test.mjs` 把每个 workflow 的真实 YAML 读回来逐字段比对，由 `ci:test-scripts` 与 CI 的 `check` 强制。该声明也固定 `check` job 内的 `Check repository policies` step：四条 CI policy 命令由 `scripts/check-policies.mjs` 导出的 `POLICY_CHECKS` 派生，排除由 `check-code` 覆盖的 `format-clean`；真实 workflow 明确顺序执行四项，不能条件跳过或忽略失败。改任何一项而不改那份声明，`check` 就红；守卫里引用了不存在的 step `id` 也会红，因为这类引用在 Actions 里不报错，只会让那一步永远静默跳过。

- 一次运行是「等审批」还是「排队」，看 `gh api repos/<owner>/<repo>/actions/runs/<id> --jq '{status,jobs:.jobs.total_count,run_started_at,created_at}'`：`jobs.total_count == 0` 且 `run_started_at == created_at` 才是挂起等批准。某个 step 是否真的换掉了，看它在运行里整条消失（`gh api repos/<owner>/<repo>/actions/runs/<id>/jobs --jq '.jobs[].steps[].name'`），`if` 为假的 step 仍显示 `skipped`。
- `ci.yml` 的 PR 运行与手动触发运行共享一个 `concurrency` 组（workflow 名加分支），但 `cancel-in-progress` 只能取消仍在飞行的那一次：先启动的运行若已结束，后启动的那次仍会完整跑一遍。`workflow_dispatch` 只用于人工重跑：版本 PR 由 `GITHUB_TOKEN` 创建，其 `pull_request` 运行要等有人点「批准并运行」，批准后同一 run id 以 `run_attempt=2` 起跑，所以版本 PR 上 attempt 大于 1 是批准痕迹，不是 flake 重试；从未批准的运行停在 `attempt=1` 且 `jobs.total_count == 0`。
- `npm-publish.yml` 仅发布公共 npm 包，发布成功后一个独立的最小权限作业为每个包版本创建幂等的 GitHub Release 与标签。npm Trusted Publishing 通过 OIDC `job_workflow_ref` 绑定到工作流文件路径，重命名或移动 `npm-publish.yml` 会使注册失效，即使设了 `id-token: write`，`pnpm changeset publish` 也会因 `ENEEDAUTH` 失败；重命名要在同一变更里更新 npmjs.com 上的 trusted publisher。
- `deploy-pages.yml` 每个条目是 `apps/<name>` 目录，服务路径为 `/mono/<name>/`，构建用 pnpm 的 `{./apps/<name>}...` 目录选择器而非包名。站点没有根落地页。每个 demo 的 History 路由深层链接依赖 GitHub Pages 的 404 回退：未匹配请求路由到根 `404.html`，它按 `DEMO_APPS` 验证应用名、把请求路由保存在 `redirect` 并加载应用根目录；应用必须在创建路由器之前恢复 `redirect`，未知路径保持 404。
- 私有原生应用的验证保持路径触发而非全局必需检查；`main` 的分支保护只要求 `check` 上下文通过，产品变更必须经 pull request 合入。私有原生应用的版本同步由 [apps/interweave/scripts/](../../apps/interweave/scripts/) 承担：`release-version.mjs` 是版本 workflow 的编排入口，`sync-version.mjs` 提供默认更新与 `--check` 验证语义；版本 workflow 不直接发布包或安装程序。
- 合并门控来自 `main` 的规则集 `main protection`：要求 `check` 上下文，且 `strict_required_status_checks_policy` 为真。`action_required` 挂起是 GitHub 对 `GITHUB_TOKEN` 创建的版本 PR 的既有行为，仓库曾用条件 dispatch 缓解，该机制已删除，因为 dispatch 只是把同一轮验证再跑一遍，治不了挂起。现在挂起回归为人工一步，在 Actions 运行页批准，或执行 `gh api repos/<owner>/<repo>/actions/runs/<id>/approve`。同一规则集还开着 `require_extra_approval_for_unattributed_changes`，且 `required_approving_review_count` 为 0：不归属到具体用户的改动要多一道人工 approval，bot 创建的版本 PR 正命中这条。放行它是两道不同的门：先批准挂起的 run，再由有权且非 PR 作者的用户批准 PR；PR 作者不能用同一账号批准自己的改动。此 access-control approval 不等于本地独立 reviewer 的审查报告，具体 PR review 过程由 `review.md` 规定。若挂起重新成为常态，修法是让版本 PR 由有写权限的身份创建，也就是给 `changesets/action` 换用机器用户 PAT 或 GitHub App 令牌，而不是补回 dispatch。

未经用户授权不执行发布。取得授权的机制（弹窗、推荐项与自定义输入）见 [`workflow.md`](workflow.md#怎么取得这个授权)。不得直接运行 `npm publish`，首次发布用 `pnpm publish-new-pack <package-dir>`。Git 检查的绕过禁令见 [`commit.md`](commit.md)。

## PR changeset gate

`ci.yml` 的 `Check changesets` step 对普通 PR 保留 `changeset status`，并把 runner 提供的 base/head SHA 传给 `.agents/checks/changeset-required`。后者只检查 PR commit 差集和 PR head tree；本地 `ci:check-policies` 不运行该检查。`changeset-release/main` 版本 PR 由 step 条件豁免，`workflow_dispatch` 没有 PR 基线时不执行 PR 专项 changeset policy。required status context 仍只有 `check`；它覆盖 CI 与仓库硬约束，不等于 PR review。T0/T1 的本地独立 review 与报告回写、复审及合并前核验见 [`review.md`](review.md)，当前没有无人值守自动 reviewer 或 required approving review。
