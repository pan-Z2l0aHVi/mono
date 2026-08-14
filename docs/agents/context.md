# Agent Context 架构

本指南定义仓库如何为 agent 提供 context。它只用于 instruction system、仓库拓扑和架构 context 维护；普通 coding task 只按根入口加载命中的 task-specific 文档。

**快速入口**：全局拓扑先看 [`ARCHITECTURE.md`](../../ARCHITECTURE.md)；协作流程先看 [`CONTRIBUTING.md`](../../CONTRIBUTING.md)。本指南是 context system 的维护规范，不是所有任务的必读手册。

## Context 层级

| 层级               | 权威来源                                                         | 何时加载                               | 内容边界                             |
| ------------------ | ---------------------------------------------------------------- | -------------------------------------- | ------------------------------------ |
| Always available   | 根 `AGENTS.md`                                                   | 每次任务                               | 项目身份、不可绕过边界、任务路由     |
| Repository map     | 根 `ARCHITECTURE.md`                                             | 需要全局拓扑、workspace 定位或热点概览 | 稳定目录地图、依赖草图、影响热点     |
| Project context    | `CONTEXT.md`                                                     | 架构、跨包、术语、长期设计             | 包边界、工程原则、领域词汇、ADR 索引 |
| Task-specific      | `docs/agents/*.md`、`.agents/rules/*.md`、最近的包级 `AGENTS.md` | 任务命中对应领域                       | 可执行流程、质量门槛、局部约束       |
| On-demand evidence | ADR、README、manifest、配置、源码、测试                          | 已确认受影响区域后                     | 历史取舍、公共契约、当前实现         |

不要为“可能有用”批量加载文档。规则只保留无法由代码、类型、测试或工具配置可靠推导的约束；可自动验证的约束优先交给相应工具。

## 重复主题的权威来源

不同层级可以为路由而短暂提及同一主题，但只能有一个流程权威来源；其他位置只说明何时加载或链接到它，不能复制完整处方。

| 主题               | 规则边界                                                 | 流程权威来源                          | 自动证据                                               |
| ------------------ | -------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| 生成物             | 根/包级 `AGENTS.md` 说明“不可手改”与局部 source of truth | `docs/agents/build.md`                | generator diff、build、消费者类型检查                  |
| 真实浏览器         | 根/包级 `AGENTS.md` 仅声明需要浏览器层                   | `docs/agents/browser-verification.md` | `pnpm run test` 中的 `*.browser.spec.ts`、MCP 操作记录 |
| `repo:*` 工具      | 根入口只提供命令路由                                     | 本文件的工具接口说明                  | `scripts/scripts.test.mjs`                          |
| 公共 `web-ui` 契约 | `packages/web-ui/AGENTS.md` 指向受影响消费者             | `docs/agents/web-ui.md`               | fixtures、contracts、browser/integration tests         |

## 客户端适配

- `AGENTS.md`、`CONTEXT.md`、`docs/agents/`、`.agents/rules/`、`.agents/skills/` 与 `.agents/agents/` 是 Codex 和 Claude Code 共用的规范。
- Codex 通过层级 `AGENTS.md` 获得目录约束；根 `CLAUDE.md` 只说明 Claude Code 的加载顺序，不复制共享规则。
- ACP plan 是当前会话的临时进度 UI；多阶段任务的创建、阶段同步和结束前收敛以 [`CONTRIBUTING.md`](../../CONTRIBUTING.md) 为权威。它不持久化为 `agent-state`，也不能替代源码、Git 或验证证据。
- `.claude/rules`、`.claude/skills` 和 `.claude/agents` 必须通过 symlink 指向 `.agents/` 中的共享内容。
- `scripts/validate-context.mjs` 只检查这套共享 context 的可加载性，不能替代对规则语义、代码行为或 agent 输出质量的评审。
- `scripts/repo-query.mjs` 是面向 Agent 的按需查询接口：`pnpm find:usages -- <paths...>` 一次输出受影响 workspace、最小读取 context、传递依赖、所需证据和最小充分验证建议；`pnpm inspect:contract -- <published-package>` 输出当前 exports、直接消费者和最小验证；`pnpm diff:contract -- --base <git-ref>` 输出 manifest-level semver 审阅候选。`find:usages` 支持 `--base <git-ref>`、`--staged` 与 `--worktree` 从 Git 变更集读取路径。它从 `pnpm-workspace.yaml` 的 `packages` patterns、当前 manifest 和路径规则派生结论，不把影响面复制成静态文档。
- `scripts/check-pack.mjs` 在构建后校验发布 package 的 `files` 与 `exports` 目标可从 `pnpm pack --dry-run` 产物解析；它是发布产物边界的可执行证据，不替代 API 语义或 semver 评审。
- `.claude/settings.local.json` 不得显式放行根 `AGENTS.md` 禁止的共享 worktree Git 改写操作（`stash`、`switch`、`checkout`、`reset`、`clean`）；`validate-context` 负责检测这一类显式权限冲突。

## 评测与审计

- 快速审计规则密度和重复主题：`pnpm audit:instructions -- --json`。它只生成候选，不自动判断语义冲突或删除规则；重复主题应回到权威来源、加载条件和实现证据人工复核。
- 真实任务评测定义：[`context-benchmark.md`](context-benchmark.md)。它定义 C01–C10、首次成功率、读取量、影响范围和验证选择的比较口径；真实 trace 由外部 evaluation harness 保存，不是普通源码任务的必跑测试。

## 最小 context 组合

| 任务                  | 最小入口                                                                               | 需要升级时再读                                         |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 局部工具函数          | 根 `AGENTS.md` + 目标包 `AGENTS.md` + 目标源码/测试                                    | `.agents/rules/code-style.md`、包 README               |
| `web-ui` 组件或类型   | 根/包级 `AGENTS.md` + `docs/agents/web-ui.md` + 组件源码/测试                          | 对应 ADR、React/Vue demo type fixtures                 |
| 跨包公共 API          | `contract-change-review` skill + `find:usages`/`inspect:contract` 输出 + 受影响包 context | `docs/agents/testing.md`、相关消费者和 ADR             |
| 构建/依赖/发布        | `ARCHITECTURE.md` + `docs/agents/build.md` 或 `dependencies.md` + manifests            | CI workflow、ADR-0001/0002/0009                        |
| InterWeave/Wails/领域 | `apps/interweave/AGENTS.md` + `apps/interweave/frontend/AGENTS.md` + 相关源码          | ADR-0013-0016、Wails 3 官方文档                        |
| context system        | `ARCHITECTURE.md` + `CONTEXT.md` + 本文件 + ADR-0012                                   | `scripts/validate-context.mjs`、共享 symlinks 和当前 diff |

不要把“最小入口”理解为足够完成实现；它只是开始定位的最小上下文。实现和交付前必须读取工具输出指出的证据，并按风险升级验证。

## 权威性与冲突处理

- **当前实现优先**：源码、测试、`package.json`、workspace 配置和构建配置是当前行为的证据；地图或 README 与它们冲突时，以实现为准，并记录是否需要同步文档。
- **局部约束优先**：目标目录最近的 `AGENTS.md` 负责局部不可绕过约束；根 `AGENTS.md` 负责仓库级边界和路由。
- **流程与背景分离**：`docs/agents/*` 和 `.agents/rules/*` 描述按任务加载的流程；`CONTEXT.md` 和 ADR 描述架构、术语和长期取舍；`ARCHITECTURE.md` 只做快速地图。
- **适配入口不复制规则**：`CLAUDE.md` 只负责 Claude Code 的入口提示；`.claude/{rules,skills,agents}` 通过 symlink 复用 `.agents/`，不建立第二套规范。
- **不确定时不要猜**：当文档、类型、配置和源码不能共同证明边界时，停在最小受影响范围，读取相关测试/ADR或报告未决风险。

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
| client adapter、共享 rules、skills 或 agent profile | `context.md`、`CONTEXT.md`、ADR-0012 与 `scripts/validate-context.mjs` | `CLAUDE.md`、`.agents/`、root scripts              |

## 维护 instruction system

新增 instruction、rule、skill 或 profile 前，先证明现有源码设计、类型、测试、lint 或脚本无法表达该约束。新增内容必须说明：何时加载、哪个事实是权威、违反后有什么工程风险。不能回答时，不新增文档或规则。
