# Mono Agent Entry

本文件是所有 agent 的轻量入口：只提供项目身份、不可绕过边界和任务路由。实现事实以当前源码、`package.json`、配置和测试为准；文档解释意图，不能替代验证。

## 先确定所需 context

- 全局拓扑和快速定位：[`ARCHITECTURE.md`](ARCHITECTURE.md)。
- 协作流程短入口：[`CONTRIBUTING.md`](CONTRIBUTING.md)；它不取代按任务加载的规则。

1. 先查看工作区状态、目标文件和最近的 `AGENTS.md`；只有进入某个 `apps/` 或 `packages/` 时才加载其包级指令。
2. 只按任务加载命中的 rule、guide 和包级指令；不要为普通局部任务预读 `CONTEXT.md`、ADR 或无关领域指南。
3. 需要全局拓扑时先阅读 [`ARCHITECTURE.md`](ARCHITECTURE.md)；只有架构、跨包、仓库拓扑、术语、长期设计或 instruction system 维护时，才继续阅读 [`CONTEXT.md`](CONTEXT.md)、[`docs/agents/context.md`](docs/agents/context.md) 和相关 ADR。

## 项目身份

这是一个 pnpm + Turborepo monorepo：发布 `@greypan/*` 工具包和 Lit Web Components（`@greypan/web-ui`），并维护 React、Vue 与私有集成应用作为真实集成表面。长期架构方向是可组合的 plugin、Shadow DOM 隔离、框架无关的组件契约和无环的工作区依赖图；跨包边界与 ADR 索引见 [`CONTEXT.md`](CONTEXT.md)。

## 不可绕过的仓库边界

- 不得改写 `.npmrc` 或 `.mise.toml` 的 registry/mirror，或任何 Git 配置。
- 不手动编辑生成文件：`**/routeTree.gen.ts`、`**/auto-imports.d.ts`、`apps/*/frontend/bindings/**`、`**/__screenshots__/`、`**/.vitest-attachments/`。当源码或配置变更要求更新受版本控制的代码生成物时，必须运行其所属 generator，并核对生成 diff 与消费者；不得复制、伪造或手改输出。精确入口见 [`docs/agents/build.md`](docs/agents/build.md)。
- `**/__screenshots__/` 和 `**/.vitest-attachments/` 是测试证据，不是常规源码产物；除非任务明确要求更新已验证的视觉基线，否则不创建、编辑或提交它们。
- `AGENTS.md`（含包级）、`docs/adr/`、`docs/agents/` 和 `.agents/rules/` 下的文档使用中文；技术术语、命令、路径和包名保留英文。
- 缺少 Node、pnpm 或 Go 时先运行 `mise install`；准确版本以 `.mise.toml`、`package.json` 与目标包 manifest 为准。
- 并行 agent 必须使用不同的 branch/worktree；不得在共享工作区执行 `git switch`、`git checkout`、`git stash`、`git reset` 或 `git clean`。

## 按任务加载

| 任务或变更                                        | 先读                                                                                                                                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript、CSS 或一般源码                        | [`.agents/rules/code-style.md`](.agents/rules/code-style.md)                                                                                                                                                    |
| 公共 API、exports、事件、类型适配或跨包运行时契约 | [`.agents/skills/contract-change-review/SKILL.md`](.agents/skills/contract-change-review/SKILL.md)、[`.agents/rules/testing.md`](.agents/rules/testing.md) 和 [`docs/agents/build.md`](docs/agents/build.md)    |
| React 源码                                        | [`.agents/rules/react.md`](.agents/rules/react.md)                                                                                                                                                              |
| npm dependency / workspace catalog                | [`.agents/rules/dep-management.md`](.agents/rules/dep-management.md) 和 [`docs/agents/dependencies.md`](docs/agents/dependencies.md)                                                                            |
| 测试、公共行为、导出或构建产物                    | [`.agents/rules/testing.md`](.agents/rules/testing.md) 和 [`docs/agents/testing.md`](docs/agents/testing.md)                                                                                                    |
| UI、UX、交互或浏览器运行时                        | [`docs/agents/browser-verification.md`](docs/agents/browser-verification.md)；`web-ui` 任务再读 [`docs/agents/web-ui.md`](docs/agents/web-ui.md)                                                                |
| 构建脚本、Vite/Turbo、包图、外部化、CI 或发布     | [`docs/agents/build.md`](docs/agents/build.md)                                                                                                                                                                  |
| 格式化、lint、拼写或类型检查配置                  | [`docs/agents/linting.md`](docs/agents/linting.md)                                                                                                                                                              |
| 变更影响或验证命令选择                            | `pnpm repo:verify -- <paths...>`；`pnpm repo:contract -- <package>`；`pnpm repo:contract-diff -- --base <git-ref>`；改动查询也可使用 `--base <git-ref>`、`--staged` 或 `--worktree`                             |
| 全局拓扑和快速导航                                | [`ARCHITECTURE.md`](ARCHITECTURE.md)；实现事实仍以源码、manifest、配置和测试为准                                                                                                                                |
| 架构探索、术语或 ADR                              | [`docs/agents/domain.md`](docs/agents/domain.md)、[`CONTEXT.md`](CONTEXT.md) 和相关 ADR                                                                                                                         |
| instruction system / context 维护                 | [`docs/agents/context.md`](docs/agents/context.md)、[`CONTEXT.md`](CONTEXT.md) 和 ADR-0012                                                                                                                      |
| 代码 review                                       | [`.agents/rules/review-checklist.md`](.agents/rules/review-checklist.md)、[`docs/agents/review.md`](docs/agents/review.md)；需要独立 reviewer 时再读 [`.agents/agents/reviewer.md`](.agents/agents/reviewer.md) |
| Git commit                                        | [`.agents/rules/commit.md`](.agents/rules/commit.md) 和 [`docs/agents/commit.md`](docs/agents/commit.md)                                                                                                        |
| GitHub issue                                      | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)                                                                                                                                                  |

涉及 UI、UX、交互、响应式或浏览器运行时的改动，必须按 [`browser-verification.md`](docs/agents/browser-verification.md) 在真实浏览器验证；构建成功或 jsdom 测试不能替代该验证。实现不熟悉或跨浏览器语义不明确的 Web Platform API 时，使用 MDN MCP 验证语义和兼容性。
