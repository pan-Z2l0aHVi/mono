# Mono Agent Entry

本文件是所有 agent 的轻量入口：只提供项目身份、不可绕过边界和任务路由。实现事实以当前源码、`package.json`、配置和测试为准；文档解释意图，不能替代验证。

## 先确定所需 context

- 全局拓扑和快速定位：[`ARCHITECTURE.md`](ARCHITECTURE.md)。
- 协作流程短入口：[`CONTRIBUTING.md`](CONTRIBUTING.md)；它不取代按任务加载的规则。

## Mutation Gate

<!-- invariant:task-state-trigger -->

所有实施变更**在第一次文件变更前必须读取 [`docs/agents/workflow.md`](docs/agents/workflow.md)，并按级别建 task：`pnpm task new --task <task-id> --level t0|t1|t2`**。级别 T0/T1/T2（T0 最严格）只表达 workflow 严格程度；判定判据、每级的 review/approval 要求与预授权操作清单，以 workflow.md 为权威，本节不复制。

级别判定不靠感觉：`pnpm find:usages -- <paths>` 输出的受影响 workspace 只有一个时，T2 的「单 workspace」条件成立。只读调查不需要 task，一旦转为实施就回到这个 gate。状态、冻结 diff、review、approval 和验证证据以 `<git-common-dir>/tasks/<task-id>.json` 为执行真相。

1. 先查看工作区状态、目标文件和最近的 `AGENTS.md`；只有进入某个 `apps/` 或 `packages/` 时才加载其包级指令。
2. 只按任务加载命中的 rule、guide 和包级指令；不要为普通局部任务预读 `CONTEXT.md`、ADR 或无关领域指南。
3. 需要全局拓扑时先阅读 [`ARCHITECTURE.md`](ARCHITECTURE.md)；只有架构、跨包、仓库拓扑、术语、长期设计或 instruction system 维护时，才继续阅读 [`CONTEXT.md`](CONTEXT.md)、[`docs/agents/context.md`](docs/agents/context.md) 和相关 ADR。

## 项目身份

这是一个 pnpm + Turborepo monorepo：发布 `@greypan/*` 工具包和 Lit Web Components（`@greypan/web-ui`），并维护 React、Vue 与私有集成应用作为真实集成表面；长期架构方向、跨包边界与 ADR 索引见 [`CONTEXT.md`](CONTEXT.md)。

## 多 Agent 编排

<!-- invariant:orchestration-routing -->

Manager 统一接收需求并编排，全程扁平，不设中间调度层级。编排路由、状态机与 gate 的流程权威是 [`docs/agents/workflow.md`](docs/agents/workflow.md)；本节只承载不可绕过的分工与边界。

<!-- invariant:executor-binding -->

角色与执行体（执行体，即承担该角色的 CLI/agent；下表是全仓唯一权威绑定表，其他文档只链接到这里）使用默认绑定。绑定表适用于主工作流（herdr + Claude Code / Codex CLI）；任何其他执行体（zcode、workbuddy、pi 等）可承担任一角色，目录边界、task gate、reviewer ≠ owner、handoff 字段等机器强制约束不变，T0/T1 在 task packet 记录替代执行体与理由。模型与思考强度由用户会话设置或 Manager 按任务指定，不设角色默认（见 [ADR-0014](docs/adr/0014-task-system-v2.md)）。

| 角色      | 执行体      | 责任范围                                                                          |
| --------- | ----------- | --------------------------------------------------------------------------------- |
| Manager   | Claude Code | 需求接收、任务分解、依赖管理、并行派发、Review 闭环、最终总结                     |
| Designer  | Claude Code | 产品设计、UI/UX、交互与状态设计；仅在产品/设计需求启用                            |
| Lib Coder | Codex CLI   | `packages/*`：共享库、基础包与公共契约                                            |
| Biz Coder | Codex CLI   | `apps/*`：业务包实现                                                              |
| Reviewer  | 按级别路由  | 独立验收：T0 由独立 reviewer 会话主审；T1 可由 Manager 派 fresh subagent；T2 免审 |

review 拓扑（三档 + 禁止同会话自审）以 [`docs/agents/workflow.md`](docs/agents/workflow.md) 的「review 拓扑」节为权威；编排路由与 Designer 启用判据见同文件「编排模式」节，本节不复制。

包边界与禁止事项：

- Lib Coder 只改 `packages/*`，Biz Coder 只改 `apps/*`；任何角色不得跨边界修改，也不得把业务逻辑下沉到共享包或把共享能力复制进业务包。
- 每个角色使用独立 worktree（或严格目录隔离）与唯一 owner；同一 worktree 不得被两个实施任务同时写入。
- 跨边界需求由 Manager 拆成独立 task 在各自 worktree 完成，并通过 handoff 传递契约，而不是由单个角色越界实现。
- Manager 不代替 Coder 修改生产代码，也不引入 Integrator 等额外层级。

<!-- invariant:handoff-fields -->

结构化 handoff 是角色之间唯一的交接方式，完整模板以 [`docs/agents/task-packet.md`](docs/agents/task-packet.md) 为权威；每次交接必须显式给出 `Goal（目标）`、`Scope（范围）`、`Acceptance（验收标准）`、`Test commands（测试命令）`、`Open decisions（未解决决策）`，缺少任何一项不得进入实施或验收。

## 不可绕过的仓库边界

- 不得改写 `.npmrc` 或 `.mise.toml` 的 registry/mirror，或任何 Git 配置。
- 不手动编辑生成文件：`**/routeTree.gen.ts`、`**/typed-router.d.ts`、`**/auto-imports.d.ts`、`apps/*/frontend/bindings/**`、`**/__screenshots__/`、`**/.vitest-attachments/`。当源码或配置变更要求更新受版本控制的代码生成物时，必须运行其所属 generator，并核对生成 diff 与消费者；不得复制、伪造或手改输出。精确入口见 [`docs/agents/build.md`](docs/agents/build.md)。
- `**/__screenshots__/` 和 `**/.vitest-attachments/` 是测试证据，不是常规源码产物；除非任务明确要求更新已验证的视觉基线，否则不创建、编辑或提交它们。
- `AGENTS.md`（含包级）、`docs/adr/`、`docs/agents/`、`.agents/rules/`、`.agents/skills/herdr-agents/roles/` 和仓库自编写的 `.agents/skills/` 下文档使用中文；自撰与第三方的判定以 `skills-lock.json` 为准，未登记的即自撰。第三方引入的 `.agents/skills/` 必须保持上游原文的语言与内容，更新时不得翻译或本地改写；其通用流程若与仓库规则、task guide 或实现事实冲突，以后者为准。技术术语、命令、路径和包名保留英文。
- 缺少 Node、pnpm 或 Go 时先运行 `mise install`；准确版本以 `.mise.toml`、`package.json` 与目标包 manifest 为准。
- 并行 agent 必须使用不同的 branch/worktree；不得在共享工作区执行 `git switch`、`git checkout`、`git stash`、`git reset` 或 `git clean`。新建 worktree 统一放在仓库旁的 `<仓库目录名>-worktrees/<worktree 名>`（例：仓库在 `path/to/mono`，worktree 放 `path/to/mono-worktrees/<name>`）；工具自带的 worktree 默认路径（如 `.claude/worktrees/`）不采用。
- 角色目录边界不可跨越；分工、边界与跨边界拆 task 的要求统一见「包边界与禁止事项」，worktree 布局见 [`docs/agents/worktrees.md`](docs/agents/worktrees.md)。
- 预授权操作（本地测试与校验命令、包级构建、`find:usages` / `inspect:contract` / `diff:contract` 等只读查询、在目标 worktree 内读文件）直接执行，不必逐步请示；需要逐次授权的是 commit/push/merge/publish、依赖与 lockfile、`.npmrc` / `.mise.toml` / Git 配置、凭证读写和破坏性 git 操作。清单见 [`docs/agents/workflow.md`](docs/agents/workflow.md) 的「预授权操作」。

## 按任务加载

| 任务或变更                                                | 先读                                                                                                                                                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript、CSS 或一般源码                                | [`.agents/rules/code-style.md`](.agents/rules/code-style.md)                                                                                                                                                 |
| 公共 API、exports、事件、类型适配或跨包运行时契约         | [`.agents/skills/contract-change-review/SKILL.md`](.agents/skills/contract-change-review/SKILL.md)、[`.agents/rules/testing.md`](.agents/rules/testing.md) 和 [`docs/agents/build.md`](docs/agents/build.md) |
| npm dependency / workspace catalog                        | [`docs/agents/dependencies.md`](docs/agents/dependencies.md)                                                                                                                                                 |
| 测试、公共行为、导出或构建产物                            | [`.agents/rules/testing.md`](.agents/rules/testing.md) 和 [`docs/agents/testing.md`](docs/agents/testing.md)                                                                                                 |
| UI、UX、交互或浏览器运行时                                | [`docs/agents/browser-verification.md`](docs/agents/browser-verification.md)；`web-ui` 任务再读 [`docs/agents/web-ui.md`](docs/agents/web-ui.md)                                                             |
| 构建脚本、Vite/Turbo、包图、外部化、CI 或发布             | [`docs/agents/build.md`](docs/agents/build.md)                                                                                                                                                               |
| 格式化、lint、拼写或类型检查配置                          | [`docs/agents/linting.md`](docs/agents/linting.md)                                                                                                                                                           |
| 变更影响或验证命令选择                                    | [`docs/agents/context.md`](docs/agents/context.md)（仓库内查询工具 `find:usages` / `inspect:contract` / `diff:contract` 的语义与参数）                                                                       |
| 全局拓扑和快速导航                                        | [`ARCHITECTURE.md`](ARCHITECTURE.md)；实现事实仍以源码、manifest、配置和测试为准                                                                                                                             |
| 架构探索、术语或 ADR                                      | [`CONTEXT.md`](CONTEXT.md) 和相关 ADR；context 分层与冲突处理见 [`docs/agents/context.md`](docs/agents/context.md)                                                                                           |
| instruction system / context 维护                         | [`docs/agents/context.md`](docs/agents/context.md)、[`CONTEXT.md`](CONTEXT.md) 和 ADR-0004                                                                                                                   |
| 代码 review                                               | [`docs/agents/workflow.md`](docs/agents/workflow.md)「review 拓扑」                                                                                                                                          |
| 全局替换 / 重命名 / API 迁移 / 文件迁移                   | [`docs/agents/global-rename.md`](docs/agents/global-rename.md)                                                                                                                                               |
| Git commit                                                | [`.agents/rules/commit.md`](.agents/rules/commit.md)、[`docs/agents/commit.md`](docs/agents/commit.md) 和 [`CONTRIBUTING.md`](CONTRIBUTING.md)（AI 协作署名）                                                |
| 开发流程、worktree 布局、release 分支或多 Agent 编排/交接 | [`docs/agents/workflow.md`](docs/agents/workflow.md)、[`docs/agents/task-packet.md`](docs/agents/task-packet.md) 和手动触发的 [`herdr-agents`](.agents/skills/herdr-agents/SKILL.md)                         |
| GitHub issue                                              | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)                                                                                                                                               |

涉及 UI、UX、交互、响应式或浏览器运行时的改动，必须按 [`browser-verification.md`](docs/agents/browser-verification.md) 在真实浏览器验证；构建成功或 jsdom 测试不能替代该验证。实现不熟悉或跨浏览器语义不明确的 Web Platform API 时，使用 MDN MCP 验证语义和兼容性。
