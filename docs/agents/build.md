# 构建与发布架构

修改包脚本、Vite/Turbo 配置、外部化或 CI/发布流程前，先阅读本指南。当这些细节发生变化时，应在同一变更中更新本文档。

包清单和依赖边界以 [`CONTEXT.md`](../../CONTEXT.md) 为权威来源；release terminology 以 [ADR-0003](../adr/0003-release-planes.md) 为权威来源，本指南只描述构建、验证和发布流程。

## 各包命令

每个包暴露其所需的命令：所有可构建的包都有 `build`，大多数有 `dev`（监听模式），只有包含维护的自动化测试覆盖率的包才暴露 `test`。使用 `pnpm --filter @greypan/<name> <script>` 运行它们；例如，`pnpm --filter @greypan/js-kit test`。根目录提供全局编排的 `pnpm run build`、`pnpm run test`。受影响范围的迭代定位用 `pnpm find:usages -- <paths...>`（见 `context.md`）随后对目标包运行 filter 命令；已移除独立的 `build:affected` / `test:affected` 根命令，避免重复 `find:usages` 的影响面权威。全量根命令由 CI 在 pull request 上执行，本地只在需要复现全仓范围问题时运行。

## Demo 开发

| 应用                 | 开发命令                     |
| -------------------- | ---------------------------- |
| React Web UI demo    | `pnpm dev:react-web-ui-demo` |
| Vue Web UI demo      | `pnpm dev:vue-web-ui-demo`   |
| Interweave Wails app | `pnpm dev:interweave`        |

根目录 aliases 通过 Turbo `dev` task 构建上游工作区包，并启动每个包的持久 `dev` 进程。不要对这些命令改用 `turbo watch`：包级别的 Vite 和 tsdown 监听器已经会重建源文件变更，而 `turbo watch` 还会监控 Git 控制文件，当编辑器或 agent 工具更新 Git 工作树时可能会重启所有 dev 进程。

在修改包图、lockfile 或 Turbo 配置后，需要重启开发命令。普通的源文件变更会由运行中的包级监听器继续处理。

Interweave 由 Wails 宿主管理嵌套前端，因此其 alias 只启动 Wails host，并构建/监听 WebView frontend 的上游依赖；不要额外启动重复的前端进程。在修改 Vite 插件、TypeScript 配置或工作区依赖图后，需要重启宿主开发进程。

代码质量检查与修复的命令矩阵（`check:code` 聚合与 `fix:code` 一键修复）以 [`linting.md`](linting.md) 为权威；`pre-commit` 只跑 task gate 与 `.agents/checks/` 政策检查，不改写文件；提交边界的清洁度保证（格式、lint 与类型）来自 `format-clean` 这条只检不改的检查，口径与已登记的旁路见 [`workflow.md`](workflow.md)。包构建命令不能替代这些命令；Wails 的 macOS/Windows 原生构建仍负责验证 host package 与平台集成。

| 命令                        | 用途                                    | 说明                                                                            |
| --------------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm run clean`            | 清理构建产物与缓存                      | 执行 `scripts/clean.sh`，安全重置各工作区的 `dist/`、`.turbo/` 和临时产物       |
| `pnpm run test:scripts`     | 验证仓库内部工具脚本                    | -                                                                               |
| `pnpm run validate:context` | 验证 Agent context 路由、软链与结构约束 | 修改 `AGENTS.md`、角色、rules、skills 或 `docs/agents/**` 时必须通过            |
| `pnpm run check:pack`       | 发布产物边界检查                        | 构建可发布 package 或修改其 `exports`、`files`、Vite 输出时，在根构建成功后运行 |

`check:pack` 使用 `pnpm pack --dry-run` 验证实际发布文件与 manifest export targets；它不判断 API 语义或版本级别。

turbo 本地缓存由 `.mise.toml` 的 `TURBO_CACHE_DIR` 指向 worktree 族共享目录（机制与手动回收见 [`worktrees.md`](worktrees.md)）；`pnpm run clean` 只清理各工作区自己的 `.turbo/`，不影响共享缓存目录。构建或验证前怀疑 dist 产物异常（如被 watch 进程清空 d.ts）时，先跑 `pnpm run env:doctor` 体检，再用 `pnpm run env:doctor --fix`（自动 `turbo build --force` 重建 dist）或手动 `turbo build --force` 重建。

变更影响与验证命令选择使用仓库内查询工具 `find:usages` / `inspect:contract` / `diff:contract`；工具语义、参数与输出说明见 [`context.md`](context.md)，此处不复述。

对于 `web-ui`，`pnpm --filter @greypan/web-ui generate-icons` 从 `icons.used.json` 重新生成图标模块。Vite 插件也会在 `vp build` 期间自动运行它。

## 生成物生命周期

生成文件不是 source of truth，禁止手动编辑；但这不等于禁止使用仓库配置的 generator。若源码或配置的变更会影响受版本控制的代码生成物，必须运行所属 generator，让工具产生 diff，再验证生成结果和消费者。不要通过复制、补丁或格式化工具直接改写输出。

| 场景                           | source of truth                                            | 受控生成入口                                                                            | 完成证据                                                                                                 |
| ------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| React 文件路由                 | `apps/react-web-ui-demo/src/routes/**` 与 `vite.config.ts` | `pnpm --filter @greypan/react-web-ui-demo build`（TanStack Router Vite plugin）         | `src/routeTree.gen.ts` 仅由 generator 更新；`check:code` 通过，并在真实浏览器访问新增/修改的路由。       |
| Vue auto import / typed router | Vue 源码与 `apps/vue-web-ui-demo/vite.config.ts`           | `pnpm --filter @greypan/vue-web-ui-demo build`（Vite plugins）                          | `auto-imports.d.ts`、`typed-router.d.ts` 仅由 plugin 更新；`vue-tsc --build` 与受影响路由/页面验证通过。 |
| Wails frontend bindings        | 公开 Go API、`apps/interweave/frontend/package.json`       | `pnpm --filter @greypan/interweave-frontend build`（先执行 `wails3 generate bindings`） | 核对 `frontend/bindings/**` 的 generator diff，并运行 frontend 类型检查/构建和受影响调用点验证。         |
| web-ui icons                   | `packages/web-ui/icons.used.json`                          | `pnpm --filter @greypan/web-ui generate-icons` 或 `vp build`                            | 图标模块只由 generator 更新，并完成 package build 与公开契约验证。                                       |

`**/__screenshots__/` 与 `**/.vitest-attachments/` 属于测试证据，而不是应用代码生成物。除非任务明确要求并已经完成对应的视觉/浏览器验证，不要创建、手改或提交这些文件。根 `AGENTS.md`「不可绕过的仓库边界」在入口层声明同一约束，本节承载处方。

## TypeScript 配置

共享配置文件位于 `packages/tsconfig/`，通过 `"extends": "@greypan/tsconfig/<profile>.json"` 引用。

| 配置文件     | 层级     | 使用者                                  | 继承自                              |
| ------------ | -------- | --------------------------------------- | ----------------------------------- |
| `core.json`  | 1：纯 JS | `js-kit`                                | `./base.json`                       |
| `node.json`  | 2：Node  | Node 包和所有 `tsconfig.node.json` 文件 | `@tsconfig/node24` 加 `./base.json` |
| `dom.json`   | 3：DOM   | `browser-kit`、`web-ui`                 | `./base.json`                       |
| `react.json` | 4：框架  | `react-web-ui-demo`                     | `./dom.json`                        |
| `vue.json`   | 4：框架  | `vue-web-ui-demo`                       | `@vue/tsconfig` 加 `./dom.json`     |

每个包添加自己的 `include`、`paths` 和 `tsBuildInfoFile`。面向 DOM 和 Node 的包将其配置拆分为 `tsconfig.node.json`、`tsconfig.app.json` 和 `tsconfig.vitest.json`；纯 Node 包只使用一个 `tsconfig.json`。

## 库构建模式

不同包类型的构建脚本不同：

- **单入口包**（`test-kit`、`unplugin-web-components`、`deps-reload`）：`vp pack`，基于 tsdown，输出 `.mjs` 和 `.d.mts`。
- **子路径导出包**（`js-kit`、`browser-kit`、`web-ui`）：`vp build`，使用 Vite library 模式配合 `preserveModules`，输出 `.js` 和 `.d.ts`。
- **React 应用**：`vp build`。
- **Vue 应用**：`vue-tsc --build && vp build`。
- **tsconfig**：无构建步骤；它提供通过 TypeScript `extends` 消费的 JSON 文件。

`vp pack` 通过 `pack` 块配置，无需 `vite-plugin-dts` 即可生成声明文件，并自动外部化依赖。`vp build` 通过 `build.lib` 和 `preserveModules: true` 配置，使用 `vite-plugin-dts` 生成声明文件。

## 外部化规则

- 匹配 `@greypan/*` 的**工作区依赖**必须被外部化。Vite library 包通过 `rollupOptions.external` 实现；tsdown 从依赖中自动处理。这确保了监听模式的可解析性并避免重复的消费端代码。
- **Node 内置模块**如 `node:path` 必须被外部化。
- **第三方依赖**在设计意图为零配置消费时可以被打包；当期望消费端自行提供时应外部化。
- 优先使用正则表达式而非工作区包列表。同时匹配子路径导入，例如 Lit 模式 `/^lit($|\/)/`。
- `web-ui` 外部化其框架依赖，因此消费端必须安装 `lit` 作为依赖。
- 对于包含外层宿主工作区和嵌套前端工作区的应用，宿主任务、构建目标、生成绑定与资源目录均以目标应用的 manifest、包级 `AGENTS.md`、任务配置和 CI workflow 为准；通用指南不复制应用专属的筛选器、平台矩阵或发布产物名称。生成绑定、前端产物、缓存和依赖通常是一次性产物；任务配置、平台模板、图标和打包资源是否保留必须以目标应用的清理脚本为准。

| 包                        | 外部化                                                                   | 打包的第三方依赖 |
| ------------------------- | ------------------------------------------------------------------------ | ---------------- |
| `js-kit`                  | `@greypan/*`、`remeda`                                                   | 无               |
| `browser-kit`             | `@greypan/*`、`nanoid`、`remeda`、`copy-to-clipboard`、`msw`             | 无               |
| `test-kit`                | 通过 tsdown 自动处理：`@greypan/js-kit`、`msw`、`vite-plus`              | 无               |
| `web-ui`                  | `@greypan/*` 加框架正则匹配 `lit`、`@lit`、`react`、`react-dom` 和 `vue` | 无               |
| `unplugin-web-components` | 通过 tsdown 自动处理：`@greypan/js-kit`、`change-case`、`unplugin`       | 无               |
| `deps-reload`             | 通过 tsdown 自动处理：`node:*`、`@greypan/js-kit`、`unplugin`            | 无               |

## 应用

- `react-web-ui-demo` 使用 `@vitejs/plugin-react` v6（workspace catalog 当前版本）配合 React Compiler（`babel-plugin-react-compiler`，目标 19），加上 `@vitejs/plugin-legacy` 支持旧版浏览器。React 和 Vue demo 应用目前依赖浏览器验证而非维护的单元测试套件。
- demo 应用和 `web-ui` 共享相同的 browserslist 目标（Chrome/Edge >=111、Safari/iOS >=16.4、Firefox >=128、非 dead），这与 Tailwind v4 的支持矩阵一致。`web-ui` 是唯一在构建时输出 CSS 的包；其静态 `color-mix()` 调用由 lightningcss 评估，而包含 `var()` 的 `color-mix()` 作为运行时 CSS 保留并依赖上述目标。
- 库包（`js-kit`、`browser-kit`、`test-kit`、`deps-reload`、`unplugin-web-components`）仅包含 JavaScript，不输出 CSS，因此没有 `browserslist` 字段；它们统一声明 `engines.node >=20.11.0`。该下限覆盖了 `deps-reload` 中的 `import.meta.dirname`（Node 20.11+），与 vite/vitest 的 peer 版本范围（^20.19 / ^20）对齐，并排除了已停止维护的 Node 18 和 20 版本。
- 两个 demo 应用都使用 `basicSsl()` 进行 HTTPS 开发服务器配置。
- `depsReload` 监听库的 `dist/` 目录，当本地依赖发生变化时触发整页刷新。
- 使用嵌套 WebView 前端的集成应用遵循相应框架 demo 的 Vite 插件和本地包约定；宿主运行时的插件负责生成其绑定。

## CI 与发布

| Workflow                | 触发                                                               | 职责                                                                                                  |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `ci.yml`                | `pull_request`、push 到 `main`、`workflow_dispatch`                | 共享 agent context、changeset 状态、构建、格式化/lint/类型检查和测试                                  |
| `changeset-version.yml` | push 到 `main`                                                     | 创建/更新 Changesets 版本 PR，`changesets/action` 的 `version-script` 调用 `pnpm run release:version` |
| `npm-publish.yml`       | `pull_request.closed`，限定 `changeset-release/main` 合并到 `main` | 检测公共包版本变更，在合并 SHA 上重建 `packages/*` Turbo 图并通过 npm Trusted Publishing 发布         |
| 应用验证 workflow       | 目标应用路径、其 WebView frontend 的直接 workspace 依赖或手动触发  | 校验同步元数据并在对应的原生目标上构建验证产物                                                        |
| 应用发布 workflow       | 目标应用版本变更后的受控合并                                       | 创建带校验和的安装程序 Release；私有应用永不发布到 npm                                                |
| `deploy-pages.yml`      | 手动触发                                                           | 通过 `actions/deploy-pages` 产物部署作业级 `DEMO_APPS` 列表中的每个可部署 Demo                        |

- `ci.yml` 的 PR 运行与手动触发运行共享一个 `concurrency` 组（`${{ github.workflow }}-${{ github.head_ref || github.ref_name }}`，即 workflow 名加分支），但 `cancel-in-progress` 只能取消仍在飞行的那一次：先启动的运行如果已经结束，后启动的那次仍会完整跑一遍，两次运行不会被合并成一次。`workflow_dispatch` 只用于人工重跑：版本 PR 的 `pull_request` 运行在本仓默认自动执行，不需要额外调度，历史挂起见下节。原生应用所需的系统前置条件以当前 workflow 和工具配置为准。
- 包专属的版本同步由 `release:version` 对应脚本负责；默认更新与 `--check` 验证的语义以该脚本为准。版本 workflow 不直接发布包或安装程序。
- `npm-publish.yml` 仅发布公共 npm 包。发布成功后，一个独立的最小权限作业为每个包版本创建幂等的 GitHub Release 和标签，附带 npm 和包 changelog 的链接。它不使用私有原生应用的工具链或长期 npm token。
- 私有原生应用的验证保持路径触发而非全局必需检查，不相关的 PR 无需等待原生运行环境；`main` 分支保护只要求 `check` 上下文通过，产品变更必须经 pull request 合入。
- `deploy-pages.yml` 每个条目是 `apps/<name>` 目录，服务路径为 `/mono/<name>/`；构建命令使用 pnpm 的 `{./apps/<name>}...` 目录选择器而非 npm 包名。它仅安装 Node 和 pnpm，因为 Pages 不需要私有原生应用的工具链。站点没有根落地页。
- 每个 Demo 的 History 路由深层链接依赖 GitHub Pages 的 404 回退：未匹配请求路由到根 `404.html`，它按 `DEMO_APPS` 验证应用名、把请求路由保存在 `redirect` 并加载应用根目录；应用必须在创建路由器之前恢复 `redirect`，未知路径保持 404。
- npm Trusted Publishing 通过 OIDC `job_workflow_ref` 声明绑定到工作流文件路径。重命名或移动 `npm-publish.yml` 会使现有的 trusted-publisher 注册失效：即使设置了 `id-token: write`，`pnpm changeset publish` 也会因 `ENEEDAUTH` 失败。在重命名工作流的同一变更中更新 npmjs.com 上对应的 trusted publisher。

### 版本 PR 的 CI 门控

合并门控来自 `main` 的规则集 `main protection`：要求 `check` 上下文，且 `strict_required_status_checks_policy` 为真；正常情形下这个上下文由版本 PR 自己那次 `ci.yml` 运行产出。

`changeset-version.yml` 曾额外 dispatch `ci.yml`（`has-changesets` 为真时）与 `wails-verify.yml`（`has-wails-release` 为真时），要防的是 GitHub 的 `action_required`：由 `GITHUB_TOKEN` 创建的版本 PR，其 `pull_request` 运行可能被判定为待批准而不执行。这条防护自身的记录很薄，但计数得说清规则：截至 2026-09-21 保留的 788 次运行历史（最早 2026-07-05）里，版本分支上 46 次 `pull_request` CI 运行有 5 次从未执行过任何 job（`runs/<id>/jobs` 的 `total_count` 为 0、`run_started_at` 等于 `created_at`），分属 4 个版本 PR——3 次至今仍标 `action_required`（08-25 一次、09-07 两次），2 次在创建后约 30 天才收敛为 `failure`（08-01 与 08-07 各一次，挂起过期的形态）。其中几个 head SHA（`92e8a2ab`、`13090291`）已被版本分支后续的 force-push 脱链，`git cat-file` 查不到，只能按 run number 在 Actions 里看。只有 08-25 与 09-07 那 3 次落在 dispatch 上线（`1253ff15`，2026-08-07T05:16Z；当时文件还叫 `version.yml`）之后。这 3 次里 2 次的 dispatch 自身就是 failure；唯一成功的那次（run 305）确实给当时还挂着的 PR head 变出了规则集要求的 `check` 绿 —— 严格说那一刻合并门控已经满足，只是这份绿只活了约 10 秒：`check` 在 `2026-09-07T23:08:39Z` 判成功（用 job 的 `completed_at`；本例 run 自己的 `updated_at` 晚了 1 秒），新 commit `7b0f9361` 就在 `23:08:49Z` 提交（挂起开始后 4 分钟），PR 最终是靠它自己的 PR 运行合入的。另两次挂起早于 dispatch 上线，谈不上覆盖面。2026-09-07 之后再创建的 6 个版本 PR 未出现挂起。

重复则是确定的：并发组没有把两次运行合并成一次，胜负取决于 PR 运行真正开跑（`run_started_at`）时 dispatch 是否还在飞行。25 次 dispatch 运行里 2 次是人工重跑（`b3068ab6` 上的 run 180、181；判据是同一 commit 上已有过一次自动 dispatch，不能改用 `triggering_actor`——挂起配对的 run 297 那个字段也显示人工，但它与挂起的 PR run 298 只差 2 秒、且是该 commit 上唯一一次 dispatch），其余 23 次自动 dispatch 中：6 次因仍在飞行中被随后的 PR 运行取消（该分支上 CI 的 PR 运行从未被取消），3 次对应上面那 3 个挂起的 PR 运行，剩下 14 个版本 PR commit 上 dispatch 已经在 PR 运行启动前 17 到 1671 秒结束（其中 13 次在 17–660 秒），同一份 CI 完整执行了两遍（12 次双方都成功，1 次双方都失败，1 次 dispatch 失败、PR 运行成功）。这 14 个间隔是 PR 运行的 `run_started_at` 减去 dispatch 的 `updated_at`。重算配方：`gh api --paginate 'repos/<owner>/<repo>/actions/runs?branch=changeset-release/main&event=workflow_dispatch'` 与 `event=pull_request` 各拉一次，本地只留 `.name == "CI"` 的项，得到 25 与 46；`name=` 查询参数会被 GitHub 静默忽略（`name=CI` 和 `name=NoSuchWorkflowAtAll` 返回同一个 `total_count`），不能用来过滤；`total_count` 自身在同一条查询上也可能瞬时给出不同值，一切以 paginate 之后的本地计数为准，且要先按 `.id` 去重——新运行插到队首会把已有行推到更大的 offset，同一运行可能在两页各出现一次，因此未去重的计数只会偏大，去重即可消除。以上计数同为 2026-09-21 时点，版本分支还会继续长。

现在只保留 PR 事件这一条路径，挂起回归为人工一步：在 Actions 运行页批准该次运行，或执行 `gh api repos/<owner>/<repo>/actions/runs/<id>/approve`。若挂起重新成为常态，正确的修法不是补回 dispatch（它只是把同一轮验证再跑一遍，被挂起的 PR 运行仍留着等人批准），而是让版本 PR 由具有写权限的身份创建：给 `changesets/action` 换用机器用户 PAT 或 GitHub App 令牌，使 PR 作者本身即是被批准的贡献者。那条已删除的条件 dispatch 同样不解决问题：`has-wails-release` 当时为真就意味着版本 PR 必然改到 `apps/interweave/package.json`，而这个路径至今仍在 `wails-verify.yml` 的 `pull_request` 过滤器里，补回它也不会多出一次有效验证。历史上它一共只在 4 个版本 PR commit 上触发过，其中 3 个 commit 的 `pull_request` 运行本来就在跑，dispatch 只是把同一次验证又做了一遍；唯一没有 PR 运行的那次（7be57d84）不是路径没覆盖——当时过滤器写作 `apps/wails-starter/**`（`b9faa2c2` 才改名），而该 commit 改的正是这个目录，且同一 commit 的 `ci.yml` PR 运行照常到达，只有 `wails-verify.yml` 没有 `pull_request` 运行：该 SHA 上它总共只有一次运行，就是这次删掉的 dispatch 本身（run 19，完整跑完并成功）。也不是挂起待批准——挂起的运行对象仍在，只是 job 数为 0，而这里根本没有产生过那条运行。除此之外原因未能确定。那一次 dispatch 因而是该 commit 上唯一的 `wails-verify` 验证，但那个 commit 本身就是一次探针（它消费的 changeset 写着 `trigger version-pr rerun to verify concurrency dedup`，包名还是改名前的 `@greypan/wails-starter`），不能拿来为现行条件下的取舍背书。

## Release context

发布流程和 release plane 的术语、边界与授权模型见 [ADR-0003](../adr/0003-release-planes.md)。本指南只保留执行流程和 release safety boundary：未经用户授权不执行发布；不得直接运行 `npm publish`，首次发布使用 `pnpm publish:new <package-dir>`；Git 检查的绕过禁令见 [`commit.md`](./commit.md)。后续公共包和私有原生应用安装程序按对应 workflow 与 Changesets 配置执行。修改 `.github/workflows/`、Changesets 或发布脚本时，先阅读本指南和相关 ADR，并以当前 workflow、manifest 与脚本为事实来源。
