# Task Packet

Task Packet 是单个 task 的主合同，记录目标、范围、验收、验证和交付边界。新会话可以据此恢复工作。多 Agent 的 Role 派发、handoff 模板、Supervisor 协议和 Herdr 时序见 [`herdr-agents`](../../.agents/skills/herdr-agents/SKILL.md)。

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

级别、影响面和状态机以 [`workflow.md`](workflow.md) 为准。task state 中的 `diffHash`、review、approval、verification 和 `events[]` 由 `pnpm task` 维护，packet 不重复这些机器记录。

## 可选 Coordination 区域

只有使用多 Agent 编排时才填写。Coordination 只记录恢复工作所需的信息，不进入 task state，也不替代冻结 diff 或 review 证据。

```text
Coordination id: herdr-agents/<task-id> | N/A
Participants: <role/executor pairs>
Supervisor: enabled | skipped (<score and reason>)
Checkpoints:
  - before-first-write: <clear | open | resolved | disputed | escalated; summary>
  - first-verifiable-slice: <clear | open | resolved | disputed | escalated; summary>
  - before-final-delivery: <clear | open | resolved | disputed | escalated; summary>
Readiness: <Ready | Not ready | N/A>
Open decisions: <Manager decisions still needed>
```

固定的 coordination id、报告状态、纠错规则和 Reviewer 隔离见 [`herdr-agents`](../../.agents/skills/herdr-agents/SKILL.md)。Manager 只记录恢复工作所需的信息，例如启用评分、覆盖理由、检查点结论、争议处理和 pane 生命周期，不复制完整聊天记录。

## 恢复规则

聊天消息、Herdr pane label、模型输出和 Supervisor 报告都不能替代 task state、冻结 diff 或验证记录。重启后，先读 Task Packet，再读 `<git-common-dir>/tasks/<task-id>.json`，最后按 [`workflow.md`](workflow.md) 判断当前 phase 和下一步。

第三方 [`handoff` skill](../../.agents/skills/handoff/SKILL.md) 只用于压缩会话上下文，不改变本文件的任务主合同，也不改变多 Agent handoff 协议。
