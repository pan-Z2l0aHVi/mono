# Task Packet 与结构化 Handoff

Task packet 是 Manager 与 Agent 之间的最小交接合同；结构化 handoff 是角色之间传递工作的唯一方式。两者可以写在 issue、任务描述或本地记录中，但必须能回答以下问题，并在进入实施或验收前完整存在。

## Task Packet

- `taskId`、模式、owner、worktree 和 base SHA 是什么？
- 目标、非目标、允许路径和 affected workspaces 是什么？
- 依赖、公共契约、changeset、浏览器验证和 reviewer 要求是什么？
- 编排路径、是否启用 Designer，以及理由是什么？
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
Route: product-design | technical
Designer: enabled | skipped (<reason>)
Acceptance: <observable criteria>
Verification: <commands/evidence>
Review: required | skipped with reason; secondary review: yes | no
Handoff: <what is returned and when>
```

## 结构化 Handoff

角色之间（Manager → Designer / Lib Coder / Biz Coder → Reviewer → Manager）统一使用本模板，五个字段缺一不可：

```text
Handoff: <task-id>
From: <role> → To: <role>
Goal（目标）: <本次交接要达成的单一目标>
Scope（范围）: <允许改动的目录/包 + 明确非目标>
Acceptance（验收标准）: <可观察、可判定的通过条件>
Test commands（测试命令）: <确切命令 + 期望结果 + 已执行/未执行>
Open decisions（未解决决策）: <需要对方或 Manager 决策的问题 + 当前默认处理>
```

字段约束：

- `Goal（目标）` 只描述要达成的目标，不夹带实现方案；一个 handoff 对应一个目标。
- `Scope（范围）` 必须写明目录边界与角色归属：Lib Coder 的交接只允许 `packages/*`，Biz Coder 的交接只允许 `apps/*`；跨边界需求由 Manager 拆成两个 handoff，而不是让一个角色越界。
- `Acceptance（验收标准）` 必须是可观察、可判定的结果，不能是“已完成”这类描述。
- `Test commands（测试命令）` 给出确切命令与期望输出；未执行的验证必须显式标注，不能用推断代替。
- `Open decisions（未解决决策）` 列出未决问题与当前默认处理；没有未决问题也必须写“无”，不得省略该字段。

## 记录与恢复

聊天消息、Herdr pane label 和模型输出都不是 task state 的替代品；重启后应能只靠 task packet、handoff 记录、Git 和 workflow state 恢复。

[`.agents/skills/handoff/`](../../.agents/skills/handoff/) 中的 handoff skill 只用于压缩会话上下文，不替代本文件定义的角色间交接合同。
