# 构建与 CI

修改包脚本、Vite/Turbo 配置、外部化或 CI 流程，或初始化新 worktree 前，先读本指南；这些细节变化时，在同一变更里更新本文档。包清单、依赖边界与发布边界以 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为权威，发布操作程序见 [`release.md`](release.md)，本指南只描述构建、验证与 CI 流程。

## 各包命令

可构建的包都有 `build`，多数有持久监听的 `dev`。`build`、`test`、`dev` 是 turbo 任务，用 `pnpm exec turbo <task> --filter=@greypan/<name>` 运行，turbo 按 `^build` 先建好上游依赖；裸 `pnpm --filter` 绕过这一层，会用到陈旧或缺失的 `dist`。其余脚本（例如 `generate-icons`）用 `pnpm --filter @greypan/<name> <script>` 直接跑。影响面定位用 `pnpm agent:find-usages -- <paths...>`，语义见 [`agent-context.md`](agent-context.md)。全量根命令由 CI 在 pull request 上执行，本地只在复现全仓范围问题时运行。

`check-pack` 在构建可发布 package 或修改其 `exports`、`files`、Vite 输出时，于根构建成功后运行。它用 `pnpm pack --dry-run` 验证实际发布文件与 manifest export targets，不判断 API 语义或版本级别。

## Worktree 与共享缓存

worktree 是任务隔离边界，不是包名的别名。一个可变 task 只能有一个 owner 和一个实施 worktree；怎么创建、放在哪、用什么命令建、由谁清理，都由编排层（herdr-projects）决定，仓库不规定。共享主工作区只用于只读调查与状态查询，合并通过远端 PR 完成，不在共享工作区里做。owner 与 worktree 的唯一性边界见根 [`AGENTS.md`](../../AGENTS.md)。

编排层交付一个新 worktree 后，收到它的执行者必须在实施或 freeze 之前依次跑 `mise install`、`pnpm install`、`pnpm run build`，三步都不能省。`mise install` 排第一，因为工具链版本由 `.mise.toml` 钉住，不同分支可能钉不同版本；它幂等，装过就是一次快速 no-op。freeze 的 guard 只看 `node_modules` 是否存在，装完依赖就通过，真正缺的是 workspace 包的 `dist` 类型产物：没有它，`vp check`（`fix-code` 与 `check-code` 都调用）会把每个跨包 import 报成假 `TS2307`，全部类型感知验证随之不可用。判据见 [`workflow.md`](workflow.md)「先建立任务」的 preflight 第 4 步。

编排层交接 task 时会带上 worktree 路径、base SHA 和 owner 标识，执行者按它们填 Task Packet 的 `Worktree`、`Base`、`Owner`，并执行 `pnpm agent:task assign` 记录归属，不自行推导或改写。交接后归属变更属编排层的动作，重新 assign 即可。禁止靠 pane 名称或目录名推断归属。

### turbo 缓存共享

`.mise.toml` 的 `[env]` 用 `git rev-parse --path-format=absolute --git-common-dir` 把 `TURBO_CACHE_DIR` 锚定到 git common dir（`mono/.git/turbo-cache`），主仓与全部 task worktree 共享同一份本地 turbo 缓存。缓存内容含 `dist` 与 d.ts，跨 checkout 复用安全（turbo 内容寻址），新 worktree 不必冷缓存全量重建。

`pnpm run clean` 的默认档会连这份缓存一起清掉，清后主仓与全部 worktree 都会冷缓存全量重建。在 A worktree 干活的 agent 可能被 B worktree 或主仓的一次 `pnpm run clean` 打中，且无从预知。它不删 `pnpm-lock.yaml`（tracked 文件，属需逐次授权的 lockfile 改动，要显式加 `--locks`）。手动回收直接删 `mono/.git/turbo-cache`，turbo 下次运行自动重建。CI 在 `ci.yml` 显式覆盖回 workspace 内路径，mise 注入不影响 CI 缓存键。

构建或验证前怀疑 `dist` 产物异常（例如被 watch 进程清空 d.ts）时，先跑 `pnpm run agent:env-doctor` 体检，再用 `pnpm run agent:env-doctor --fix`（自动 `turbo build --force`）或手动 `turbo build --force` 重建。

### mise exec 与命令外壳

`.mise.toml` 钉住工具链版本，并在 `[env]` 注入 `TURBO_CACHE_DIR`。这套注入只对 **mise 激活过的 shell** 生效：交互式终端与 herdr pane 由 mise 自动激活，agent 的工具宿主、`git hook`、`bash -c` 与外部脚本通常没有。判定要不要加 `mise exec --` 只看一条：**这条命令是否依赖 mise 注入的 env，或 PATH 上被钉住的工具**——经 turbo 的命令两者都依赖，调用 node / pnpm / go 的命令依赖后者；纯粹读写文件、或工具全部由 `node_modules` 提供的命令可以直接跑，拿不准就加。一个例外是 `pnpm run agent:env-doctor`：它存在的意义就是暴露「当前 shell 没激活 mise」，加了前缀会让它用来暴露这件事的两条断言恒报 ok，所以必须裸跑。

一行快速自检，输出非空只说明 env 已被注入（CI 在 `ci.yml` 里覆盖过这个变量也会让它非空），所以它只是提示，权威判据是 `pnpm run agent:env-doctor` 的等值断言：

```sh
echo "${TURBO_CACHE_DIR:-<unset>}"
```

为什么不能靠 turbo 兜底：它的 hash 只记录 `package.json` 里 `engines` 的版本**范围**，不记录真实工具链，所以宿主 PATH 上另一版 node 跑出的构建与钉住版本跑出的构建落在同一个 hash 上。由此有两种各自成立的失效，正是要分开防的两件事——env 没注入时 turbo 落到默认缓存位置，命中不了共享缓存；env 指向共享缓存而 node 不是钉住那一版时，会在同一 hash 下写进工具链不符的产物，之后的命中把它当有效缓存恢复出来。`pnpm run agent:env-doctor` 把这两条事实变成可检测断言：`TURBO_CACHE_DIR` 必须等于共享缓存路径（git common dir 加 `/turbo-cache`），当前 node 必须等于 `[tools]` 钉住的版本，不符即 fail。

### Go 缓存探测与共享

`.mise.toml` 的 `[env]` 里 `GOCACHE` 通过 `exec` 模板在 `HERDR_ENV=1` 时运行探测命令：

1. 尝试写入 macOS 默认路径 `~/Library/Caches/go-build`（`mkdir -p && touch && rm`，真写入，`2>/dev/null` 抑制 stderr）
2. 不可写则尝试 Linux 默认路径 `~/.cache/go-build`
3. 仍不可写则回落 `$TMPDIR/greypan/go-build`

探测命令**永远 exit 0、仅输出一行**，满足 Tera 渲染不崩溃的要求；`HERDR_ENV` 在场而 `TMPDIR` 为空时条件判假，避免渲染成根路径 `/greypan/go-build`。

**实测共享矩阵**：

- **herdr pane / claude 线程 / opencode 线程**（`HERDR_ENV=1`）：默认路径可写，探测命中，全部共享 `~/Library/Caches/go-build`（持久、约 800 MB）。
- **手工 shell**（无 `HERDR_ENV`）：模板渲染为空，Go 自行使用平台默认路径，同上共享同一份缓存。
- **codex 线程**（`codex-auto` profile，`HERDR_ENV=1`）：sandbox 仅允许 worktree 与 `/tmp` 写入，探测写入失败、回落 `$TMPDIR/greypan/go-build`，**行为不退化**。
- **CI（GitHub Actions）**：无 `HERDR_ENV`，模板渲染为空，Go 使用平台默认路径，`ci.yml` 的 `actions/cache` 读取 `go env GOCACHE`（默认值）不受影响。

两份历史缓存（`~/Library/Caches/go-build` 约 759 MB、`$TMPDIR/greypan/go-build` 约 1.0 GB）保留不动，旧的 `$TMPDIR` 那份由系统定期回收。

### 缓存可信链

`.agents/checks/turbo-cache-invariant` 要求 `test.dependsOn` 含 `^build`、`build.outputs` 含 `dist/**` 且没有可能排除 `dist` 的负模式，并且 `test.inputs` 不含会显式收进 `dist` 的正模式。不能靠把 `dist/**` 加进 `inputs` 解决缓存问题：`dist` 是 gitignored，`$TURBO_DEFAULT$` 本来不会收它，显式正模式反而让尚无 `dist` 的新 worktree 全部 miss，却不增加产出恢复的正确性。只想回收单个工作区的产物时直接删该工作区的 `.turbo/`。

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

另有一类生成物也受版本控制，但由两个 demo 的构建自己产出：输入只有 [`packages/web-ui/docs/*.md`](../../packages/web-ui/docs/)，Props 表的名称 / 说明 / 类型 / 默认值四列全部手写在那份 markdown 里，组件源码不参与生成，所以改了组件 API 之后表格不会自己跟上。引擎是私有包 `@greypan/md-to-comp`（不进任何 demo 的运行时依赖图），两个 demo 的 `vite.config.ts` 里各挂一个 flavor 的 Vite 插件：`buildStart` 写盘、`configureServer` 给输入目录挂 watcher，所以 dev 与 build 都会重新生成，改完 markdown 不必手跑命令。测试期（`process.env.VITEST`）分叉成只判不改，于是两个 demo 的 `turbo test` 各自带一道「产物 == markdown」的断言，且与 dev / build 共用同一份写在各自 `vite.config.ts` 里的配置——不另立配置文件，也不让 spec 去 import 整个 vite config。写盘只在内容真变了时才落（`writeIfChanged`）：无条件覆写会改掉这次构建自己的输入哈希，从此拿不到 turbo 缓存，dev 下还会让宿主 watcher 绕回生成形成死循环。

语料住在它描述的那个包里，所以缓存闭包得由包自己重开：根 `turbo.json` 的 `!**/*.md` 把 md 排除在哈希外，而排除项是绝对的、包含扳不回来，于是 [`packages/web-ui/turbo.json`](../../packages/web-ui/turbo.json) 覆写本包 `build` 与 `test` 的 `inputs`——语料重新进哈希，四篇散文 md（`README.md` / `README.CN.md` / `AGENTS.md` / `CHANGELOG.md`）按名字排掉，`build` 原本从根定义继承的 `!**/*.spec.ts` / `!**/*.test.ts` / `!**/__tests__/**` 也因为整表替换而在这里重写一遍。代价是改一篇语料会让 `@greypan/web-ui` 的 `build` 与 `test` 连同每个依赖它的包一起重算（一次约 175s），这是「文档跟组件同包」换来的。两个方向都由 [`scripts/web-ui-docs-inputs.test.mjs`](../../scripts/web-ui-docs-inputs.test.mjs) 守着：包内多出一篇名单外的 md，覆写里出现能盖住语料的排除项（例如把 `!**/*.md` 抄回来，或写成锚定的 `!/docs/**`），都直接红。

[`scripts/example-docs.test.mjs`](../../scripts/example-docs.test.mjs) 是 `scripts/` 剩下的那一半：它只判跨包的语料 join——两个 app 的 `examples.{ts,css}` 逐字节一致、围栏字节 == 落盘文件 == payload 可见文本、路由 / 页面 / markdown 之间没有孤儿引用（四条规则：路由名集合 == 页面名集合；每个页面仍渲染自己那份 `<ExampleDoc component="<自己的名字>" />`；每份 markdown 至少被一个页面渲染；`<ExampleDoc component="X">` 引用不存在的 markdown 非零退出）。生成器那侧的判据在 `@greypan/md-to-comp` 的单测里：篡改与孤儿对着 `generate()` 端到端跑（`generate.spec.ts`），表格形状对着 `parseMarkdown()` 跑（`markdown.spec.ts`）；新鲜度由两个 app 的 `turbo test` 判，那里插件走 `checkArtifacts`。从前那根仓库入口 `scripts/generate-web-ui-examples.mjs` 已随这次搬家删掉，它 `import` 已构建 `dist` 的隐患（缺 `dist` 报错退出、`dist` 过期则静默跑旧引擎）也一并消失。

那份 markdown 的形状就是生成器的输入契约：frontmatter 写 `component` 与 `tag`；`### <示例名>` 各带一个 `react` 与一个 `vue` 代码块；`### Props` 是 `| 名称 | 说明 | 类型 | 默认值 |` 四列表，`### Events` / `### Slots` 是 `| 名称 | 说明 |` 两列表，名称就是页面上要显示的那个 attribute / 事件名 / slot 名——写成什么就显示什么，已经没有源码来核对它写得对不对。列契约按小节而不是按全表：只有 Props 有类型与默认值两列，因为渲染器只在 Props 表读这两个字段——Events 的 `CustomEvent<…>` 从前由源码生成、写进 payload 却一个字节都不显示，手写之后就没有为它新增人工维护的理由。表头字面量、每行的列数、空的名称/说明/类型/默认值、同一张表里重名，**任一条不符都直接非零退出**，宁可拦下生成也不让表格静默缺格；小节级别同一条口径——`### Props` 这类小节的正文只允许表格行（漏了行首 `|` 的行过去既读不成表格也不报错，实测能把 14 行截成 2 行）、只有标题没有表格行、`## API` 里三张表一行都没有，全部非零退出；`## API` 整段省略则是合法的——它就是「这个组件没有对外契约」的声明（`web-ui-dropdown-divider` 只有一条分隔线），渲染层在 `api` 为空时整段跳过、不留一个空标题，而小节一旦存在就仍须有数据行。覆盖面到此为止：把 `### Props` 连标题带表一起删掉、只剩 Events / Slots 是判不出来的——没有源码可比，谁也不知道这个组件本该有一张 Props 表，页面少一张表这件事只剩 review 兜。反过来，源码那边也不再报警：删掉源码解析一并删掉了 join 提供的三道核对（`tag` 与 `@customElement` 是否一致、`component` 是否解析得到真实的 `packages/web-ui/src/components/<name>/`、表格里的名字是否就是源码声明的那个 attribute），剩下的判据（引擎单测，以及两个 app `turbo test` 里的 `checkArtifacts`）都只保证产物等于 markdown。类型与默认值在 markdown 里就是原样字符串（页面渲染进 `font-mono` 的单元格，列序是 `名称 / 类型 / 默认值 / 说明`，与 markdown 里的列序不同，那是渲染器排的），union 类型的竖线必须转义成 `\|`——未转义会被当列分隔符切出多余列，生成器再把 `\|` 还原成字面竖线。示例代码与 API 表由同一个生成器产出后，两个 demo 各渲染自己那一份 `flavor`（react / vue），样式文件逐字节相同。

示例标题尾部的 `{#id}` 是这条示例的 live 开关。写了锚点，生成器就把那一段围栏落成 `apps/{react,vue}-web-ui-demo/src/generated/demos/<component>--<id>.<tsx|vue>`（落盘前 `trimEnd()` 再补一个行尾换行：mdast 的 code 节点值不含行尾换行，而文本文件与格式化器都要它有），两端 `ExampleDoc` 用 `import.meta.glob` 配 `lazy` / `defineAsyncComponent` 把它挂成真组件；页面上 `<pre>` 显示的、落盘文件里的、围栏里的必须是同一份源码（`scripts/example-docs.test.mjs` 按文件名逐个断言前两者，两个 demo 的 `example-doc.browser.spec.*` 再把页面 `<pre>` 的可见文本逐条钉到那份文件上）。因此围栏得是能独立编译的完整用法：react 侧以 `export default function Demo()` 自带组件包装、并 import 自己要用的 `useState`；vue 侧是含 `<template>` 的 SFC，模板里出现事件绑定、指令或插值时必须有带 `setup` 独立属性的 `<script>` 块声明来源。没写锚点的示例只出高亮代码——这是 37 篇文档能逐篇迁移、中途不打断构建的原因。`src/generated/demos/**` 不在根 `vite.config.ts` 的 `fmt.ignorePatterns` 里：它们是被真正编译执行的示例源码，格式与 lint 跟人手写代码同一口径，所以围栏写得不合规会在 `check-code` 上直接红，而不是靠生成器代为格式化。那个目录归生成器独占，每轮按本轮产出集合清扫：改了 `{#id}` 或删掉一条示例，上一轮那份文件会被删掉，测试期 `checkArtifacts` 判到孤儿会让那次 `turbo test` 非零退出——孤儿不被任何 markdown 引用、上面那组字节断言盖不到它，却照样被 `import.meta.glob` 编进构建。

| 场景                       | source of truth                                            | 受控生成入口                                                                                                                                                           | 完成证据                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 文件路由             | `apps/react-web-ui-demo/src/routes/**` 与 `vite.config.ts` | `pnpm exec turbo build --filter=@greypan/react-web-ui-demo`（TanStack Router Vite plugin）                                                                             | `src/routeTree.gen.ts` 仅由 generator 更新；`check-code` 通过，并在真实浏览器访问新增/修改的路由。                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Vue 文件路由与 auto import | Vue 源码与两个 Vue 应用的 `vite.config.ts`                 | `pnpm exec turbo build --filter=@greypan/vue-web-ui-demo` 或 `--filter=@greypan/interweave-frontend`（`vue-router/vite` 与 `unplugin-auto-import`）                    | `auto-imports.d.ts`、`typed-router.d.ts` 仅由 plugin 更新；`vue-tsc --build` 与受影响路由/页面验证通过。                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Wails frontend bindings    | 公开 Go API、`apps/interweave/frontend/package.json`       | `pnpm exec turbo build --filter=@greypan/interweave-frontend`（构建前置经 `apps/interweave/scripts/generate-bindings.mjs` 调 `wails3 generate bindings`）              | 核对 `frontend/bindings/**` 的 generator diff，并运行 frontend 类型检查/构建和受影响调用点验证。                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| web-ui icons               | `packages/web-ui/icons.used.json`                          | `pnpm --filter @greypan/web-ui generate-icons` 或 `pnpm exec turbo build --filter=@greypan/web-ui`（`buildStart` 钩子）                                                | 图标模块只由 generator 更新，并完成 package build 与公开契约验证。                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| demo 示例文档              | `packages/web-ui/docs/*.md`                                | `pnpm exec turbo build --filter=@greypan/react-web-ui-demo` 或 `--filter=@greypan/vue-web-ui-demo`（插件 `buildStart`；引擎 `@greypan/md-to-comp` 由 `^build` 先构建） | `apps/{react,vue}-web-ui-demo/src/generated/examples.{ts,css}` 与 `src/generated/demos/**` 只由 generator 更新（本轮没产出的 demos 文件会被删掉），两个 app 的 `examples.{ts,css}` 逐字节一致；`scripts/example-docs.test.mjs` 断言围栏字节 == 落盘文件（差一个行尾换行）== payload 可见文本、并把路由 / 页面 / markdown 之间钉成「没有孤儿引用」（四条规则：路由名集合 == 页面名集合、每个页面渲染自己那份、每份 markdown 至少被渲染一次、引用不存在的 markdown 非零退出）；两个 app 的 `turbo test` 下插件只判不改，同样会拦下漂移。 |

`apps/interweave/frontend/bindings/**` 的生成只走一个入口 `node apps/interweave/scripts/generate-bindings.mjs`：`apps/interweave/build/Taskfile.yml` 的 `generate:bindings` 与 `apps/interweave/frontend` 的 `build` / `build:dev` 都指向它。该入口做两件事：

- 以 `-clean=false` 生成。`wails3` 的 `-clean` 不是先删目录再重建，而是先生成到临时目录、再逐文件同步；同步的删除阶段会删掉这一次没产出的文件，而包加载或类型检查问题只记 Warning、命令仍 exit 0。危险形状是 exit 0 的静默少产出，会删掉受版本控制的 bindings，`-clean=false` 让写入阶段完全没有删除。代价是不再清理陈旧生成物：改名或删掉一个 Service 后旧文件会留在 `bindings/` 里，需要人工 `git rm`。直接写 `bindings/`（而非临时目录加同步）在 dev server 开着时会产生 HMR 事件，但没有 delete 加 recreate 环，不触发 chokidar 的重命名循环。
- 生成前后对 `bindings/**` 做产出集合收缩守卫：生成前快照（相对路径加内容），生成后只要少了文件就把目录精确还原到快照并以非零退出。它按产出集合判定、不看退出码，挡的是工具删文件这一形状。在 `-clean=false` 下 wails3 不再有删除阶段，这条分支基本不会被触发，它更像一个「wails3 若改了语义就报警」的哨兵。陈旧生成物不由守卫处理，守卫只因少了文件报警，不因多了陈旧文件报警。

`**/__screenshots__/` 与 `**/.vitest-attachments/` 是测试证据，不是应用代码生成物。除非任务明确要求并已完成对应的视觉或浏览器验证，不要创建、手改或提交。根 [`AGENTS.md`](../../AGENTS.md)「不可绕过的仓库边界」在入口层声明同一约束，本节承载处方。

## TypeScript 配置

共享配置在 `packages/tsconfig/`，通过 `"extends": "@greypan/tsconfig/<profile>.json"` 引用，各 profile 与使用者以该目录为准。面向 DOM 与 Node 的包把配置拆成 `tsconfig.node.json`、`tsconfig.app.json` 和 `tsconfig.vitest.json`，纯 Node 包只用单个 `tsconfig.json`。每个包添加自己的 `include`、`paths` 与 `tsBuildInfoFile`。

## 库构建模式

单入口包用 `vp pack`（基于 tsdown，输出 `.mjs` 与 `.d.mts`，无需 `vite-plugin-dts` 即生成声明文件，并从依赖中自动外部化）。子路径导出包用 `vp build`（Vite library 模式配 `preserveModules`，输出 `.js` 与 `.d.ts`，用 `vite-plugin-dts` 生成声明文件，需要手动配置外部化）。`packages/tsconfig` 无构建步骤，它提供通过 TypeScript `extends` 消费的 JSON 文件。

## 外部化规则

匹配 `@greypan/*` 的工作区依赖与 Node 内置模块（例如 `node:path`）必须外部化，这保证监听模式可解析，并避免重复的消费端代码。第三方依赖在设计意图为零配置消费时可以打包，期望消费端自行提供时外部化。优先用正则而非工作区包列表，并让它同时匹配子路径导入（例如 `/^lit($|\/)/`）。逐包的外部化清单以各包 `vite.config.ts` 为准。

## 应用

两个 demo 与 `web-ui` 共享同一 browserslist 目标（Chrome/Edge >=111、Safari/iOS >=16.4、Firefox >=128、非 dead），与 Tailwind v4 的支持矩阵一致。`web-ui` 是唯一在构建时输出 CSS 的包，其静态 `color-mix()` 由 lightningcss 求值，含 `var()` 的 `color-mix()` 作为运行时 CSS 保留并依赖上述目标。库包（`js-kit`、`browser-kit`、`test-kit`、`deps-reload`、`unplugin-web-components`）只含 JavaScript、不输出 CSS，因此没有 `browserslist` 字段，统一声明 `engines.node >=20.11.0`：该下限覆盖 `deps-reload` 的 `import.meta.dirname`（Node 20.11+），并与 vite/vitest 的 peer 范围（^20.19 / ^20）对齐。

两个 demo 用 `basicSsl()` 给 dev server 开 HTTPS 是为拿到安全上下文：Service Worker 与 `navigator.clipboard` 只在安全上下文可用，而 demo 设了 `server.host: true`，从非 localhost 地址访问时 http 不满足条件。该插件只作用于 dev server，生产构建不受影响。各 demo 的插件、测试面与构建差异以各应用 `vite.config.ts` 与 [`test-execution.md`](test-execution.md) 为准；组件契约与浏览器运行时行为由 `web-ui` 的测试面与浏览器验证承担。`depsReload` 监听库的 `dist/` 目录，本地依赖变化时触发整页刷新。嵌套 WebView 前端的集成应用遵循对应框架 demo 的 Vite 插件与本地包约定，宿主运行时的插件负责生成其绑定。

## CI 与发布

真实的触发面、`permissions`、job `needs`/`if`、step `id`、发布分支字面量、桌面构建矩阵与安装面只写在 `.github/scripts/ci-topology.mjs`，`scripts/ci-topology.test.mjs` 把每个 workflow 的真实 YAML 读回来逐字段比对，由 `ci:test-scripts` 与 CI 的 `check` 强制。改任何一项而不改那份声明，`check` 就红；守卫里引用了不存在的 step `id` 也会红，因为这类引用在 Actions 里不报错，只会让那一步永远静默跳过。

- 一次运行是「等审批」还是「排队」，看 `gh api repos/<owner>/<repo>/actions/runs/<id> --jq '{status,jobs:.jobs.total_count,run_started_at,created_at}'`：`jobs.total_count == 0` 且 `run_started_at == created_at` 才是挂起等批准。某个 step 是否真的换掉了，看它在运行里整条消失（`gh api repos/<owner>/<repo>/actions/runs/<id>/jobs --jq '.jobs[].steps[].name'`），`if` 为假的 step 仍显示 `skipped`。
- 触发面值不值、哪个 workflow 最贵，用 `pnpm run ci:measure --days=14` 现算，不要把数字抄进文档。本仓 squash-only 合并，`main` 上的 `push` 落在新 sha 上而树与已验过的 PR head 相同，所以省下的量读 `events` 的 `push` 栏，读不出 `redundant`。
- flake 台账的写端在 CI：`Test` 红时把 `test-output.log` 与 `test-failures.json` 存成保留 1 天的 `ci-test-output-<run-id>-<attempt>` artifact；读端是本地 `gh run download <run-id> --pattern 'ci-test-output-*'` 加 `pnpm run ci:flakes <目录>`。它按红过几个不同 run 排序，同一 run 的多个 attempt 只算 retry 痕迹，也不判断重跑后是否变绿，所以榜单为空不代表没有 flake。
- 留痕的守卫必须是 `failure() && steps.test.outcome == 'failure'`：GitHub 对不含 status check 函数的 `if` 仍套默认 `success()`，只写 `steps.test.outcome == 'failure'` 会让留痕两步恰好在 `Test` 变红那刻被跳过，产出「检查看似正常、artifact 却是空」的假记录。恒假的守卫不会让 job 变红，由 `scripts/ci-topology.test.mjs` 的 status-function 规则钉住。四处仍是 fixture-only：守卫真会触发、artifact 的上传与下载、真实 `FAIL` 行进榜单、跨 run 计数。
- `ci.yml` 的 PR 运行与手动触发运行共享一个 `concurrency` 组（workflow 名加分支），但 `cancel-in-progress` 只能取消仍在飞行的那一次：先启动的运行若已结束，后启动的那次仍会完整跑一遍。`workflow_dispatch` 只用于人工重跑：版本 PR 由 `GITHUB_TOKEN` 创建，其 `pull_request` 运行要等有人点「批准并运行」，批准后同一 run id 以 `run_attempt=2` 起跑，所以版本 PR 上 attempt 大于 1 是批准痕迹，不是 flake 重试；从未批准的运行停在 `attempt=1` 且 `jobs.total_count == 0`。
- `npm-publish.yml` 仅发布公共 npm 包，发布成功后一个独立的最小权限作业为每个包版本创建幂等的 GitHub Release 与标签。npm Trusted Publishing 通过 OIDC `job_workflow_ref` 绑定到工作流文件路径，重命名或移动 `npm-publish.yml` 会使注册失效，即使设了 `id-token: write`，`pnpm changeset publish` 也会因 `ENEEDAUTH` 失败；重命名要在同一变更里更新 npmjs.com 上的 trusted publisher。
- `deploy-pages.yml` 每个条目是 `apps/<name>` 目录，服务路径为 `/mono/<name>/`，构建用 pnpm 的 `{./apps/<name>}...` 目录选择器而非包名。站点没有根落地页。每个 demo 的 History 路由深层链接依赖 GitHub Pages 的 404 回退：未匹配请求路由到根 `404.html`，它按 `DEMO_APPS` 验证应用名、把请求路由保存在 `redirect` 并加载应用根目录；应用必须在创建路由器之前恢复 `redirect`，未知路径保持 404。
- 私有原生应用的验证保持路径触发而非全局必需检查；`main` 的分支保护只要求 `check` 上下文通过，产品变更必须经 pull request 合入。私有原生应用的版本同步由 `release-version` 负责，默认更新与 `--check` 验证的语义以该脚本为准；版本 workflow 不直接发布包或安装程序。
- 合并门控来自 `main` 的规则集 `main protection`：要求 `check` 上下文，且 `strict_required_status_checks_policy` 为真。`action_required` 挂起是 GitHub 对 `GITHUB_TOKEN` 创建的版本 PR 的既有行为，仓库曾用条件 dispatch 缓解，该机制已删除，因为 dispatch 只是把同一轮验证再跑一遍，治不了挂起。现在挂起回归为人工一步，在 Actions 运行页批准，或执行 `gh api repos/<owner>/<repo>/actions/runs/<id>/approve`。同一规则集还开着 `require_extra_approval_for_unattributed_changes`，且 `required_approving_review_count` 为 0：不归属到具体用户的改动要多一道人工 approval，bot 创建的版本 PR 正命中这条。放行它是两道人工动作，先批准挂起的 run，再给 PR 本身一个 approval（`gh pr review <pr> --approve`）；只批准 run 时 PR 停在 `BLOCKED`，看起来像配好了其实没放行。若挂起重新成为常态，修法是让版本 PR 由有写权限的身份创建，也就是给 `changesets/action` 换用机器用户 PAT 或 GitHub App 令牌，而不是补回 dispatch。

未经用户授权不执行发布。不得直接运行 `npm publish`，首次发布用 `pnpm publish-new-pack <package-dir>`。Git 检查的绕过禁令见 [`commit.md`](commit.md)。
