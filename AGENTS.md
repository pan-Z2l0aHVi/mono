# Mono Agent Entry

本文件是所有 agent 的轻量入口：只提供项目身份、不可绕过边界和任务路由。实现事实以当前源码、`package.json`、配置和测试为准；文档解释意图，不能替代验证。

## 先确定所需 context

- 全局拓扑和快速定位：[`ARCHITECTURE.md`](ARCHITECTURE.md)。
- 协作流程短入口：[`CONTRIBUTING.md`](CONTRIBUTING.md)；它不取代按任务加载的规则。
- 会话角色：用户或 Manager 指定角色时，读取 [`.agents/agents/<role>.md`](.agents/agents/)；初始化见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## Mutation Gate

凡会创建、修改、删除、重命名、生成文件，或执行 commit、merge、release 的任务，**在第一次文件变更前必须读取 [`docs/agents/workflow.md`](docs/agents/workflow.md)，并为任务运行 `pnpm agent:workflow init --task <task-id> --mode <direct|orchestrated|release|hotfix>`**。没有 workflow 状态、当前 worktree 归属和 preflight 结果，不得开始实施；后续按 workflow 的 `check` gate 推进。只读调查可以不初始化任务，但一旦转为实施必须回到此 gate。

`AGENTS.md` 只承载这个必经入口和不可绕过边界；状态、冻结 diff、review、approval 和验证证据以 `.git/agent-workflow/<task-id>.json` 为执行真相，详细工具适配不写入本文件。

1. 先查看工作区状态、目标文件和最近的 `AGENTS.md`；只有进入某个 `apps/` 或 `packages/` 时才加载其包级指令。
2. 只按任务加载命中的 rule、guide 和包级指令；不要为普通局部任务预读 `CONTEXT.md`、ADR 或无关领域指南。
3. 需要全局拓扑时先阅读 [`ARCHITECTURE.md`](ARCHITECTURE.md)；只有架构、跨包、仓库拓扑、术语、长期设计或 instruction system 维护时，才继续阅读 [`CONTEXT.md`](CONTEXT.md)、[`docs/agents/context.md`](docs/agents/context.md) 和相关 ADR。

## 项目身份

这是一个 pnpm + Turborepo monorepo：发布 `@greypan/*` 工具包和 Lit Web Components（`@greypan/web-ui`），并维护 React、Vue 与私有集成应用作为真实集成表面。长期架构方向是可组合的 plugin、Shadow DOM 隔离、框架无关的组件契约和无环的工作区依赖图；跨包边界与 ADR 索引见 [`CONTEXT.md`](CONTEXT.md)。

## 多 Agent 编排

Manager 统一接收需求并编排，全程扁平，不设中间调度层级。编排路由、状态机与 gate 的流程权威是 [`docs/agents/workflow.md`](docs/agents/workflow.md)；本节只承载不可绕过的分工与边界。

角色与执行体使用默认绑定：

| 角色      | 执行体            | 责任范围                                                      |
| --------- | ----------------- | ------------------------------------------------------------- |
| Manager   | Claude Code       | 需求接收、任务分解、依赖管理、并行派发、Review 闭环、最终总结 |
| Designer  | Claude Code       | 产品设计、UI/UX、交互与状态设计；仅在产品/设计需求启用        |
| Lib Coder | Claude Code       | `packages/*`：共享库、基础包与公共契约                        |
| Biz Coder | Codex CLI         | `apps/*`：业务包实现                                          |
| Reviewer  | Codex CLI（主审） | 独立验收；高风险变更加 Claude Code 二次审查                   |

编排路由：

1. **产品/设计需求**：Manager → Designer → 并行 Lib Coder + Biz Coder → Reviewer 验收 → Manager 总结汇报。
2. **纯技术需求**：Manager → 并行 Lib Coder + Biz Coder → Reviewer 验收 → Manager 总结汇报。
3. 是否启用 Designer 由 Manager 判断，判据是需求是否涉及产品设计/UI，而不是改动大小；判断结论写入 task packet。

包边界与禁止事项：

- Lib Coder 只改 `packages/*`，Biz Coder 只改 `apps/*`；任何角色不得跨边界修改，也不得把业务逻辑下沉到共享包或把共享能力复制进业务包。
- 每个角色使用独立 worktree（或严格目录隔离）与唯一 owner；同一 worktree 不得被两个实施任务同时写入。
- 跨边界需求由 Manager 拆成独立 task 在各自 worktree 完成，并通过 handoff 传递契约，而不是由单个角色越界实现。
- Manager 不代替 Coder 修改生产代码，也不引入 Integrator 等额外层级。

结构化 handoff 是角色之间唯一的交接方式，完整模板以 [`docs/agents/task-packet.md`](docs/agents/task-packet.md) 为权威；每次交接必须显式给出 `Goal（目标）`、`Scope（范围）`、`Acceptance（验收标准）`、`Test commands（测试命令）`、`Open decisions（未解决决策）`，缺少任何一项不得进入实施或验收。

## 不可绕过的仓库边界

- 不得改写 `.npmrc` 或 `.mise.toml` 的 registry/mirror，或任何 Git 配置。
- 不手动编辑生成文件：`**/routeTree.gen.ts`、`**/typed-router.d.ts`、`**/auto-imports.d.ts`、`apps/*/frontend/bindings/**`、`**/__screenshots__/`、`**/.vitest-attachments/`。当源码或配置变更要求更新受版本控制的代码生成物时，必须运行其所属 generator，并核对生成 diff 与消费者；不得复制、伪造或手改输出。精确入口见 [`docs/agents/build.md`](docs/agents/build.md)。
- `**/__screenshots__/` 和 `**/.vitest-attachments/` 是测试证据，不是常规源码产物；除非任务明确要求更新已验证的视觉基线，否则不创建、编辑或提交它们。
- `AGENTS.md`（含包级）、`docs/adr/`、`docs/agents/`、`.agents/rules/`、`.agents/agents/` 和仓库自编写的 `.agents/skills/` 下文档使用中文；`.agents/references/` 是语言无关的通用检查清单，保持英文；第三方引入的 `.agents/skills/` 必须保持上游原文的语言与内容，更新时不得翻译或本地改写；其通用流程若与仓库规则、task guide 或实现事实冲突，以后者为准。技术术语、命令、路径和包名保留英文。
- 缺少 Node、pnpm 或 Go 时先运行 `mise install`；准确版本以 `.mise.toml`、`package.json` 与目标包 manifest 为准。
- 并行 agent 必须使用不同的 branch/worktree；不得在共享工作区执行 `git switch`、`git checkout`、`git stash`、`git reset` 或 `git clean`。新建 worktree 统一放在仓库旁的 `<仓库目录名>-worktrees/<worktree 名>`（例：仓库在 `path/to/mono`，worktree 放 `path/to/mono-worktrees/<name>`）；工具自带的 worktree 默认路径（如 `.claude/worktrees/`）不采用。
- 角色目录边界不可跨越：Lib Coder 只写 `packages/*`，Biz Coder 只写 `apps/*`；跨边界需求必须由 Manager 拆成独立 task 与独立 worktree。分工与 handoff 要求见「多 Agent 编排」，流程细节见 [`docs/agents/workflow.md`](docs/agents/workflow.md)。

## 按任务加载

| 任务或变更                                                | 先读                                                                                                                                                                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript、CSS 或一般源码                                | [`.agents/rules/code-style.md`](.agents/rules/code-style.md)                                                                                                                                                    |
| 公共 API、exports、事件、类型适配或跨包运行时契约         | [`.agents/skills/contract-change-review/SKILL.md`](.agents/skills/contract-change-review/SKILL.md)、[`.agents/rules/testing.md`](.agents/rules/testing.md) 和 [`docs/agents/build.md`](docs/agents/build.md)    |
| React 源码                                                | [`.agents/rules/react.md`](.agents/rules/react.md)                                                                                                                                                              |
| npm dependency / workspace catalog                        | [`.agents/rules/dep-management.md`](.agents/rules/dep-management.md) 和 [`docs/agents/dependencies.md`](docs/agents/dependencies.md)                                                                            |
| 测试、公共行为、导出或构建产物                            | [`.agents/rules/testing.md`](.agents/rules/testing.md) 和 [`docs/agents/testing.md`](docs/agents/testing.md)                                                                                                    |
| UI、UX、交互或浏览器运行时                                | [`docs/agents/browser-verification.md`](docs/agents/browser-verification.md)；`web-ui` 任务再读 [`docs/agents/web-ui.md`](docs/agents/web-ui.md)                                                                |
| 构建脚本、Vite/Turbo、包图、外部化、CI 或发布             | [`docs/agents/build.md`](docs/agents/build.md)                                                                                                                                                                  |
| 格式化、lint、拼写或类型检查配置                          | [`docs/agents/linting.md`](docs/agents/linting.md)                                                                                                                                                              |
| 变更影响或验证命令选择                                    | [`docs/agents/context.md`](docs/agents/context.md)（仓库内查询工具 `find:usages` / `inspect:contract` / `diff:contract` 的语义与参数）                                                                          |
| 全局拓扑和快速导航                                        | [`ARCHITECTURE.md`](ARCHITECTURE.md)；实现事实仍以源码、manifest、配置和测试为准                                                                                                                                |
| 架构探索、术语或 ADR                                      | [`docs/agents/domain.md`](docs/agents/domain.md)、[`CONTEXT.md`](CONTEXT.md) 和相关 ADR                                                                                                                         |
| instruction system / context 维护                         | [`.agents/skills/audit-instructions/SKILL.md`](.agents/skills/audit-instructions/SKILL.md)、[`docs/agents/context.md`](docs/agents/context.md)、[`CONTEXT.md`](CONTEXT.md) 和 ADR-0004                          |
| 代码 review                                               | [`.agents/rules/review-checklist.md`](.agents/rules/review-checklist.md)、[`docs/agents/review.md`](docs/agents/review.md)；需要独立 reviewer 时再读 [`.agents/agents/reviewer.md`](.agents/agents/reviewer.md) |
| 全局替换 / 重命名 / API 迁移 / 文件迁移                   | [`.agents/rules/global-rename.md`](.agents/rules/global-rename.md)                                                                                                                                              |
| Git commit                                                | [`.agents/rules/commit.md`](.agents/rules/commit.md)、[`docs/agents/commit.md`](docs/agents/commit.md) 和 [`CONTRIBUTING.md`](CONTRIBUTING.md)（AI 协作署名）                                                   |
| 开发流程、worktree 布局、release 分支或多 Agent 编排/交接 | [`docs/agents/workflow.md`](docs/agents/workflow.md)、[`docs/agents/task-packet.md`](docs/agents/task-packet.md) 和 [`.agents/agents/manager.md`](.agents/agents/manager.md)                                    |
| GitHub issue                                              | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)                                                                                                                                                  |

涉及 UI、UX、交互、响应式或浏览器运行时的改动，必须按 [`browser-verification.md`](docs/agents/browser-verification.md) 在真实浏览器验证；构建成功或 jsdom 测试不能替代该验证。实现不熟悉或跨浏览器语义不明确的 Web Platform API 时，使用 MDN MCP 验证语义和兼容性。
