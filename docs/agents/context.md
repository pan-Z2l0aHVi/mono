# Agent Context 架构

本指南定义仓库如何为 agent 提供 context。它主要用于 instruction system 维护、仓库拓扑和架构 context 维护；普通 coding task 只按根入口路由到命中的 task-specific 文档，不必完整加载本指南。

## Context 层级

| 层级             | 权威来源                                                         | 何时加载                                                 | 内容边界                                                 |
| ---------------- | ---------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Always available | 根 `AGENTS.md`                                                   | 每次任务                                                 | 项目身份、不可绕过的约束、任务路由                       |
| Project context  | `CONTEXT.md`                                                     | 架构探索、跨包工作、仓库拓扑、术语或长期设计约束相关任务 | 项目身份、domain vocabulary、包边界、依赖方向与 ADR 索引 |
| Task-specific    | `docs/agents/*.md`、`.agents/rules/*.md`、最近的包级 `AGENTS.md` | 任务命中对应领域时                                       | 可执行流程、质量门槛和局部约束                           |
| On-demand        | 相关 ADR、README、manifest、配置、源码和测试                     | 已确认受影响区域后                                       | 历史决策、公共契约、实现细节和当前事实                   |

除根 `AGENTS.md` 外，不应为了“可能有用”而批量加载文档；`docs/agents/context.md` 本身也不是普通任务的 always-loaded 文档。先用任务、受影响目录和当前 diff 缩小范围；遇到不确定的设计取舍，再读取相关 ADR 或源码。

## Agent workflow

| 阶段                      | 最小必要 context                                                                                                        | 不应预先加载                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 探索与 planning           | 根 `AGENTS.md`、任务目标、当前工作区状态、目标目录的 `AGENTS.md`；仅在跨包或设计选择时加读 `CONTEXT.md` 和相关 ADR      | 全部 ADR、全部 package guide、无关测试细节               |
| implementation            | 受影响源码、测试、最近包级指令，以及命中任务的 rule/guide                                                               | 不会影响当前代码路径的历史记录或其他框架指南             |
| review                    | 当前 diff、[review checklist](../../.agents/rules/review-checklist.md)、受影响公共契约与验证证据                        | 实施 agent 的推理过程；review agent 不参与同一变更的实现 |
| verification              | [testing guide](testing.md)、目标包 scripts 与受影响契约；UI 再读 [browser verification guide](browser-verification.md) | 与验证目标无关的 build/release 文档                      |
| release / workflow change | [build guide](build.md)、相关 manifest/config、ADR-0001 或 ADR-0009（仅在流程取舍时）                                   | 组件实现与 UI 术语                                       |

skills 和 MCP 是按能力调用的工具层，不是 always-loaded rules：只有任务确实需要其能力时才读取对应 `SKILL.md` 或调用工具。工具返回的信息不能取代仓库内 manifest、配置、源码和测试对当前状态的证明。

## Context 路由原则

- **规则只保存不可从代码、类型、测试或工具配置可靠推导的工程约束。** 能自动验证的约束优先交给测试、lint、类型或脚本。
- **一个事实只指定一个权威来源。** 例如版本和命令以 manifest 为准，构建图以 `turbo.json`、Vite 配置和 `build.md` 为准，组件公共 API 以包 README 为准。
- **根入口只路由，不复述细节。** 细粒度实现、操作步骤和例外留在 task-specific 或 on-demand 文档。
- **包级 `AGENTS.md` 只增加该目录独有的决策边界。** 不复制根规则；可由相邻源码直接发现的信息也不写入。
- **ADR 记录仍会影响未来选择的决策。** 临时排障、实现顺序和已经被源码/测试完整表达的细节不应新增 ADR。

## 变更与文档同步

当任务属于 instruction system、仓库拓扑或架构/context 维护时，先读取表中列出的权威文档；修改后在同一变更中同步更新。普通 coding task 只读取命中的 task guide，不需要加载本表。若范围不明确，先查本表和相邻包 `AGENTS.md`，仅在仍无法判断时询问用户。

| 变更类别                             | 必须同步的文档                                                    | 触发范围                                                            |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| 构建脚本、Vite/Turbo 流程            | `docs/agents/build.md`；根命令还更新 `AGENTS.md`                  | `package.json` scripts、`vite.config.ts`、`turbo.json`              |
| 包新增、移除或重命名                 | `CONTEXT.md`                                                      | `packages/` 或 `apps/` 目录结构；包清单和依赖边界以此为唯一权威来源 |
| 外部化策略                           | `docs/agents/build.md`                                            | Vite `rollupOptions.external`                                       |
| CI/CD 工作流                         | `docs/agents/build.md`                                            | `.github/workflows/`                                                |
| lint、formatter、stylelint、cspell   | `docs/agents/linting.md`                                          | 对应配置                                                            |
| workspace catalog 或 Changesets 策略 | `docs/agents/dependencies.md`                                     | `pnpm-workspace.yaml`、Changesets 配置                              |
| Node/pnpm/Go 工具链                  | 根 `AGENTS.md`                                                    | `.mise.toml`、根 `package.json` engines                             |
| 测试框架或 Vite 测试配置             | `docs/agents/testing.md`                                          | 测试配置                                                            |
| 跨包编码约定                         | `.agents/rules/code-style.md` 和受影响包 `AGENTS.md`              | 命名、类型安全、架构模式                                            |
| `packages/web-ui` 组件               | `packages/web-ui/AGENTS.md`、`docs/agents/web-ui.md` 及受影响 ADR | Lit 组件、主题、overlay、类型封装；web-ui guide 只负责路由          |
| 图标 manifest、生成器或公共 API      | `docs/adr/0008-icon-system.md`；web-ui guide 仅作路由             | 图标系统                                                            |
| commitlint 或提交流程                | `docs/agents/commit.md`                                           | commit 配置或工作流                                                 |
| 仍影响未来工程取舍的架构决定         | 对应 ADR，并更新 `CONTEXT.md` ADR 索引                            | 可行替代方案之间的长期选择                                          |

## 维护 instruction system

当修改 `AGENTS.md`、rules、skills、agent profile 或 hooks 时，先证明已有的上下文、代码设计或自动化无法解决问题，再加入最小、可执行且可验证的约束。优先删除过期、重复或与权威来源冲突的文字。

新增内容应回答三个问题：**何时加载、哪个事实是权威、违反后有什么工程风险。** 不能回答时，不新增文档或规则。
