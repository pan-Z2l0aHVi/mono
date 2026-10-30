# Mono 项目架构 Context

本文件是 repository-level project context：记录核心工程原则、Task/PR 流程词汇和 ADR 索引。领域词汇跟随其 owner，落在对应的包或应用级 `AGENTS.md`。仅在架构、术语或长期设计取舍相关任务中阅读；不要把它当作逐项操作手册。

## 核心工程原则

- **Plugin over inheritance。** 扩展性通过 [`packages/js-kit/src/plugin-system/`](packages/js-kit/src/plugin-system/) 的函数组合实现，不以 class 层级承载内部状态或行为。
- **Acyclic workspace graph。** 工作区依赖保持有向无环，`js-kit` 是运行时代码的基础包。

## Task 与 PR 流程词汇

**Task 台账**：在系统临时目录维护本地 task 归属与进度；它不承载 review、测试或 CI 结论。字段、状态与恢复边界见 [`.agents/skills/task-ledger/SKILL.md`](.agents/skills/task-ledger/SKILL.md)。
_Avoid_: 证据链、冻结审批状态

**PR review**：PR 阶段由 reviewer 对实际 diff、验收条件和验证结果进行的独立检查。required CI 通过不等于 review 结论，纪律见 [`docs/agents/review.md`](docs/agents/review.md)。
_Avoid_: 本地 review phase、CI 绿即 review 通过

## 关键 ADR

2026-10-30 重新编排了 ADR 编号；更早的 research、CHANGELOG 和 Git 历史中的编号按当时的记录解释，不能直接套用当前索引。

ADR 只记录技术选型、架构设计与工程化决策；具体实现细节放在源码、测试或对应文档。表内只列仍承载现行决策的 ADR；被取代、退役或删除的记录只留在 git 里，旧 ADR 的修订注记不构成现行指引。需求拆分与 task 派发由外部编排层承担；仓库侧由本地 Task 台账记录归属与进度，由独立政策检查器运行只读检查。职责分别见 [`.agents/skills/task-ledger/SKILL.md`](.agents/skills/task-ledger/SKILL.md)、[`docs/agents/commit.md`](docs/agents/commit.md)、[`docs/agents/worktree.md`](docs/agents/worktree.md) 与 [`docs/agents/release.md`](docs/agents/release.md)。

| ADR                                                             | 决策                                                          | 何时读取                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [0001](docs/adr/0001-ci-pipeline.md)                            | CI 验证流程                                                   | 修改验证、Changesets 或发布门控                                          |
| [0002](docs/adr/0002-build-toolchain.md)                        | 构建工具链                                                    | 修改 Vite Plus、构建或测试工具链                                         |
| [0003](docs/adr/0003-release-planes.md)                         | 发布平面                                                      | 修改 npm/Wails 发布流程                                                  |
| [0004](docs/adr/0004-progressive-agent-context-architecture.md) | Agent Context 架构                                            | 修改 agent context、rules、skills 或 instruction system                  |
| [0005](docs/adr/0005-web-ui-components.md)                      | Web UI 组件架构                                               | 修改 web-ui 组件技术选型、公共契约、事件模型、框架类型适配或 icon 系统   |
| [0006](docs/adr/0006-web-ui-composition.md)                     | Web UI 组合与渲染架构                                         | 修改 overlay 交互/定位、布局层级、design token 或 @lit/context 组合模式  |
| [0007](docs/adr/0007-plugin-system.md)                          | Plugin 系统                                                   | 设计可组合状态或行为模块                                                 |
| [0008](docs/adr/0008-interweave-backend.md)                     | Interweave 后端架构                                           | 修改 interweave Go 模块、Wails Service 或 frontend bindings              |
| [0009](docs/adr/0009-interweave-sqlite.md)                      | SQLite 持久化与 WAL                                           | 修改 interweave 持久化层或 SQLite 并发模型                               |
| [0010](docs/adr/0010-task-orchestration.md)                     | 编排层承接需求拆分与 task 派发                                | 修改 worktree 分工、T0 判据或编排层边界                                  |
| [0011](docs/adr/0011-layout-mobile-state.md)                    | Layout 暴露派生视口状态（`mobile` / `mobile-change`）         | 修改 layout 的断点判定、给组件加派生状态，或让 app 消费移动端判定        |
| [0012](docs/adr/0012-pr-review.md)                              | PR 独立 review 与增量复审                                     | 修改 task 登记簿、政策检查集合、PR changeset gate 或 review/merge 前核验 |
| [0013](docs/adr/0013-context-authority.md)                      | Context 语料权威与漂移门禁                                    | 修改指令文档的权威标记、漂移门禁或 RAG 语料契约                          |
| [0014](docs/adr/0014-script-organization.md)                    | 脚本按执行面分类与统一入口                                    | 修改政策检查集合、pre-commit / CI policy 入口或脚本目录布局              |
| [0015](docs/adr/0015-task-ledger.md)                            | Task 分级与记账提取为通用 skill                               | 修改 task 分级判据、台账命令、状态目录或跨项目复用方式                   |
| [0016](docs/adr/0016-accessible-names.md)                       | web-ui 内置无障碍文案固定英文回退，覆盖 prop 统一挂 aria 前缀 | 修改 web-ui 内置 aria 文案、label 覆盖 prop 或 builtin-labels 样表       |

## 已知边界

发布/私有边界、registry/mirror 与工作区构建事实见 [`ARCHITECTURE.md`](./ARCHITECTURE.md#2-依赖构建与发布边界)节，以及 [`AGENTS.md`](./AGENTS.md#不可绕过的仓库边界)节。

组件、token、overlay 与事件语义按需读取 [`docs/agents/web-ui.md`](docs/agents/web-ui.md) 及其指向的 ADR。公共 package 或跨 workspace 契约审查按需读取 [`monorepo-change-impact`](.agents/skills/monorepo-change-impact/SKILL.md)，并以 manifest、消费者和测试为事实。构建、部署与 release workflow 按需读取 [`docs/agents/build.md`](docs/agents/build.md) 和 ADR-0003。
