# Mono Agent Entry

本文件是所有 agent 的入口，说明项目身份、不可绕过的边界和任务路由。实现以源码、`package.json`、配置和测试为准；文档只解释意图，替代不了验证。

## Mutation Gate

改动任何文件前，先读 [`docs/agents/workflow.md`](docs/agents/workflow.md)，再按变更级别建 task：`pnpm agent:task new --task <task-id> --level t0|t1|t2`。级别怎么判、要哪些 review 和 approval，都写在那份文件里。只做只读调查不用建 task。

## 项目身份

这是一个 pnpm + Turborepo monorepo：发布 `@greypan/*` 工具包和 Lit Web Components（`@greypan/web-ui`），并维护 React、Vue 与私有集成应用作为真实集成表面。

## 不可绕过的仓库边界

- 不得改写 `.npmrc` 或 `.mise.toml` 的 registry/mirror，或任何 Git 配置。
- 不手动编辑生成文件：`**/routeTree.gen.ts`、`**/typed-router.d.ts`、`**/auto-imports.d.ts`、`apps/*/frontend/bindings/**`、`**/__screenshots__/`、`**/.vitest-attachments/`。要更新受版本控制的生成物就运行它的 generator，不要复制、伪造或手改。入口见 [`docs/agents/build.md`](docs/agents/build.md)。
- `**/__screenshots__/` 与 `**/.vitest-attachments/` 是测试证据，不是源码产物。除非任务明确要求更新已验证的视觉基线，否则不创建、不编辑、不提交。
- `AGENTS.md`（含包级）、`docs/adr/`、`docs/agents/`、`.agents/rules/` 和仓库自撰 skill 的文档用中文。`skills-lock.json` 登记的第三方 skill 与 `.agents/skills-vendored/` 保持上游原文，和仓库规则冲突时以仓库规则为准。技术术语、命令、路径和包名保留英文。
- 一个可变 task 只有一个实施 worktree 和 owner，由外部编排层分配。不在共享工作区执行 `git switch`、`git checkout`、`git stash`、`git reset` 或 `git clean`。
- 预授权操作与需逐次授权的操作见 [`docs/agents/workflow.md`](docs/agents/workflow.md) 的「预授权操作」。
- 在未激活 mise 的 shell（agent 工具宿主、`git hook`、`bash -c`、外部脚本）里，经 turbo 或调用被钉工具（node / pnpm / go）的命令必须写成 `mise exec -- <command>`；`agent:env-doctor` 例外，它靠裸跑暴露「当前 shell 没激活 mise」。自检 `echo "${TURBO_CACHE_DIR:-<unset>}"` 非空只说明 env 已被注入。判据与理由见 [`docs/agents/build.md`](docs/agents/build.md#mise-exec-与命令外壳)。

## 按任务加载

| 任务或变更                                        | 先读                                                                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript、CSS 或一般源码                        | [`.agents/rules/code-style.md`](.agents/rules/code-style.md)                                                                                                                                                 |
| 公共 API、exports、事件、类型适配或跨包运行时契约 | [`.agents/skills/contract-change-review/SKILL.md`](.agents/skills/contract-change-review/SKILL.md)、[`.agents/rules/testing.md`](.agents/rules/testing.md) 和 [`docs/agents/build.md`](docs/agents/build.md) |
| npm dependency / workspace catalog                | [`docs/agents/dependencies.md`](docs/agents/dependencies.md)                                                                                                                                                 |
| 测试、公共行为、导出或构建产物                    | [`.agents/rules/testing.md`](.agents/rules/testing.md)                                                                                                                                                       |
| UI、UX、交互、响应式或浏览器运行时                | [`docs/agents/runtime-verification.md`](docs/agents/runtime-verification.md)；`web-ui` 任务再读 [`docs/agents/web-ui.md`](docs/agents/web-ui.md)                                                             |
| Interweave、Wails 或领域模型                      | [`apps/interweave/AGENTS.md`](apps/interweave/AGENTS.md)、[`CONTEXT.md`](CONTEXT.md) 的 Interweave 词汇、ADR-0008/0009                                                                                       |
| 构建脚本、Vite/Turbo、包图、外部化、CI 或发布     | [`docs/agents/build.md`](docs/agents/build.md)                                                                                                                                                               |
| 客户端权限、注入的环境变量                        | [`docs/agents/environments.md`](docs/agents/environments.md)                                                                                                                                                 |
| 格式化、lint、拼写或类型检查配置                  | [`docs/agents/lint-format.md`](docs/agents/lint-format.md)                                                                                                                                                   |
| 新增或重命名根 `package.json` 命令                | [`.agents/rules/commands.md`](.agents/rules/commands.md)                                                                                                                                                     |
| 变更影响或验证命令选择                            | [`.agents/skills/contract-change-review/SKILL.md`](.agents/skills/contract-change-review/SKILL.md)（影响面查询、契约审查与最小验证由 skill 内置脚本提供）                                                    |
| 全局拓扑和快速导航                                | [`ARCHITECTURE.md`](ARCHITECTURE.md)                                                                                                                                                                         |
| 架构探索、术语或 ADR                              | [`CONTEXT.md`](CONTEXT.md) 和相关 ADR；context 分层与冲突处理见 [`docs/agents/agent-context.md`](docs/agents/agent-context.md)                                                                               |
| instruction system / context 维护                 | [`.agents/rules/agent-context.md`](.agents/rules/agent-context.md)、[`CONTEXT.md`](CONTEXT.md) 和 ADR-0004                                                                                                   |
| 代码 review                                       | [`docs/agents/workflow.md`](docs/agents/workflow.md#review-拓扑)                                                                                                                                             |
| Git commit                                        | [`.agents/rules/commit.md`](.agents/rules/commit.md)                                                                                                                                                         |
| 开发流程或 worktree 布局                          | [`docs/agents/workflow.md`](docs/agents/workflow.md) 和 [`docs/agents/build.md`](docs/agents/build.md)                                                                                                       |
