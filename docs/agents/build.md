# 构建与 CI

本文件是构建任务的入口：说明什么情况该读哪篇、根命令面怎么用，以及跨篇共性约束。修改包脚本、Vite/Turbo 配置、外部化、打包或 CI 流程时先定位到对应子文件；这些边界变化时在同一变更里更新它。包清单、依赖边界与发布边界以 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为权威，发布流程见 [`release.md`](./release.md)，worktree 与环境准备见 [`worktree.md`](./worktree.md)。

| 要改的东西                                     | 读                                           |
| ---------------------------------------------- | -------------------------------------------- |
| 包脚本、turbo 任务、demo 开发命令              | 本文件                                       |
| 产物入口、声明与类型、外部化、tsconfig profile | [`build-packaging.md`](./build-packaging.md) |
| 浏览器目标、本地 HTTPS、测试端口分配           | [`build-browser.md`](./build-browser.md)     |
| 生成链路、确定性、Build 前的生成物校验         | [`build-generated.md`](./build-generated.md) |
| CI 门控、workflow 拓扑、PR changeset gate      | [`build-ci.md`](./build-ci.md)               |

## 各包命令

可构建的包使用 turbo 任务：`pnpm exec turbo <task> --filter=@greypan/<name>`。turbo 先完成 `^build`，裸 `pnpm --filter` 会绕过依赖构建，可能用到陈旧或缺失的 `dist`。包内非 turbo 脚本用 `pnpm --filter @greypan/<name> <script>` 直接运行。

影响面与契约查询见 monorepo-change-impact skill 的 SKILL.md，验证时点见 [`verification.md`](./verification.md)。`check-pack` 在构建可发布包或修改 exports、files 或 Vite 输出时运行，验证实际发布文件与 manifest export targets。

## Demo 开发

各 demo 与 Interweave 的开发命令以根 [`package.json`](../../package.json) 的 `dev:` namespace 为准。根目录 aliases 通过 Turbo `dev` task 构建上游工作区包，并启动每个包的持久 `dev` 进程。根 `dev:*` 命令在命令行显式携带 `--concurrency`（具体取值以根 [`package.json`](../../package.json) 为准），不要通过提高 [`turbo.json`](../../turbo.json) 顶层 `concurrency` 解决持久任务并发上限，避免同时放大 `build` 与 `test` 的并发。

只有需要前端运行时热重载并已接入对应应用 `depsReload` 的上游工作区包（`packages/*`）才定义 `dev` 脚本；纯测试基建与纯构建期 Vite 插件不设 `dev`（Vite 进程内重启仍受 Node ESM 模块缓存约束，无法热加载已导入的插件产物；混合包的构建期入口改动同理，均需重启宿主由 Turbo `^build` 自动重编）。

不要改用 `turbo watch`：包级 Vite 与 tsdown 监听器已经会重建源文件变更，`turbo watch` 还会监控 Git 控制文件，编辑器或 agent 工具更新工作树时可能重启全部 dev 进程。修改包图、lockfile 或 Turbo 配置后需重启开发命令；普通源文件变更由包级监听器继续处理。

Interweave 由 Wails 宿主管理嵌套前端，其 alias 只启动 Wails host，并构建、监听 WebView frontend 的上游依赖，不要额外启动重复的前端进程。修改 Vite 插件、TypeScript 配置或工作区依赖图后需重启宿主进程。

## 跨篇共性约束

- 生成文件不是 source of truth：不得手写或改写，只能跑对应 generator 产生 diff。清单与重新生成入口见 [`generated-artifacts.md`](./generated-artifacts.md)，构建期链路见 [`build-generated.md`](./build-generated.md)。
- 生成物链路的执行顺序约束（test 依赖 build、`inputs` 不建立先后、不能替代 `dependsOn`）只在该文定义，见 [`build-generated.md`](./build-generated.md#生成与测试的执行顺序)。
- 审查判据只在 [`review.md`](./review.md) 定义；远端写、发布与合并的授权机制只在 [`workflow.md`](./workflow.md#怎么取得这个授权) 定义，本组文档只声明何时需要并指向它们。
