---
name: herdr-agents
description: 用 Herdr 安排多个独立 Agent 会话，建立 task worktree，分派 handoff 并收集结果。复杂任务可以配一个只读 Supervisor；本 skill 只在用户显式调用 `/herdr-agents` 时启用。
disable-model-invocation: true
---

# Herdr Agents

## 适用范围与权威边界

本 skill 只在用户显式调用 `/herdr-agents`，并要求把实施工作分派给多个独立 CLI 会话时加载。单会话实施、只读调查、单独运行命令或只派一个 subagent，都不走这套流程。

这里说明多 Agent 编排的分工和时序：

- Role Contract、Role 初始化和会话复用规则。
- Role 到执行体的默认绑定、启动参数和目录边界。
- Manager 的拆分、派发、依赖、handoff、review 协调和交付判断。
- 实施期 Supervisor 的启用评分、只读范围、检查点、报告和纠错方式。
- Herdr pane、agent prompt、agent read、agent wait 的编排时序。

Supervisor 何时启用、它能做什么，以及它与独立 review 如何隔离，见 [ADR-0016](../../../docs/adr/0016-implementation-supervision.md)。

Task 级别、状态机、快照、review、approval 和验证证据见 [`docs/agents/workflow.md`](../../../docs/agents/workflow.md) 与 [`scripts/task.mjs`](../../../scripts/task.mjs)。Task state 不保存 Role、Supervisor 或 coordination 记录。Task Packet 保存任务主合同，也可以在可选的 Coordination 区域写摘要，格式见 [`docs/agents/task-packet.md`](../../../docs/agents/task-packet.md)。

涉及 Herdr 本身的前置检查、pane、tab、workspace、worktree、agent 命令、参数、JSON 字段和生命周期，以已安装的 Herdr CLI 与上游 [`herdr` skill](../herdr/SKILL.md) 为准。每次操作前先读取上游 skill，并按当前 CLI 输出解析 ID 和状态。

## Role 与执行体

下表列出各 Role 的默认执行体。其他文档只链接到这里，不复制这张表。模型和思考强度由用户会话设置或 Manager 按任务指定，不设 Role 默认。

| Role | 默认执行体 | 责任 |
| --- | --- | --- |
| Manager | Claude Code | 接收需求、拆任务、管依赖、派发会话 |
| Designer | Claude Code | 先明确产品、交互、视觉和状态方案，仅在产品/设计需求启用 |
| Lib Coder | Codex CLI | 实现 `packages/*` 的共享能力和公共契约 |
| Biz Coder | Codex CLI | 实现 `apps/*` 的业务路径和端到端功能 |
| Supervisor | Claude Code | 观察 Coder 的实施进展，报告问题和证据，不直接改代码 |
| Reviewer | Claude Code | 独立审查冻结 diff 和验证证据，不读取 Supervisor 报告 |

Supervisor 和 Reviewer 默认都使用 Claude Code。Reviewer 按 workflow 的级别路由：T0 启动独立的 Claude Code reviewer 会话；T1 启动 fresh Claude Code 会话或 fresh Claude Code subagent；T2 如需额外 review，也启动 fresh Claude Code subagent。

Supervisor 启动时使用与其他 Role 相同的权限参数，但仍须遵守只读职责。其他执行体也可以承担任一 Role；改用替代执行体时，Manager 在 Task Packet 记录理由。每个实施 task 最多一个 Supervisor。

Herdr 启动参数按执行体区分，不按 Role 另行降权：

| 执行体 | 启动参数 |
| --- | --- |
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex CLI | `codex --yolo` |

启动前按上游 `herdr` skill 发现当前 kind 和参数。Herdr 不会因为这些参数自动把 Supervisor 限制为只读；Supervisor 必须遵守本 skill、Role Contract 和 Manager 的 handoff。Manager 不给 Supervisor 安排写操作，并在检查点核对 diff 与 task status，确认它没有写入文件。

Role 契约位于 [`roles/`](./roles/)。Manager 初始化每个会话时发送：

```text
本会话担任 <role>。读取并遵循 `.agents/skills/herdr-agents/roles/<role>.md`，将其作为本会话的角色与协作规范。
```

会话确认已加载 Role 后再派任务。Role 在会话内持续生效，不绑定某一个 task。复用会话前先核对 Role、cwd 和 worktree。

## Handoff

Role 之间传递实施工作时，handoff 必须包含 `Goal（目标）`、`Scope（范围）`、`Acceptance（验收标准）`、`Test commands（测试命令）` 和 `Open decisions（未解决决策）`。修复类 handoff 还要填写 `Proven mechanism（已证实机制）`。

```text
Handoff: <task-id>
From: <role> → To: <role>
Goal（目标）: <一个可判定的目标>
Scope（范围）: <允许改动的目录或包，以及明确非目标>
Acceptance（验收标准）: <可观察的通过条件>
Test commands（测试命令）: <确切命令、期望结果、已执行或未执行>
Proven mechanism（已证实机制）: <修复类必填，写出已证实根因和证据；其他任务可省略>
Open decisions（未解决决策）: <待 Manager 或对方决定的问题，以及当前默认处理>
```

修复类 handoff 没有已证实根因和证据时，先补充调查，不要按猜测返工。Task Packet 保存任务主合同；Manager 只在可选的 Coordination 区域写实施监督摘要，聊天记录不能替代 task state。

## 启用 Supervisor 的判断

Manager 在拆分实施 task 后、首次派发 Coder 前评分。每个维度按 0 到 2 分记录。5/8 是参考线，不是自动 gate。Manager 可以根据任务实际情况调整，但要在 Task Packet 写明分数、建议和理由。

| 维度 | 0 分 | 1 分 | 2 分 |
| --- | --- | --- | --- |
| 影响半径 | 单点局部 | 多个文件或一个 workspace | 跨 workspace、公共消费面或并行 task |
| 契约与不可逆性 | 纯内部、可轻易回退 | 需兼容已有行为 | 公共契约、迁移、权限、数据或发布不可逆边界 |
| 方案不确定性 | 方案和实现路径稳定 | 有局部未知 | 目标、边界或方案需要持续核对 |
| 验证成本 | 单条快速命令 | 需要多个测试或构建 | 浏览器、跨层、集成或长回归验证 |

产品/UI task 不启用 Supervisor。分数达到 5/8 但仍跳过时，记录 `Supervisor skipped` 和原因。分数低于 5/8 仍要启用时，记录覆盖理由。Supervisor 只在实施期间工作，不替代 task 的 review 或 approval。

## Supervisor 协议

### 启动与边界

启用时，Manager 在实施 task 的同一 worktree 启动一个 Supervisor pane，并为整个 task 生命周期使用同一个 coordination id：

```text
herdr-agents/<task-id>
```

这个 id 在 task 生命周期内保持不变。pane 名称和 pane id 只用于通信，不能替代 coordination id。Manager 还要把实际的 Coder 和 Supervisor agent 名称或 pane id 写进 handoff，供双方使用 `agent prompt` 寻址。coordination id 放在消息正文中。Task Packet 的可选 Coordination 区域记录参与者、启用理由、检查点摘要和未决事项。

Supervisor 默认只读。它可以做这些事：

- 读取源码、测试、文档、Task Packet 和 task status。
- 读取 tracked diff、untracked 文件清单和 diff 内容。
- 通过 Herdr 读取 Coder pane 的 `agent read`、状态和 `agent wait` 结果。
- 通过 Herdr `agent prompt` 发送观察报告和纠错消息。该工具只传递消息，不写文件或改代码。
- 运行只读 repo 查询，例如 `pnpm find:usages`、`pnpm inspect:contract`、`pnpm diff:contract`。

Supervisor 不写文件或编辑源码，不修改 task state 或 Git 历史，也不执行提交、合并、清理或依赖安装。测试和构建由 Manager 在自己的 pane 中运行。Supervisor 只读取结果，不直接触发可能写文件的命令。

### 检查点与报告

Manager 在派发时把下列三个检查点写进 Coder handoff。每个检查点都要发报告，即使没有问题也发 `clear`。

1. **首次写入前**：确认 Coder 的实施方案、目录边界、task 合同和验证计划没有偏离要求。
2. **第一个可验证的实现切片完成后**：确认这条实现路径可以运行，或已有测试覆盖。错误处理、契约和验证证据也要足以支撑后续实施。
3. **Coder 最终交付前**：确认 diff、验证结果、范围、残余风险和 handoff 都齐全，并处理掉阻断问题。

报告格式：

```text
Observation Report
Coordination: herdr-agents/<task-id>
Checkpoint: before-first-write | first-verifiable-slice | before-final-delivery
Status: clear | open | resolved | disputed | escalated
Findings: <按严重程度列出问题；无问题写 none>
Evidence: <文件、行号、diff、命令输出或 task status>
Required action: <Coder 或 Manager 的下一动作；clear 写 none>
Readiness: Ready | Not ready
```

状态含义：

- `clear`：该检查点没有需要处理的问题。
- `open`：发现可修复的偏离或缺陷，等待 Coder 修正。
- `resolved`：Coder 已修复，并提供了对应 diff 或验证证据。
- `disputed`：Coder 认为报告不成立，交由 Manager 裁决。
- `escalated`：需要 Manager 介入决策、拆分 task 或改变方案。

Manager 将双方的 live agent 名称或 pane id 交给 Coder 和 Supervisor。Coder 到达检查点时，分别用 Herdr `agent prompt` 通知 Supervisor 和 Manager，并在消息中带上同一个 coordination id。Supervisor 把纠错消息发给 Coder，把检查点报告和裁决结果发给 Manager。

Supervisor 负责指出问题，Coder 负责修复并提供证据。Supervisor 重新核对后，把 `open` 改为 `resolved`；有争议时转 `disputed`，由 Manager 裁决。Supervisor 结束前必须填写 `Readiness`。启用 Supervisor 时，最终报告应为 `Ready`。

Reviewer 不接收 Supervisor 报告，只读取冻结 diff、Task Packet 的任务主合同和验证证据。Reviewer 退回后，Manager 复用原来的 Supervisor 会话和 coordination id，先让 Supervisor 按更新后的 handoff 重新核对整个 diff，再重跑修复后仍需执行的检查点。旧报告不代表新 diff 的结论。

## 编排流程

1. 读取根 [`AGENTS.md`](../../../AGENTS.md) 和 [`docs/agents/workflow.md`](../../../docs/agents/workflow.md)，按 task gate 建立实施 task。新 worktree 先执行 `pnpm install && pnpm run build`，路径和复用规则见 [`docs/agents/worktrees.md`](../../../docs/agents/worktrees.md)。
2. 用 `pnpm find:usages -- <paths...>` 确认影响面，再选择 task 级别、Coder 数量和目录边界。task state 只记录 task-level 事实，不记录 Role 列表。
3. 完成启用 Supervisor 评分。产品/UI task 直接记录跳过；其他 task 按分数决定是否启动一个 Supervisor。
4. 为每个实施 Role 建立独立 pane，cwd 指向所属 task worktree。按绑定表启动执行体，初始化 Role，并确认回执。Supervisor 与 Coder 共享实施 worktree，但 Supervisor 只读。
5. 先发完所有结构化 handoff，再非阻塞监听各会话。不要用一个长等待阻塞其他派发；实施会话需要较长的超时。
6. 在三个检查点接收 Coder 的 prompt 和 Supervisor 报告。Manager 处理 `disputed`、`escalated` 以及测试产物和依赖问题；Coder 处理 `open` 的代码修正。任何 Role 发现越界写入或 task gate 风险，都暂停实施并交回 Manager。
7. 实施完成后由 Reviewer 按 workflow 的 review 拓扑审查冻结 diff。Supervisor 报告不进入 Reviewer 输入。Reviewer 通过后，按 workflow 完成 approval、验证和 `task done`。
8. `task done` 后释放 Supervisor pane。若 task 被 drop，先保留已有报告和 Task Packet 摘要，再按 Herdr 规则关闭由本次编排创建的 pane。

## 完成定义

- Task Packet 写明目标、范围、验收、验证和 review 要求；每个实施会话都有正确 Role、cwd 和唯一 owner。
- 启用了 Supervisor 时，coordination id 固定，三个检查点各有报告，Coder 配合检查点并提供证据，最终有明确 `Ready`。
- Supervisor 没有直接修改代码、task state 或 Git；Manager 清理测试或构建生成物。
- Reviewer 只收到冻结 diff、任务主合同和验证证据；review 退回后，Supervisor 重新核对更新后的 handoff 和完整 diff，再重跑仍需执行的检查点。
- task 按 workflow 完成 `freeze`、`review`、`approve`、验证和 `done`，未绕过任何 task gate。
