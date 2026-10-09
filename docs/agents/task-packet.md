# Task Packet

Task Packet 是单个 task 的主合同，记录目标、范围、验收、验证和交付边界。新会话可以据此恢复工作。

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

`Owner`、`Worktree`、`Base` 三个字段的值由编排层提供：worktree 路径与 base SHA 来自它交付 task 时的工作树，owner 标识对应承接这条 task 的线程。packet 只如实记录这三项，不自行推导、不改写——编排层改了归属就重新 assign 并同步 packet。

## 恢复规则

聊天消息、模型输出和过程报告都不能替代冻结 diff 或验证记录。Task Packet 与它的 `evidence/` 同处 `$TMPDIR/greypan/tasks/<task-id>.md`——一条 task 的完整记录放在一个地方，而不是拆成「主合同在别处、证据在这里」。它和 task state 同属**本地工作记忆，可丢失**（[ADR-0018](../adr/0018-task-state-in-tmpdir.md)）：换机换用户从 commit 历史重建，不承诺恢复。

在本机同用户的会话续作里，读取顺序是：先读 Task Packet，再读 `$TMPDIR/greypan/tasks/<task-id>.json`，最后按 [`workflow.md`](workflow.md) 判断当前 phase 和下一步；重启用 `pnpm agent:task status --task <task-id>` 的 `live` 核对，不靠记忆推断。state 已被清空时按 `workflow.md`「失败和恢复」重建，不靠重建 packet 蒙混过关。

第三方 `handoff` skill 只用于压缩会话上下文，不改变本文件的任务主合同。它由 CC Switch 在 user 级全局提供，不在本仓。
