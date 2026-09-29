# Task Packet

Task Packet 是单个 task 的主合同，记录目标、范围、验收、验证和交付边界。新会话可以据此恢复工作。多 Agent 的 Role 派发、handoff 模板和 Herdr 时序见 [`herdr-agents`](../../.agents/skills/herdr-agents/SKILL.md)，Supervisor 协议见同目录的 [`supervision.md`](../../.agents/skills/herdr-agents/supervision.md)。

## 主合同

每项实施任务在进入实施或验收前，都要写清这些内容：

- `taskId`、级别（T0/T1/T2）、owner、worktree 和 base SHA。
- 目标、非目标、验收标准和所需的最小充分验证。
- 依赖、公共契约、changeset、浏览器验证和 review 要求。
- release 或 hotfix 场景适用的 playbook。
- 交付物、失败恢复方式和交接时机。

推荐格式：

```text
Task: <task-id>
Level: t0 | t1 | t2
Issue: <issue-url | N/A>
Playbook: <release.md | workflow.md#playbook | N/A>
Owner: <owner-id>
Worktree: <absolute path>
Base: <sha>
Goal: <observable outcome>
Non-goals: <explicit exclusions>
Acceptance: <observable pass conditions>
Verification: <commands and evidence required>
Review: <required topology or not required>
Handoff: <what is returned and when>
```

级别、影响面和状态机以 [`workflow.md`](workflow.md) 为准。task state 中的 `diffHash`、review、approval、verification 和 `events[]` 由 `pnpm agent:task` 维护，packet 不重复这些机器记录。

## 可选 Coordination 区域

只有使用多 Agent 编排、且存在 task 时才填写。它只是指针：参与者、启用理由、检查点结论和未决事项的权威落点是编排记录（`$TMPDIR/herdr-agents/reports/<主题slug>.json`，字段见 [herdr-agents](../../.agents/skills/herdr-agents/SKILL.md) 的「巡检」一节），这里不复制它们，也不替代冻结 diff 或 review 证据。

```text
Coordination id: herdr-agents/<主题slug> | N/A
Record: $TMPDIR/herdr-agents/reports/<主题slug>.json | N/A
```

coordination id 由 Manager 在编排开始时自由生成，不从 task id 派生。固定的 coordination id、报告状态、纠错规则和 Reviewer 隔离见同目录 skill 的 [`supervision.md`](../../.agents/skills/herdr-agents/supervision.md)，Role 派发与 pane 时序见 [`herdr-agents`](../../.agents/skills/herdr-agents/SKILL.md)。没有 task 的编排不写本区域，直接读编排记录。

## 恢复规则

聊天消息、Herdr pane label、模型输出和 Supervisor 报告都不能替代冻结 diff 或验证记录。Task Packet 与它的 `evidence/` 同处 `$TMPDIR/greypan/tasks/<task-id>.md`——一条 task 的完整记录放在一个地方，而不是拆成「主合同在别处、证据在这里」。它和 task state 同属**本地工作记忆，可丢失**（[ADR-0018](../adr/0018-task-state-in-tmpdir.md)）：换机换用户从 commit 历史重建，不承诺恢复。

在本机同用户的会话续作里，读取顺序是：先读 Task Packet，再读 `$TMPDIR/greypan/tasks/<task-id>.json`，最后按 [`workflow.md`](workflow.md) 判断当前 phase 和下一步；重启用 `pnpm agent:task status --task <task-id>` 的 `live` 核对，不靠记忆推断。state 已被清空时按 `workflow.md`「失败和恢复」重建，不靠重建 packet 蒙混过关。

第三方 [`handoff` skill](../../.agents/skills/handoff/SKILL.md) 只用于压缩会话上下文，不改变本文件的任务主合同，也不改变多 Agent handoff 协议。
