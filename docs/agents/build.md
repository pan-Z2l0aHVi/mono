# 构建与 CI

修改包脚本、Vite/Turbo 配置、外部化或 CI 流程时先读本指南；这些边界变化时，在同一变更里更新本文档。包清单、依赖边界与发布边界以 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为权威。发布流程见 [`release.md`](./release.md)，发布禁令与首次发布工具在本文末尾；worktree 与环境准备见 [`worktree.md`](./worktree.md)。

## 各包命令

可构建的包使用 turbo 任务：`pnpm exec turbo <task> --filter=@greypan/<name>`。turbo 先完成 `^build`，裸 `pnpm --filter` 会绕过依赖构建，可能用到陈旧或缺失的 `dist`。包内非 turbo 脚本用 `pnpm --filter @greypan/<name> <script>` 直接运行。

影响面与契约查询见 monorepo-change-impact skill 的 SKILL.md，验证时点见 [`verification.md`](./verification.md)。`check-pack` 在构建可发布包或修改 exports、files 或 Vite 输出时运行，验证实际发布文件与 manifest export targets。

## Demo 开发

各 demo 与 Interweave 的开发命令以根 [`package.json`](../../package.json) 的 `dev:` namespace 为准。根目录 aliases 通过 Turbo `dev` task 构建上游工作区包，并启动每个包的持久 `dev` 进程。

不要改用 `turbo watch`：包级 Vite 与 tsdown 监听器已经会重建源文件变更，`turbo watch` 还会监控 Git 控制文件，编辑器或 agent 工具更新工作树时可能重启全部 dev 进程。修改包图、lockfile 或 Turbo 配置后需重启开发命令；普通源文件变更由包级监听器继续处理。

Interweave 由 Wails 宿主管理嵌套前端，其 alias 只启动 Wails host，并构建、监听 WebView frontend 的上游依赖，不要额外启动重复的前端进程。修改 Vite 插件、TypeScript 配置或工作区依赖图后需重启宿主进程。

## 生成物生命周期

生成文件不是 source of truth，禁止手动编辑，但应运行仓库配置的 generator 让工具产生 diff，再验证生成结果与消费者。不要用复制、补丁或格式化工具直接改写输出。

哪些文件是生成的、各自由谁生成、怎么重新生成，清单见 [`generated-artifacts.md`](./generated-artifacts.md)；本节只讲生命周期与守卫。

[`packages/web-ui/docs/*.md`](../../packages/web-ui/docs/) 是 demo 示例与 API 表的唯一输入（中文源是 `<name>.CN.md`，英文译文是 `<name>.md`）。generator 在 dev 与 build 时写盘，测试期只判不改；两个 demo 与 `web-ui` 的 parity 测试保证产物与 markdown 一致、同语种两端产物逐字节一致。改动组件 API 必须同时改对应 markdown。生成器的输入契约与校验规则以 `@greypan/md-to-comp` 的测试为准。

同一份输入与配置必须生成同一份完整字节；机器负载或调度耗时不得决定着色、解析等生成结果。预热和复跑通过不能证明确定性，涉及时间预算或部分结果降级的生成链要用可控调度验证完整产物；仅校验可见文本无法证明着色 HTML 一致。

CI 在 Build 步之前经两端 demo 的 `check-generated` turbo 任务以同一份插件配置只判不改地校验产物：Build 的写盘会把失步产物原地治愈，测试档里的判据到那时永远空转，所以检测必须抢在 healing 之前。判据与测试档同源（`@greypan/md-to-comp` 的 `checkArtifacts`），配置直接 import 各 demo `vite.config.ts` 的 `mdToCompOptions` 具名导出，不抄第二份。

这些语料必须进入本包 `build` 与 `test` 的 turbo inputs：根配置排除 Markdown，包级 [`turbo.json`](../../turbo.json) 重新纳入，并由 `pnpm run check-policy` 中的 `web-ui-docs-inputs` 检查守护。

React 与 Vue demo 的**壳文案**（TSX / SFC 中的界面文字）走另一条链：`wuchale` 从源码抽取 msgid，中文为源、英文为译文，落进 `apps/{react,vue}-web-ui-demo/src/locales/<locale>.po`。PO 是入库的译文源、手写不生成；catalog 与 loader（`src/locales/.wuchale/**`、`*.loader.js`、`data.js`、`plural.js`）由 Vite 插件按 PO 重编译，全部 gitignore。dev 与 build 只编译不抽取，所以**增删壳文案必须显式在应用目录跑 `pnpm exec wuchale --clean`** 把新 msgid 写进 PO，否则构建默默用旧语料出页面。`--clean` 会顺带移除代码里已不再引用的条目；不得用 `--modify`——它把译文写回源码，而源码里的中文才是唯一原文。PO 是 tracked 文件，天然在 `$TURBO_DEFAULT$` 里，不需要像 Markdown 那样重新纳入。

壳文案的一致性由两端应用的 `catalog.spec.ts` 随 `pnpm run test` 验证：各应用用 `@greypan/monorepo-kit` 的 `defineShellI18nCatalog` 声明自己的语种与 PO 目录，再调用 `run`。它分别把每个应用的两份 PO 复制到临时目录、按 `wuchale.config.js` 的 glob 重跑一次抽取，然后判五件事——en 有空译文、en 与 zh 的 msgid 集合不等（缺译或多译）、PO 里残留 `#~` 废弃条目、代码里有中文没进语料、语料里有中文代码里已不再引用。`wuchale status` 与 `check` 只看 PO 自身，看不见新加的源码文案，也判不出空译文，所以这条检查补的是它够不到的那一半。

测试由 Turbo 的 `^build` 先准备适配器产物；两端 test inputs 包含共享检查实现，修改它会使测试缓存失效。

Vue demo 通过私有 `@greypan/wuchale-vue` 在 Vue 编译前转换 SFC。`wuchale.config.js` 只提取手写壳文案，排除 `src/generated/**`；正文与运行示例继续由 md-to-comp 生成双语输出。语言控制器先准备 catalog、文档与当前页示例，再统一提交；不修改 wuchale 核心。安装版 wuchale 按 Vite mode 判定 build，Vue build 脚本显式使用 `--mode build`。

`apps/interweave/frontend/bindings/**` 的生成过程不得删除已有文件，并用产出集合守卫防止静默少产出；陈旧文件由人工清理。frontend 的 turbo inputs 由 Go 源、Go 模块文件与 bindings generator 构成。

读取生成物的测试与会改写同一路径的生成任务必须有明确的执行依赖，不能并行读写。生成器由本 workspace `build` 承担时，`test` 须依赖该 `build`，同时保留适用的上游依赖。`inputs` 只影响缓存哈希，不建立执行先后，不能替代 `dependsOn`。

`**/__screenshots__/` 与 `**/.vitest-attachments/` 是测试证据，不是应用代码生成物。除非任务明确要求并已完成对应的视觉或浏览器验证，不要创建、手改或提交。根 [`AGENTS.md`](../../AGENTS.md#不可绕过的仓库边界)在入口层声明同一约束，本节承载处方。

## TypeScript 配置

共享配置在 `packages/tsconfig/`，通过 `"extends": "@greypan/tsconfig/<profile>.json"` 引用。面向 DOM 与 Node 的包把配置拆成 `tsconfig.node.json`、`tsconfig.app.json` 和 `tsconfig.vitest.json`，纯 Node 包只用单个 `tsconfig.json`。每个包声明自己的 `include` 与 `tsBuildInfoFile`；需要路径别名时再声明 `paths`，不要为形式统一添加空配置。

## 库构建模式

公共面是固定入口集合的包用 `vp pack`（基于 tsdown，可以多入口，输出 `.mjs` 与 `.d.mts`，自动生成声明文件并从依赖中外部化）。公共面含通配子路径导出或需要 Vite CSS/资源管线的包同样用 `vp pack`，按下面三条加配置：`unbundle: true` + `root: 'src'` 让产物与源码树一一对应（子路径导出靠它）；`fixedExtension: false` 把扩展名对齐到 exports 指向的 `.js` / `.d.ts`（node 平台默认是 `.mjs` / `.d.mts`），凡是 exports 指向 `.js` 的包都要显式写这一行，不要依赖 `platform: 'browser'` 的默认值碰巧相同；CSS 入口就是 `pack.entry` 里的一项（见 `web-ui` 的 `classes/style`），`pack.css` 只承载 `minify` 这类选项，浏览器下限由顶层 `target` 同时驱动 JS 语法降级与 LightningCSS 前缀。声明文件由 `pack.dts` 生成：不在 JS 图里的纯类型入口必须显式列进 `pack.entry` 才会产出 `.d.ts`，顶层 `sourcemap: true` 会连带给 `.d.ts` 写 `sourceMappingURL`，所以要同时开 `dts.sourcemap`；`dts.entry` glob 也能补类型入口，但会让 dts 阶段慢数倍，不要用。纯转发的 barrel（`export * from './x'`）在 `unbundle` 下会被拍平进叶子模块，没有 `index.js` / `index.d.ts`，所以 `./*` 通配覆盖的子目录要按 `'<dir>/index'` 的键逐个列进 `pack.entry`——产物落点由键决定，写成 `<dir>` 会落到 `dist/<dir>.js`。具体选择以各包 manifest 与 `vite.config.ts` 为准，入口数量本身不是判据。`packages/tsconfig` 无构建步骤，只提供通过 TypeScript `extends` 消费的 JSON 文件。私有仓库工具包 `@greypan/monorepo-kit` 是 Node 侧的单入口包：`build` 跑 `vp pack` 产出 `dist/index.js` 与 `dist/index.d.ts`，消费方一律经包名读产物。门禁因此依赖产物新鲜度——根 `check-pre-commit` 前置一次 `turbo run build --filter=@greypan/monorepo-kit`，CI 在门禁之前显式构建。

## 外部化规则

匹配 `@greypan/*` 的工作区依赖与 Node 内置模块必须外部化，以保证监听模式可解析并避免重复的消费端代码。这条只对真打包的包有配置意义：`unbundle` 的包按定义不合并任何依赖，加 `external` 正则不会改变产物。第三方依赖在设计意图为零配置消费时可以打包，期望消费端自行提供时外部化。优先用正则而非工作区包列表，并让它同时匹配子路径导入。逐包的外部化清单以各包 `vite.config.ts` 为准。

## 应用

消费方在各自的 package manifest 中声明同一份 browserslist 目标，根 [`package.json`](../../package.json) 没有目标值；改目标时同步所有声明处，也就是各 manifest 的 browserslist 与 `web-ui` 的 `pack.target`——产物实际用的是 `pack.target`，manifest 里的 browserslist 只作文档性声明，两者目前手工双写。`web-ui` 是唯一在构建时输出 CSS 的包；静态 `color-mix()` 由 lightningcss 求值，含 `var()` 的 `color-mix()` 保留为运行时 CSS。纯 JavaScript 库包统一声明 `engines`，具体值以各包 manifest 为准。

两个 demo 用 `basicSsl()` 为 dev server 提供安全上下文：Service Worker 与 `navigator.clipboard` 只在安全上下文可用，而 demo 设了 `server.host: true`。该插件只作用于 dev server，生产构建不受影响。各 demo 的插件、测试面与构建差异以各应用 `vite.config.ts` 与 [`verification.md`](./verification.md) 为准。`depsReload` 监听库的 `dist/` 目录，本地依赖变化时触发整页刷新。嵌套 WebView 前端遵循对应框架 demo 的 Vite 插件与本地包约定。

## 测试端口分配

浏览器测试的 API 端口从根 [`monorepo.json`](../../monorepo.json) 的 `testPorts` 取，不要在 `vite.config.ts` 里写裸数字。每个 project 占一个 `bandWidth` 宽的段，留出 Vite 在端口被占时 +1 重试的空间；登记了哪些 project、各自占哪一段，以该文件为准。

新增 browser project 时在 `monorepo.json` 里占一个空闲段，并在它的 `vite.config.ts` 里调用 `testApiPort('<project>')` 取端口。分配与调用点的一致性由 `pnpm run check-policy` 中的 `test-port-call-sites` 检查守护：它扫描全仓 `vite.config.ts` 的 `testApiPort` 字面量实参，集合必须与配置完全相等，且每个段位只被一个 project 引用。同一台机器上并行多个 worktree 时，给每个 worktree 导出不同的 `GREYPAN_TEST_PORT_OFFSET`（`offsetStride` 的整数倍）整体错开；不设时为 0，端口就是固定值，不随 worktree 变化。

偏移是整表平移，所以同一 worktree 内的相对间隔不受影响；要守的是**不同 worktree 的两组端口不重叠**，因此偏移步长 `offsetStride` 不得小于全表跨度。读取配置时校验「段间不重叠」与「跨度不超过步长」两条，任一条不成立直接抛错，而不是悄悄和其他 worktree 抢端口。

`api.host` 统一钉成 `127.0.0.1`。Vite 的可用性探测只绑通配地址（`isPortAvailable` 遍历的是 `wildcardHosts`），看不见只占 `127.0.0.1` 的进程——macOS 上通配绑定与具体地址上的监听可以共存；真正把关的是随后的那次绑定。两个 demo 与 Interweave 的顶层 `server.host` 是 `true`，不写 `api.host` 时测试服务器会继承成通配绑定：别的进程占着 `127.0.0.1` 上的同号端口不会让它失败，两个服务器同号并行，页面可能落到别人的服务器上，症状是 `ERR_SSL_PROTOCOL_ERROR` / `ERR_EMPTY_RESPONSE` / browser runtime 永不连回。钉成 `127.0.0.1` 后绑定目标与占用者同址，才出 EADDRINUSE，非 strict 分支才会 +1 前进，vitest 再按实际监听地址把浏览器指过去。`web-ui` 与 `browser-kit` 没有顶层 `server`，默认是 `localhost`；仍显式写出来，是为了所有 browser project 同一种行为、不被顶层配置的增删悄悄改变。

`api.strictPort: false` 只有 Interweave 需要显式写。vitest 5 通过 `resolveApiServerConfig` 与 `vitest:config:server` 把 `api` 合并进测试服务器，顶层 `server` 的 `strictPort: true` 会被一并带过去；Interweave 的 dev server 正需要它（端口被占就硬失败，否则 webview 指向空气），测试服务器不需要——端口被占时它会直接 `Startup Error`，而不是按实际监听地址漂移。另外的包没有顶层 `strictPort`，继承的是默认 `false`，不必写。

`monorepo.json` 记在根 [`turbo.json`](../../turbo.json) 的 `globalDependencies` 里：各 browser project 所在的 `test` 任务都经自己包的 `vite.config.ts` 读它，而 turbo 只对包目录内的文件做哈希，不列出来就会在改配置之后重放上一份缓存的绿色结果。放在根而不是各消费包自己的 `test.inputs`：新增 browser project 时不会漏登记，代价是改这份配置会让全部缓存失效，而它很少改。读取它的 `packages/monorepo-kit/src/plugin/test-ports/test-ports.ts` 不登记：它在 `@greypan/monorepo-kit` 包目录内，`monorepo-kit#build` 的哈希与 `dist/` 经 `^build` 的传播已经覆盖它。两者失效的路径不同——表变而代码不变时构建哈希不动，只有这份根登记能失效消费者的 `test`。

dev server 不读这份分配：两个 demo 不写端口，Vite 从 5173 起、被占则 +1，实际 URL 会变，脚本与文档不要写死；Interweave 的 9245 带 `strictPort`，端口被占直接失败（Wails 需要确定的前端 URL，静默漂移会让 webview 指向空气），改端口用 `WAILS_VITE_PORT`——Taskfile 与 `vite.config.ts` 读同一个变量。反向也一样：测试端口不能当作 dev server URL 使用。

## CI 门控与 workflow 拓扑

workflow 的真实触发面、`permissions`、job `needs` / `if`、step `id`、构建矩阵与安装面以 YAML 本身为权威。[`.github/scripts/lib/workflow-topology.mjs`](../../.github/scripts/lib/workflow-topology.mjs) 只声明跨 workflow 的少量不变量（发布分支、required context 与 policy step），同目录的 [`workflow-topology.test.mjs`](../../.github/scripts/lib/workflow-topology.test.mjs) 读取真实 YAML 逐项比对，包括两个 Wails workflow 的原生构建矩阵必须一致，并通过 `test-scripts` 与 CI 的 `check` 强制执行。改 workflow 或该声明而不同步，`check` 会失败；不要在本文件复制这些细节。

workflow/job 的 `timeout-minutes` 以及构建和脚本中的超时、重试上限按 [workflow.md#预授权操作](./workflow.md#预授权操作) 取得授权。

CI 构建 workspace 包并跳过 Interweave app wrapper；Wails verify / release 在原生 runner 上构建 frontend 依赖闭包并打包应用。workflow 的 path filter 由 frontend package manifests 的传递依赖图校验。npm 发布通过 Trusted Publishing 绑定 workflow 文件路径，重命名 [`npm-publish.yml`](../../.github/workflows/npm-publish.yml) 需同步更新 npm 注册。

合并门控只放行 required checks 通过的 PR；具体 context 集合与 strict 策略属于远端规则集状态，以仓库当前规则为准。`GITHUB_TOKEN` 创建的版本 PR 可能需要人工批准挂起的 run；不归属到具体用户的改动需要额外 approval，且 PR 作者不能批准自己的改动。此 access-control approval 不等于独立 review，review 规则见 [`review.md`](./review.md)；挂起与发布恢复的操作细节见 [`release.md`](./release.md)。

[`deploy-pages.yml`](../../.github/workflows/deploy-pages.yml) 只发布 `DEMO_APPS` 列出的 demo 应用到 `/mono/<name>/`，不遍历全部 `apps/<name>`，也没有根落地页。History 路由的深层链接依赖 404 回退：应用必须在创建路由器之前恢复 `redirect`，未知路径保持 404。

未经用户授权不执行发布。取得授权的机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。不得直接运行 `npm publish`，首次发布用 `pnpm publish-new-pack <package-dir>`。Git 检查的绕过禁令见 [`commit.md`](./commit.md)。

CI 的 check 仍需在 mise 安装前准备 Wails Linux 开发包。mise 从 Go 源码编译 pinned wails3；CI 会核验 CLI，并在 interweave-frontend 构建时生成 bindings，因此这些系统依赖也服务于构建链。check 前的独立 job 会下载包并为当前 PR 写入 apt 归档缓存，最长 35 分钟；required check 保持 15 分钟并等待该 job。main push 只运行预热 job，不运行完整 check；成功写入的默认分支 cache 可供后续 PR 读取。只有完整下载或安装成功才会写入缓存；保存步骤紧跟 apt 操作，因此后续步骤失败不会阻止写入。PR 写入的缓存供该 PR 后续运行复用，新 PR 不能读取其他 PR 的缓存。缓存未命中时仍从配置的软件源下载；冷缓存 job 失败时 check 也会继续运行并报告自身结果。

## PR changeset gate

PR changeset gate 由 CI 对 PR base/head 执行 `pnpm run check-changeset`（含 `changeset status` 与自定义内容检查）；本地 pre-commit 政策检查不运行该检查。版本 PR 按条件豁免。required check 覆盖 CI 与仓库硬约束，不等于 PR review；review 规则见 [`review.md`](./review.md)。

[`ci.yml`](../../.github/workflows/ci.yml) 对 PR `opened`、`synchronize`、`reopened` 与 `edited` 事件运行；PR 标题检查位于依赖安装之前，并用 PR base 提交中的 [`commitlint.config.js`](../../commitlint.config.js) 规则检查标题，避免提案分支替换现行语言规则。标题先从事件负载读取；fork PR 负载不含完整 PR 对象时，用仅有 `pull-requests: read` 权限的 `GITHUB_TOKEN` 通过 `gh api` 读取标题与 base SHA。API token 只提供给读取步骤，标题检查脚本本身不接收 token。修改 PR 标题属于远端写操作，须按 [`workflow.md`](./workflow.md#怎么取得这个授权) 取得授权。`edited` 事件会触发完整 CI 重跑；若标题保持中文，required check 会失败。其他 PR 元数据编辑也会触发完整重跑。
