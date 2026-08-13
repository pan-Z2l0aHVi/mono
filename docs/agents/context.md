# Agent Context 架构

本指南定义仓库如何为 agent 提供 context。它只用于 instruction system、仓库拓扑和架构 context 维护；普通 coding task 只按根入口加载命中的 task-specific 文档。

## Context 层级

| 层级               | 权威来源                                                         | 何时加载                         | 内容边界                             |
| ------------------ | ---------------------------------------------------------------- | -------------------------------- | ------------------------------------ |
| Always available   | 根 `AGENTS.md`                                                   | 每次任务                         | 项目身份、不可绕过边界、任务路由     |
| Project context    | `CONTEXT.md`                                                     | 架构、跨包、拓扑、术语、长期设计 | 包边界、依赖方向、工程原则、ADR 索引 |
| Task-specific      | `docs/agents/*.md`、`.agents/rules/*.md`、最近的包级 `AGENTS.md` | 任务命中对应领域                 | 可执行流程、质量门槛、局部约束       |
| On-demand evidence | ADR、README、manifest、配置、源码、测试                          | 已确认受影响区域后               | 历史取舍、公共契约、当前实现         |

不要为“可能有用”批量加载文档。规则只保留无法由代码、类型、测试或工具配置可靠推导的约束；可自动验证的约束优先交给相应工具。

## 客户端适配

- `AGENTS.md`、`CONTEXT.md`、`docs/agents/`、`.agents/rules/`、`.agents/skills/` 与 `.agents/agents/` 是 Codex 和 Claude Code 共用的规范。
- Codex 通过层级 `AGENTS.md` 获得目录约束；根 `CLAUDE.md` 只说明 Claude Code 的加载顺序，不复制共享规则。
- `.claude/rules`、`.claude/skills` 和 `.claude/agents` 必须通过 symlink 指向 `.agents/` 中的共享内容。
- `scripts/context-check.mjs` 只检查这套共享 context 的可加载性，不能替代对规则语义、代码行为或 agent 输出质量的评审。
- `scripts/repo-context.mjs` 是面向 Agent 的按需查询接口：`pnpm repo:impact -- <paths...>` 输出受影响的非 Weave workspace；`pnpm repo:verify -- <paths...>` 额外给出最小充分验证。它从当前 manifest 和路径规则派生结论，不把影响面复制成静态文档。
- `scripts/package-contract-check.mjs` 在构建后校验发布 package 的 `files` 与 `exports` 目标存在；它是发布产物边界的可执行证据，不替代 API 语义或 semver 评审。

## 变更与文档同步

普通源码任务不需要阅读本表。修改以下工程资产时，在同一变更中同步对应权威文档；范围不明确时先查本表和相邻包 `AGENTS.md`。

| 变更类别                                            | 必须同步的文档                                                      | 事实来源                                           |
| --------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| 构建脚本、Vite/Turbo、CI/CD                         | `docs/agents/build.md`；根命令还更新 `AGENTS.md`                    | `package.json`、`turbo.json`、`.github/workflows/` |
| 包新增、移除或重命名                                | `CONTEXT.md`                                                        | `packages/`、`apps/` 目录与 manifest               |
| lint、formatter、stylelint、cspell                  | `docs/agents/linting.md`                                            | 对应配置                                           |
| workspace catalog 或 Changesets 策略                | `docs/agents/dependencies.md`                                       | `pnpm-workspace.yaml`、Changesets 配置             |
| 测试框架或 Vite 测试配置                            | `docs/agents/testing.md`                                            | 测试配置                                           |
| `packages/web-ui` 组件、图标或公共契约              | `packages/web-ui/AGENTS.md`、`docs/agents/web-ui.md` 与受影响 ADR   | 组件源码、类型、测试                               |
| commitlint 或提交流程                               | `docs/agents/commit.md`                                             | commit 配置或工作流                                |
| 影响未来工程取舍的架构决定                          | 对应 ADR，并更新 `CONTEXT.md` ADR 索引                              | 可行替代方案之间的长期选择                         |
| client adapter、共享 rules、skills 或 agent profile | `context.md`、`CONTEXT.md`、ADR-0012 与 `scripts/context-check.mjs` | `CLAUDE.md`、`.agents/`、root scripts              |

## 维护 instruction system

新增 instruction、rule、skill 或 profile 前，先证明现有源码设计、类型、测试、lint 或脚本无法表达该约束。新增内容必须说明：何时加载、哪个事实是权威、违反后有什么工程风险。不能回答时，不新增文档或规则。
