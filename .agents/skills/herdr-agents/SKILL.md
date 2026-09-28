---
name: herdr-agents
description: 用 Herdr 安排多个独立 Agent 会话，建立 task worktree，分派 handoff 并收集结果。复杂任务可以配一个只读 Supervisor；本 skill 只在用户显式调用 `/herdr-agents` 时启用。
disable-model-invocation: true
---

# Herdr Agents

## 适用范围与权威边界

本 skill 只在用户显式调用 `/herdr-agents`、并要求把实施工作分给多个独立 CLI 会话时加载。单会话实施、只读调查、单独跑命令、只派一个 subagent，都不走这套流程。编排本身也不以 task 存在为前提：需求还没拆成实施 task 时同样可以用，task gate 在需要改仓库时才进入。

它承载 Role 与执行体的绑定、Role 初始化与会话复用、Manager 的拆分与派发时序、handoff 格式、review 协调和交付判断。启用 Supervisor 时的评分与协议在 [`supervision.md`](./supervision.md)，拆分实施 task 后、首次派发 Coder 前就要读它。

编排产物落在 `$TMPDIR/herdr-agents/`：`reports/` 放编排记录与观察报告，`browser/` 放浏览器验证留档，`commands/` 放命令输出留档。目录结构固定且永远存在，工作单元只出现在文件名里。落点与理由见 [`roles/manager.md`](./roles/manager.md) 的「上下文纪律」。

其余权威不在这里：

- Supervisor 这套机制的决策背景和被否决方案见 [ADR-0016](../../../docs/adr/0016-implementation-supervision.md)；编排与 task 的解耦形态见 [ADR-0017](../../../docs/adr/0017-orchestration-decoupled-from-task.md)。
- Task 级别、状态机、快照、review、approval 和验证证据见 [`docs/agents/workflow.md`](../../../docs/agents/workflow.md) 与 [`scripts/task.mjs`](../../../scripts/task.mjs)。task state 不保存 Role、Supervisor 或 coordination 记录。
- 任务主合同写在 Task Packet；参与者、启用理由、检查点结论和未决事项写在编排记录里，Task Packet 的可选 Coordination 区域只留 id 和落点，格式见 [`docs/agents/task-packet.md`](../../../docs/agents/task-packet.md)。
- Herdr 自身的前置检查、pane、tab、workspace、worktree、agent 命令、参数、JSON 字段和生命周期，以已安装的 CLI 与上游 [`herdr` skill](../herdr/SKILL.md) 为准。每一步操作前先读它，按当前输出解析 ID 和状态。

## Role 与执行体

下表是各 Role 的默认执行体，其他文档只链接到这里，不复制这张表。模型和思考强度由用户会话或 Manager 按任务指定，不设 Role 默认。

| Role | 默认执行体 | 责任 |
| --- | --- | --- |
| Manager | Claude Code | 接收需求、拆任务、管依赖、派发会话 |
| Designer | Claude Code | 先明确产品、交互、视觉和状态方案，仅在产品/设计需求启用 |
| Lib Coder | Codex CLI | 实现 `packages/*` 的共享能力和公共契约 |
| Biz Coder | Codex CLI | 实现 `apps/*` 的业务路径和端到端功能 |
| Supervisor | Claude Code | 观察 Coder 的实施进展，报告问题和证据，不直接改代码 |
| Reviewer | Claude Code | 独立审查冻结 diff 和验证证据，不读取 Supervisor 报告 |

Supervisor 和 Reviewer 都默认用 Claude Code。Reviewer 按 workflow 的级别路由：T0 必须 review，用 pure subagent 或独立会话都算数；T1 的 review 由实施 agent 视情况决定要不要派，要派就派 fresh 会话或 fresh subagent；T2 不用 review，需要额外 review 时也用 fresh subagent。

Supervisor 与其他 Role 用相同的权限参数启动。任何执行体都能承担任一 Role，改用替代执行体时 Manager 在 Task Packet 记录理由。每个实施 task 最多一个 Supervisor。

Herdr 启动参数按执行体区分，不按 Role 另行降权：

| 执行体 | 启动参数 |
| --- | --- |
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex CLI | `codex --yolo` |

启动前按上游 `herdr` skill 发现当前 kind 和参数。这些参数不会把 Supervisor 限制成只读，它的边界来自本 skill、Role Contract 和 Manager 的 handoff：Manager 不给它安排写操作，并在检查点核对 diff 与 task status，确认它没有写入文件。

Role 契约位于 [`roles/`](./roles/)。Manager 初始化每个会话时发送：

```text
本会话担任 <role>。读取并遵循 `.agents/skills/herdr-agents/roles/<role>.md`，将其作为本会话的角色与协作规范。
```

会话确认已加载 Role 后再派任务。Role 在会话内持续生效，不绑定某一个 task，也不对编排的起点做假设。复用会话前核对 Role 与 cwd；只有当编排确实建了 worktree 时才核对 worktree，没有 worktree 的编排不因为这一项而卡住。

## Handoff

Role 之间传递实施工作时，handoff 必须包含 `Goal（目标）`、`Scope（范围）`、`Acceptance（验收标准）`、`Test commands（测试命令）` 和 `Open decisions（未解决决策）`。修复类还要填 `Proven mechanism（已证实机制）`。首行是 coordination id，由 Manager 在编排开始时生成，不从 task id 派生。

```text
Coordination: herdr-agents/<主题slug>
From: <role> → To: <role>
Goal（目标）: <一个可判定的目标>
Scope（范围）: <允许改动的目录或包，以及明确非目标>
Acceptance（验收标准）: <可观察的通过条件>
Test commands（测试命令）: <确切命令、期望结果、已执行或未执行>
Proven mechanism（已证实机制）: <修复类必填，写出已证实根因和证据；其他任务可省略>
Open decisions（未解决决策）: <待 Manager 或对方决定的问题，以及当前默认处理>
```

修复类 handoff 缺已证实根因和证据时，先补调查，不要按猜测返工。Task Packet 保存任务主合同；参与者、启用理由、检查点结论和未决事项写进编排记录，聊天记录替代不了 task state。

## 巡检

派发多于一个实施会话时，用 `/loop 6m` 跑 [`node .agents/skills/herdr-agents/patrol.mjs`](./patrol.mjs) 起巡检；只派一个会话时不装。本轮编排全部结束后停掉 loop。

巡检的数据源是**编排单元**，不是 task。Manager 在建完 pane、拿到各会话回执之后、写本轮编排记录时，一并写下巡检要读的字段：文件名是主题 slug，`coordination` 字段是消息正文里用的 id。`roots` 是本轮要盯的工作目录（实施 worktree；没有 worktree 的编排写它实际在跑的目录），`participants` 写 live agent 名。`taskId` 可选，写了就在巡检输出里附上该 task 的 phase 作参考，不写就没有——两种都不影响判定。

```json
{
  "coordination": "herdr-agents/<主题slug>",
  "status": "active",
  "roots": ["<absolute path>"],
  "participants": ["<live agent name>"],
  "taskId": "<task-id>",
  "supervisorReason": "<启用或跳过的理由与分数>",
  "checkpoints": ["<检查点结论>"],
  "openDecisions": ["<未决事项>"]
}
```

`status` 只有 `active` 与 `finished`，编排收尾时 Manager 改成 `finished`（保留文件，巡检据此判定终态；删文件也可以，但显式标记才不会在崩溃后留下一个永远不算完的单元）。后三个字段是给人读的编排元数据，巡检不解析。

`roots` 必填，且每轮都要指向真实存在的目录。churn 是对 `roots` 逐个取 `git diff HEAD --numstat` 的增删行数加上未跟踪文件数，多个 root 用 `+` 连接；指纹里带未跟踪数是因为 `git diff` 不算 untracked，漏掉会把「正在新建文件」误判成停滞。三个哨兵值表示「这一轮拿不到可比的工作量」，都不武装 `STALL`：

| churn | 何时出现 | 含义 |
| --- | --- | --- |
| `none` | `roots` 为空或全是非字符串 | manifest 写坏了。仍然出现在 `--- current ---` 里便于发现，但恒定不等于「没动」 |
| `gone` | 所有 root 都不存在 | worktree 被删或路径写错 |
| `error` | 所有 root 都读不出（如不是 Git 仓库） | 路径指错了地方 |

反过来，只要 churn 是一串真实数字，连续 4 轮不变且有 participant 在 `working` 就武装 `STALL`。

`patrol.mjs` 自己读编排记录与 worktree churn，首行是状态，按下面分派：

| 首行 | 分派 |
| --- | --- |
| `NO_ACTIVE` | 没有 agent 在 `working` 且本轮无变化 → 不回话、不读 pane、不发通知 |
| `NO_CHANGE` | 有 agent 在跑但无信号 → 回一行「巡检：无变化」 |
| `ALL_DONE` | 没有活跃编排单元且无 agent 在跑 → 停掉本 loop 并说明 |
| `AGENTS_CHANGED` / `AGENTS_SAME` | 块内随后给出 `CHURN_CHANGED=`，有停滞时再给 `STALL?` 行。按列出的行处理：读完成 turn 的输出并回报要点，重点看它是不是停在不该由 Manager 给的放行上；`blocked` 立刻回报；名字消失的用 `pane read` 兜底；`STALL` 用 `agent read` 判断长 turn 还是卡死 |

`STALL` 靠 `participants` 里的 live agent 名与 herdr 的 agent 名对齐才武装；写 pane label 或登录名都不匹配。要观察某一路进展就把那一路的 agent 名放进 `participants`。

巡检只报信号，不重复已回报的内容，不重跑已完成的裁决，也不修改任何文件。

## 编排流程

1. 编排开始时生成 coordination id（`herdr-agents/<主题slug>`），后文所有 handoff、报告和编排记录都用它。需求要改仓库时再读根 [`AGENTS.md`](../../../AGENTS.md) 和 [`docs/agents/workflow.md`](../../../docs/agents/workflow.md)，按 task gate 建立实施 task；纯只读的编排没有 task 也能走完。新 worktree 先执行 `pnpm install && pnpm run build`，路径和复用规则见 [`docs/agents/worktrees.md`](../../../docs/agents/worktrees.md)。
2. 用只读 repo 查询确认影响面（命令名以 [`docs/agents/commands.md`](../../../docs/agents/commands.md) 索引为准），再选 task 级别、Coder 数量和目录边界。task state 只记 task-level 事实，不记 Role 列表。
3. 按 [`supervision.md`](./supervision.md) 打 Supervisor 启用分。产品/UI task 直接记 `Supervisor skipped` 和原因，其他 task 按分数决定要不要启动一个。
4. 每个独立 agent 会话一个 tab，不在同一个 tab 下继续 split。`herdr pane split --pane <anchor> --direction down --cwd <worktree> --no-focus` 拿到 pane id，再 `herdr pane move <pane-id> --new-tab --workspace <workspace-id> --label <label> --no-focus` 把它移进独立 tab，之后用 `.result.move_result.pane.pane_id` 寻址。`pane split` 没有 `--new-tab`，直接 split 只会让同一个 tab 里的 pane 越堆越窄：窄到个位数列宽后 agent 输出按渲染宽度折行，`agent read` 也读不回，被 zoom 的 tab 还会以 `zoomed_tab` 拒绝 `pane move`（收拾布局要先解 zoom）。label 用 `coder-<task>` / `reviewer-<task>` 这类有意义的名字，不要默认编号。之后按绑定表启动执行体，初始化 Role，确认回执，然后按「巡检」一节的字段把本轮编排记录写进 `$TMPDIR/herdr-agents/reports/`。Supervisor 是唯一例外：它与 Coder 共享实施 worktree 且只读，可以不开独立 tab。agent 通道、代理切换、MCP 配置或会话重启之后，先用 `herdr agent list` 核对各实施会话存活再恢复派发；中断的会话按工作区 `git status`、编排记录和 Task Packet（有的话）接手现场。
5. 先发完所有结构化 handoff，再非阻塞监听各会话。不要用一个长等待阻塞其他派发，实施会话需要较长的超时；派发多于一个实施会话时按「巡检」一节起 loop。
6. 在三个检查点接收 Coder 的 prompt 和 Supervisor 报告，报告格式与状态含义见 [`supervision.md`](./supervision.md)。Manager 处理 `disputed`、`escalated` 以及测试产物和依赖问题，Coder 处理 `open` 的代码修正。任何 Role 发现越界写入或 task gate 风险，都暂停实施并交回 Manager。
7. 实施完成后按 workflow 的级别决定是否派 Reviewer：T0 必派，T1 由实施 agent 决定。派了就由 Reviewer 按 review 拓扑审查冻结 diff，Supervisor 报告不进入 Reviewer 输入；Reviewer 通过后按 workflow 完成 approval（与 review 成对）、验证和 `task done`。T1 没记 review 时跳过 review 与 approval，`freeze → verify → done` 即可。
8. 收尾时把编排记录的 `status` 改成 `finished`，按「巡检」一节停掉 loop。会话结束（task 到终态或 agent 退出）就回收它那个 tab/pane，别留着占宽度；Supervisor pane 在 `task done` 后释放。task 被 drop 时，先把已有报告和编排元数据留在编排记录里，再按 Herdr 规则关闭本次编排创建的 pane。

## 完成定义

- 编排记录写明 coordination id、参与者、roots 和当前状态；每个实施会话都有正确 Role、cwd 和唯一 owner。
- Task Packet（有 task 时）写明目标、范围、验收、验证和 review 要求。
- 启用 Supervisor 时，coordination id 固定，三个检查点各有报告，Coder 配合检查点并提供证据，最终有明确 `Ready`。
- Supervisor 没有直接改代码、task state 或 Git；Manager 清理测试和构建生成物。
- Reviewer 只收到冻结 diff、任务主合同和验证证据。review 退回后，Supervisor 重新核对更新后的 handoff 和完整 diff，再重跑仍需执行的检查点。
- task 按 workflow 走完该级别要求的 `freeze`、`review`、`approve`、验证和 `done`（T1 未记 review 时没有 `review` / `approve` 两步），没有绕过任何 task gate。
