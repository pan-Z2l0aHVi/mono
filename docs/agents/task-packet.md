# Task Packet

Task packet 是 Manager 和 Agent 之间的最小交接合同。它可以写在 issue、任务描述或本地记录中，但必须能回答以下问题：

- `taskId`、模式、owner、worktree 和 base SHA 是什么？
- 目标、非目标、允许路径和 affected workspaces 是什么？
- 依赖、公共契约、changeset、浏览器验证和 reviewer 要求是什么？
- 交付物、验收标准、失败恢复方式和交接时机是什么？

推荐格式：

```text
Task: <task-id>
Mode: direct | orchestrated | release | hotfix
Owner: <role/agent>
Worktree: <absolute path>
Base: <sha>
Scope: <goal and non-goals>
Allowed paths: <paths>
Affected workspaces: <packages/apps>
Acceptance: <observable criteria>
Verification: <commands/evidence>
Review: required | skipped with reason
Handoff: <what is returned and when>
```

聊天消息、Herdr pane label 和模型输出都不是 task state 的替代品；重启后应能只靠 task packet、Git 和 workflow state 恢复。
