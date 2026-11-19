# Mono Agent Entry

本文件是所有 agent 的入口，说明项目身份、不可绕过的边界和任务路由。实现以源码、`package.json`、配置和测试为准；文档只解释意图，替代不了验证。

## 变更准入与登记

修改仓库前，按 [`.agents/skills/task-ledger/SKILL.md`](.agents/skills/task-ledger/SKILL.md) 定级并建账，分级、准入与恢复见该 skill；只读调查不建账。PR review 纪律见 [`docs/agents/review.md`](docs/agents/review.md)，方案到合并的总流程与授权见 [`docs/agents/workflow.md`](docs/agents/workflow.md)。

可变任务建账并按 [worktree](docs/agents/worktree.md#新-worktree-的准备) 完成准备后，按台账 `scope` 与实现/验证必需的包外读取路径，用 [turbo-sparse-scope](.agents/skills/turbo-sparse-scope/SKILL.md) 判断并处理稀疏范围；触发、跳过与稀疏树读取规则见该 skill。

## 项目身份

这是一个 pnpm + Turborepo monorepo：发布 `@greypan/*` 工具包和 Lit Web Components（`@greypan/web-ui`），并维护 React、Vue 与私有集成应用作为真实集成表面。

## 不可绕过的仓库边界

- 不得改写 `.npmrc` 或 `.mise.toml` 的 registry/mirror，或任何 Git 配置；唯一例外是由 `turbo-sparse-scope` 执行 sparse checkout 时管理所必需的 worktree 配置与 Git 的 worktree-config 开关，不得借此更改其他 Git 配置。
- **禁止手写或修改生成物**：不得手写新建、手工编辑生成文件，也不得用复制、补丁、格式化或 lint 自动改写绕过；唯一允许的写入是跑对应 generator 产生 diff。清单、路径与重新生成入口见 [`docs/agents/generated-artifacts.md`](docs/agents/generated-artifacts.md)，判定方法见该文「[怎么判断一个文件是不是生成的](docs/agents/generated-artifacts.md#怎么判断一个文件是不是生成的)」。正确性由 generator 重建证明，不由审查结论证明。
- `**/__screenshots__/` 与 `**/.vitest-attachments/` 是测试证据，不是源码产物。除非任务明确要求更新已验证的视觉基线，否则不创建、不编辑、不提交。
- `AGENTS.md`（含包级）、`docs/adr/`、`docs/agents/`、`.agents/rules/` 和仓库自撰 skill 的文档用中文。`skills-lock.json` 登记的第三方 skill 与 `.agents/skills-vendored/` 保持上游原文，和仓库规则冲突时以仓库规则为准。技术术语、命令、路径和包名保留英文。
- 一个可变 task 只有一个实施 worktree 和 owner，由外部编排层分配。不在共享工作区执行 `git switch`、`git checkout`、`git stash`、`git reset` 或 `git clean`。
- 预授权操作与需逐次授权的操作见 [`docs/agents/workflow.md`](docs/agents/workflow.md#预授权操作)。
- 在未激活 mise 的 shell 中，经 turbo 或调用被钉工具的命令必须经 mise 包装；例外、自检方式与判据见 [`docs/agents/worktree.md`](docs/agents/worktree.md#mise-exec-与命令外壳)。

## 按任务加载

<!-- prettier-ignore -->
| 任务或变更 | 先读 |
| --- | --- |
| 生成物：清单、重新生成、Build 前校验 | [generated-artifacts](docs/agents/generated-artifacts.md)、[build-generated](docs/agents/build-generated.md) |
| 构建、根命令、打包与浏览器目标 | [build](docs/agents/build.md)、[build-packaging](docs/agents/build-packaging.md)、[build-browser](docs/agents/build-browser.md)、[commands](docs/agents/commands.md) |
| 跨包、公共契约、影响面 | [monorepo-change-impact](.agents/skills/monorepo-change-impact/SKILL.md)、[build](docs/agents/build.md) |
| 脚本准入、根配置、依赖 | [script-policy](docs/agents/script-policy.md)、[dependencies](docs/agents/dependencies.md) |
| 发布、环境、CI 门控 | [release](docs/agents/release.md)、[environments](docs/agents/environments.md)、[build-ci](docs/agents/build-ci.md) |
| 验证、运行时冒烟 | [verification](docs/agents/verification.md)、[runtime-verification](docs/agents/runtime-verification.md) |
| UI 视觉与组件 | [ui-design](docs/agents/ui-design.md)、[web-ui](docs/agents/web-ui.md) |
| 浏览器资源与格式 | [browser-resources](docs/agents/browser-resources.md)、[lint-format](docs/agents/lint-format.md) |
| PR review、工作流 | [review](docs/agents/review.md)、[workflow](docs/agents/workflow.md) |
| worktree、提交 | [worktree](docs/agents/worktree.md)、[commit](docs/agents/commit.md) |
| 新增或修改 agent 文档/指令 | [writing-agent-docs](docs/agents/writing-agent-docs.md)、[agent-context](docs/agents/agent-context.md) |

短约束：[code-style](.agents/rules/code-style.md)、[terminology](.agents/rules/terminology.md)、[commands](.agents/rules/commands.md)、[commit](.agents/rules/commit.md)、[testing](.agents/rules/testing.md)、[agent-context](.agents/rules/agent-context.md)。

测试用例：[test-authoring](.agents/skills/test-authoring/SKILL.md)。

架构与术语：[CONTEXT.md](CONTEXT.md)、[ARCHITECTURE.md](ARCHITECTURE.md)；应用/包领域词汇看对应 `AGENTS.md`，ADR 索引在 `CONTEXT.md`。
