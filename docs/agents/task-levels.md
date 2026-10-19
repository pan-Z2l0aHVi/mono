# 任务分级与准入

本文件规定变更级别、准入和验证选择。登记生命周期与 Task Packet 见 [`task-ledger.md`](task-ledger.md)，命令与参数以 CLI 为准；PR 阶段的独立审查纪律见 [`review.md`](review.md)；提交边界见 [`commit.md`](commit.md)。拿到 worktree 后的环境准备见 [`worktree.md`](worktree.md)。分级决策背景见 [ADR-0024](../adr/0024-task-tiering-v3.md) 和 [ADR-0025](../adr/0025-pr-review-flow.md)。

<!-- invariant:risk-tiering -->

## 级别代号

T0、T1、T2 表达变更影响半径与所需验证深度，不代表任务价值。逐档判断，先命中即定级，T2 是非可执行改动的兜底：

- **可执行性**：源码、脚本、配置、构建与 CI 定义、依赖清单会影响运行时或工具行为；文档、注释、纯格式化改动和二进制产物属于非可执行内容。此项由实施者根据实际行为判断。
- **路径边界**：workspace 以 [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) 的 `apps/**` 与 `packages/**` 为准；其余路径属于仓库根，包括 `scripts/`、`.github/`、`.agents/` 和根 `docs/`。

| 级别 | 判据                                                                          | worktree                  | `new` / `start` | PR 阶段审查纪律            | 建议验证                           | 本地提交 gate   |
| ---- | ----------------------------------------------------------------------------- | ------------------------- | --------------- | -------------------------- | ---------------------------------- | --------------- |
| T0   | 可执行改动触及根路径、跨 workspace 公共 API/exports/事件/类型契约，或依赖清单 | 编排层分配的专属 worktree | 必须干净        | 合并前由独立 reviewer 审查 | 相关 test 与 acceptance 各至少一项 | 本地政策 checks |
| T1   | 可执行改动只位于一个 workspace，且未命中 T0                                   | 编排层分配的专属 worktree | 必须干净        | 合并前由独立 reviewer 审查 | 相关 test 至少一项                 | 本地政策 checks |
| T2   | 仅非可执行改动                                                                | 可使用当前 worktree       | 不要求干净      | 按改动影响安排审查         | 按改动风险选择                     | 本地政策 checks |

本表决定改动级别与建议验证深度；本地登记簿只记录工作归属和进度，不记录 review 或 approval。T0/T1 的独立 review 应在 PR 阶段完成，并由报告关联当前 base/head SHA；GitHub ruleset 的 required check 与 required review 属于远端状态，以仓库当前规则为准，无论平台是否强制 review，CI 成功都不能替代审查。本地政策检查与 PR CI 的 changeset gate 分别见 [`commit.md`](commit.md) 与 [`release.md`](release.md)。

纯文档、注释、纯格式化或二进制改动无论路径如何都归 T2。需要独立 worktree、完整影响面核查或更深验证时，依据实际影响升到 T1 或 T0。monorepo-change-impact skill 的 `verify` 查询用于核实跨 workspace 公共契约，命令与语义见该 skill 的 SKILL.md；验证命令选择见 [`verification.md`](verification.md)。

## 准入：先建立任务

每项可变任务在实施前完成以下步骤：

1. 确认交付的 worktree 状态符合级别要求。
2. 读取根 [`AGENTS.md`](../../AGENTS.md)、本文件、[`workflow.md`](workflow.md) 和命中的 rule/guide；进入 workspace 后读取最近的包级 `AGENTS.md`。
3. 确定唯一 task id、级别和 owner，并按 [`worktree.md`](worktree.md) 准备新 worktree。
4. 在目标 worktree 按 `task-ledger.md` 建立并启动台账。
5. 将目标、范围、验收条件和验证命令写入同目录的 Task Packet；边界与恢复方式见 `task-ledger.md`。

新 worktree 按 `worktree.md` 的三步准备执行。T0/T1 的 `new` 和首次 `start` 要求 worktree 干净，T2 不要求干净。登记行为与状态字段见 `task-ledger.md`。

## 变更影响与验证命令

选择验证命令时，以改动的消费者、包边界和运行环境为依据。公共契约变化应查实际 exports、消费者与类型测试；浏览器行为变化按 [`runtime-verification.md`](runtime-verification.md) 执行真实浏览器验证。T0/T1 的级别要求不替代对具体改动的验证判断。
