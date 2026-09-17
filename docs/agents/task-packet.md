# Task Packet 与结构化 Handoff

Task packet 是 Manager 与 Agent 之间的最小交接合同；结构化 handoff 是角色之间传递工作的唯一方式。两者可以写在 issue、任务描述或本地记录中，但必须能回答以下问题，并在进入实施或验收前完整存在。

<!-- invariant:handoff-fields -->

## Task Packet

- `taskId`、模式、owner、worktree 和 base SHA 是什么？
- 目标、非目标、验收标准和所需验证是什么？
- 依赖、公共契约、changeset、浏览器验证和 reviewer 要求是什么？
- 编排路径、是否启用 Designer，以及理由是什么？
- 各角色的模型与思考强度是否采用推荐分档？偏离时推荐说明理由。
- 交付物、失败恢复方式和交接时机是什么？

推荐格式：

```text
Task: <task-id>
Mode: direct | orchestrated | release | hotfix
Issue: <issue-url | N/A>
Owner: <role/agent>
Worktree: <absolute path>
Base: <sha>
Scope: <goal and non-goals>
Allowed paths: <跨多 workspace 的 P0 与 P1 记录；其他级写 N/A>
Affected workspaces: <同上，来自 find:usages>
Route: product-design | technical
Designer: enabled | skipped (<reason>)
Effort: <recommended tiers | adjustments + reason; recommended, not mandatory>
Acceptance: <observable criteria>
Verification: <commands/evidence>
Review: required | skipped with reason
Handoff: <what is returned and when>
```

`Allowed paths` 与 `Affected workspaces` 的取值用 `pnpm find:usages -- <paths...>` 的输出填写。P2 与单 workspace 的 P1 填 `N/A`；跨多 workspace（`apps/*` / `packages/*`）的 P0 与 P1 必须按工具输出如实填写，不要把空数组当作已记录字段。

## 结构化 Handoff

角色之间（Manager → Designer / Lib Coder / Biz Coder → Reviewer → Manager）统一使用本模板：五个必填字段缺一不可，`Proven mechanism（已证实机制）` 在修复类交接时为必填（见字段约束）：

```text
Handoff: <task-id>
From: <role> → To: <role>
Goal（目标）: <本次交接要达成的单一目标>
Scope（范围）: <允许改动的目录/包 + 明确非目标>
Acceptance（验收标准）: <可观察、可判定的通过条件>
Test commands（测试命令）: <确切命令 + 期望结果 + 已执行/未执行>
Proven mechanism（已证实机制）: <修复类必填：指向真实根因的机制描述 + 复现/排除证据>
Open decisions（未解决决策）: <需要对方或 Manager 决策的问题 + 当前默认处理>
```

字段约束：

- `Goal（目标）` 只描述要达成的目标，不夹带实现方案；一个 handoff 对应一个目标。
- `Scope（范围）` 必须写明目录边界与角色归属：Lib Coder 的交接只允许 `packages/*`，Biz Coder 的交接只允许 `apps/*`；跨边界需求由 Manager 拆成两个 handoff，而不是让一个角色越界。
- `Acceptance（验收标准）` 必须是可观察、可判定的结果，不能是“已完成”这类描述。
- `Test commands（测试命令）` 给出确切命令与期望输出；未执行的验证必须显式标注，不能用推断代替。
- `Proven mechanism（已证实机制）` 是条件性必填字段：修复类 handoff 必须写明已证实的根因机制（不是猜测）与支撑证据档位（引擎级复现或真机验收，见 browser-verification.md 的证据词汇三档），防止绕过根因调研直接返工方案。非修复类（新功能、重构、文档）可省略。
- `Open decisions（未解决决策）` 列出未决问题与当前默认处理；没有未决问题也必须写“无”，不得省略该字段。

## 记录与恢复

聊天消息、Herdr pane label 和模型输出都不是 task state 的替代品；重启后应能只靠 task packet、handoff 记录、Git 和 workflow state 恢复。

[`.agents/skills/handoff/`](../../.agents/skills/handoff/) 中的 handoff skill 只用于压缩会话上下文，不替代本文件定义的角色间交接合同。
