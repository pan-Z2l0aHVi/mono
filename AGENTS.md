# Mono Agent Entry

本文件是所有 agent 的轻量入口：提供项目身份、长期边界和任务路由，不承载实现细节、操作手册或任务清单。

## 先确定所需 context

1. 先查看工作区状态、目标文件和最近的 `AGENTS.md`；只有进入某个 `apps/` 或 `packages/` 时才加载其包级指令。
2. 按任务命中对应的 task guide、rule 和包级指令；不要为普通局部 coding task 预先加载完整的 `docs/agents/context.md`。
3. 只有在架构探索、跨包依赖、仓库拓扑、项目术语、长期设计取舍或 instruction system 维护时，才阅读 [`CONTEXT.md`](CONTEXT.md) 和 [`docs/agents/context.md`](docs/agents/context.md)，再只打开相关 ADR。
4. 以当前源码、`package.json`、配置和测试为事实来源；文档解释意图，不能替代实现验证。

## 项目身份

这是一个 pnpm + Turborepo monorepo：发布 `@greypan/*` 工具包和 Lit Web Components（`@greypan/web-ui`），并维护 React、Vue 和 Wails 私有应用作为真实集成表面。长期架构方向是可组合的 plugin、Shadow DOM 隔离、框架无关的组件契约和无环的工作区依赖图；跨包边界与 ADR 索引见 [`CONTEXT.md`](CONTEXT.md)。

## 不可绕过的仓库边界

- 不得改写 `.npmrc` 或 `.mise.toml` 的 registry/mirror，或任何 Git 配置。
- 不手动编辑生成文件：`**/routeTree.gen.ts`、`**/auto-imports.d.ts`、`apps/wails-starter/frontend/bindings/**`、`**/__screenshots__/`、`**/.vitest-attachments/`。
- `AGENTS.md`（含包级）、`docs/adr/`、`docs/agents/` 和 `.agents/rules/` 下的文档使用中文；技术术语、命令、路径和包名保留英文。
- 缺少 Node、pnpm 或 Go 时先运行 `mise install`；准确版本以 `.mise.toml`、`package.json` 与目标包 manifest 为准。

依赖、CI/CD、commit 和 release 操作的具体约束分别由对应 task context 路由，不在根入口重复。

## 按任务加载

| 任务或变更                                    | 先读                                                                                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript、CSS、公共 API 或一般源码          | [`.agents/rules/code-style.md`](.agents/rules/code-style.md)                                                                                                      |
| React 源码                                    | [`.agents/rules/react.md`](.agents/rules/react.md)                                                                                                                |
| npm dependency / workspace catalog            | [`.agents/rules/dep-management.md`](.agents/rules/dep-management.md) 和 [`docs/agents/dependencies.md`](docs/agents/dependencies.md)                              |
| 测试、公共行为、导出或构建产物                | [`.agents/rules/testing.md`](.agents/rules/testing.md) 和 [`docs/agents/testing.md`](docs/agents/testing.md)                                                      |
| UI、UX、交互或浏览器运行时                    | [`docs/agents/browser-verification.md`](docs/agents/browser-verification.md)；`web-ui` 任务再读 [`docs/agents/web-ui.md`](docs/agents/web-ui.md)                  |
| 构建脚本、Vite/Turbo、包图、外部化、CI 或发布 | [`docs/agents/build.md`](docs/agents/build.md)                                                                                                                    |
| 格式化、lint、拼写或类型检查配置              | [`docs/agents/linting.md`](docs/agents/linting.md)                                                                                                                |
| 架构探索、术语或 ADR                          | [`docs/agents/domain.md`](docs/agents/domain.md)、[`CONTEXT.md`](CONTEXT.md) 和相关 ADR                                                                           |
| instruction system / context 维护             | [`docs/agents/context.md`](docs/agents/context.md)、[`docs/agents/agent-workflow.md`](docs/agents/agent-workflow.md)、[`CONTEXT.md`](CONTEXT.md) 和 ADR-0012/0013 |
| 实现、验证或 agent 协作                       | [`docs/agents/agent-workflow.md`](docs/agents/agent-workflow.md)；按需使用 `.agents/agents/` 与 `.agents/skills/`                                                 |
| 任务提示或 agent eval                         | [`docs/agents/prompting.md`](docs/agents/prompting.md) 和 [`docs/agents/evals/`](docs/agents/evals/)                                                              |
| 代码 review                                   | [`.agents/rules/review-checklist.md`](.agents/rules/review-checklist.md)、[`docs/agents/review.md`](docs/agents/review.md) 和 `.agents/agents/reviewer.md`        |
| Git commit                                    | [`.agents/rules/commit.md`](.agents/rules/commit.md) 和 [`docs/agents/commit.md`](docs/agents/commit.md)                                                          |
| GitHub issue                                  | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)                                                                                                    |

涉及 UI、UX、交互、响应式或浏览器运行时的改动，必须按 [`browser-verification.md`](docs/agents/browser-verification.md) 在真实浏览器验证；构建成功或 jsdom 测试不能替代该验证。实现不熟悉或跨浏览器语义不明确的 Web Platform API 时，使用 MDN MCP 验证语义和兼容性。

## 文档同步

只有修改 instruction system、仓库拓扑、构建/包结构、依赖策略、运行时/工具链、测试配置、编码规范、`web-ui` 或提交工作流时，才按 [`docs/agents/context.md`](docs/agents/context.md) 的「变更与文档同步」表同步权威文档；普通源码任务不需要加载该表。
