# Task 台账

本文件是本地任务登记簿、schema、Task Packet 与恢复方式的唯一操作说明。它记录工作归属和进度，不判断代码质量；review、测试、CI、merge 与发布结论保存在各自的真实证据中。

## 命令

正式入口为 `pnpm agent:task-ledger`，实现位于 `scripts/task-ledger.mjs`。登记簿只写系统临时目录中的 JSON 和事件，不运行检查、fixer、build，不修改源码或 Git index。即使 `.agents/checks/` 不存在或某项检查会失败，登记操作也不受影响。

```sh
pnpm agent:task-ledger new --task <id> --level t0|t1|t2 [--owner <id>] [--worktree <path>] [--issue <https-url|N/A>]
pnpm agent:task-ledger assign --task <id> [--owner <id>] [--worktree <path>]
pnpm agent:task-ledger start --task <id>
pnpm agent:task-ledger status --task <id>
pnpm agent:task-ledger issue --task <id> --ref <https-url|N/A>
pnpm agent:task-ledger pr --task <id> --ref <https://github.com/.../pull/<number>|N/A>
pnpm agent:task-ledger close --task <id>
pnpm agent:task-ledger drop --task <id> --reason <why> --by <agent-id>
```

`new`、`assign`、`start`、`status`、`issue`、`pr`、`close` 与 `drop` 只维护登记字段。`assign` 不接受 `--roles`；`issue` 和 `pr` 使用 `--ref`；`pr` 只允许 active task，并且只记录链接；`drop --reason` 至少含 10 个非空白字符。`close` 仅关闭本地登记，不表示任务交付、review、CI、merge 或发布完成。T0/T1 在 `new` 和首次 `start` 时要求 worktree 干净，T2 不要求；task 的级别建立后不变。

## 状态与 schema

schema v3 的 `status` 只有 `open`、`active`、`closed`、`dropped`。`open` 表示已登记但未开始，`active` 表示正在实施，`closed` 表示不再跟踪，`dropped` 表示明确放弃。关闭和放弃都是台账终态，不携带任何质量判断。

记录保留 task id、级别、owner、worktree、Git common directory、base SHA、branch、issue/PR 引用、时间戳与 `events[]`。schema 不含 `phase`、`diffHash`、review、approval 或 verification 字段。历史 `events[]` 仅作记录，不是当前审查或测试证据。

旧 schema v1/v2 在读取时只做内存投影，`status` 不落盘。v1 的 `open`、`active`、`dropped` 保持对应状态，`frozen`、`reviewed`、`approved` 投影为 `active`，`done` 投影为 `closed`。v2 的 `open`、`active`、`dropped` 保持对应状态，`done` 投影为 `closed`。下一次针对记录的定向写入会原子迁移到 v3，保留历史事件并追加 migration event；v2 的 PR 引用不丢失。未知版本或直接读取到损坏记录会明确失败。不要手工改写 JSON。

## 存储、归属与隔离

状态文件保存在 `$TMPDIR/greypan/tasks/<task-id>.json`，对应的 Task Packet 保存在同目录的 `<task-id>.md`。这是可丢失的本机工作记忆，不进入工作树版本控制，不承诺跨机器、换用户或系统重启后的恢复。

`AGENT_TASK_ROOT` 覆盖 worktree 默认根目录，默认值为登记脚本所在目录的上一级（即仓库根）；相对 worktree 路径按该根解析。`AGENT_TASK_STATE_DIR` 覆盖状态目录，默认值为 `os.tmpdir()/greypan/tasks`。这些变量只用于登记簿隔离和 fixture；仓库政策检查器会剔除所有 `AGENT_TASK_*` 变量，不读取登记簿。

每个 task 由编排层指定一个 owner 和一个实施 worktree。CLI 验证 Git common directory、拒绝跨仓库分配，并检查未关闭 task 的 worktree 占用；并发分配仍由编排层负责。枚举时按仓库隔离 state；不可读取或归属不明的记录会警告并跳过。`new` 会记录 branch 与 base SHA；T0/T1 的干净起点要求由登记 CLI 实际检查。归属或 worktree 变化应由编排层提供新值，再定向 `assign` 并更新 Task Packet。

## Task Packet

Task Packet 是一项工作的目标、边界、验收与恢复合同，和 state 一样位于系统临时目录。创建后先写明：

- task id、级别、owner、worktree、base SHA、issue 与相关 playbook。
- 可观察的目标、非目标、验收条件和最小充分验证命令。
- 依赖、公共契约、changeset、浏览器验收与 PR review 预期。
- 交付物、失败恢复方式和交接时机。

推荐字段顺序如下；编排层给出的 owner、worktree 与 base 要如实记录：

```text
Task: <task-id>
Level: t0 | t1 | t2
Issue: <issue-url | N/A>
Playbook: <release.md | N/A>
Owner: <owner-id>
Worktree: <absolute path>
Base: <sha>
Goal: <observable outcome>
Non-goals: <explicit exclusions>
Acceptance: <observable pass conditions>
Verification: <commands and evidence required>
Review: <PR 阶段的独立审查安排>
Handoff: <what is returned and when>
```

登记簿和 Task Packet 分工不同：前者供 CLI 检查归属、进度与恢复，后者供接手者理解任务合同。任何验收结论都应保存在 PR、review 报告或验证记录中，不写回 task status。

## 迁移与恢复

旧入口 `pnpm agent:task` 保留为临时兼容 adapter，调用时会向 stderr 提示迁移到 `agent:task-ledger`。`new`、`assign`、`start`、`status`、`issue`、`pr`、`drop` 会转发；旧 `done` 映射为 `close`。旧 `guard`、`freeze`、`review`、`approve`、`verify` 会在读取登记或改动工作区前失败并给迁移提示。需要工作区整理时，实施者显式运行 `mise exec -- pnpm fix-code`，检查其 diff 后只暂存预期文件；需要仓库检查时运行 `mise exec -- pnpm ci:check-policies`。

命令失败时先读 Task Packet 和 `pnpm agent:task-ledger status --task <id>`，再核对真实 worktree、branch 与 Git 状态。state 丢失时保留现有工作树和 Packet，交由编排层决定如何恢复；T0/T1 有未提交修改时 `new` 会拒绝，不能通过改级别、清理现场或伪造 base 绕过。满足干净起点后重新 `new` 记录的是当前 HEAD；原 base 只保留为 Packet 历史，不宣称 CLI 能重建它。不要伪造 review、测试或 CI 事件。若同目录存在不可读取或未知 schema 文件，先保留原文件并调查原因，不要覆盖、删除或手工修复 JSON。
