# Task 台账

本文件说明本地任务登记簿的职责、状态模型与恢复边界。它记录工作归属和进度，不判断代码质量；review、测试、CI、merge 与发布结论保存在各自的真实证据中。

## 职责与入口

正式入口是 `pnpm agent:task-ledger`，实现与完整参数以脚本和 `--help` 为准。登记簿只写系统临时目录中的 JSON 与事件，不运行检查、fixer、build，不修改源码或 Git index；仓库检查失败不影响登记操作。

登记簿记录 task id、级别、owner、worktree、Git common directory、base SHA、branch、issue/PR 引用、时间戳与事件。它不记录 phase、diffHash、review、approval 或 verification；事件历史只作记录，不是当前审查或测试证据。

## 生命周期

- `new` 建立记录并写入 branch 与 base；`assign` 指定 owner 与 worktree；`start` 进入实施。
- `issue` 与 `pr` 只记录引用；`close` 与 `drop` 是台账终态，不表示交付、review、CI、merge 或发布完成。
- `open`、`active`、`closed`、`dropped` 是全部状态。级别在建立后不变；T0/T1 在 `new` 和首次 `start` 时要求 worktree 干净，T2 不要求。
- 旧 schema 在读取时投影到当前状态，下一次定向写入时原子迁移；未知版本或损坏记录明确失败。不要手工改写 JSON。

## 存储与归属

状态文件与 Task Packet 保存在系统临时目录的同一目录下。它们是可丢失的本机工作记忆，不进入版本控制，不承诺跨机器、换用户或系统重启后的恢复。`AGENT_TASK_ROOT` 与 `AGENT_TASK_STATE_DIR` 只用于隔离和 fixture；仓库检查器会剔除 `AGENT_TASK_*`，不读取登记簿。

每个 task 由编排层指定一个 owner 和一个实施 worktree。CLI 校验 Git common directory、拒绝跨仓库分配，并检查未关闭 task 的 worktree 占用；并发分配仍由编排层负责。归属或 worktree 变化由编排层提供新值后定向 `assign`，不要绕过登记簿。

## Task Packet

Task Packet 是任务合同，和 state 一样位于临时目录。它记录 task id、级别、owner、worktree、base、issue 与 playbook，以及可观察的目标、非目标、验收条件、最小充分验证、依赖与公共契约、changeset、浏览器验收、PR review 预期、交付物、失败恢复与交接时机。

登记簿供 CLI 检查归属、进度与恢复；Packet 供接手者理解任务合同。任何验收结论保存在 PR、review 报告或验证记录中，不写回 task status。

## 迁移与恢复

旧入口 `agent:task` 仅为迁移适配器；新工作使用 `agent:task-ledger`，旧动词会失败并提示迁移。

命令失败时先读 Task Packet 和 `agent:task-ledger status`，再核对真实 worktree、branch 与 Git 状态。state 丢失时保留现有工作树和 Packet，交由编排层决定恢复方式；重新 `new` 记录的是当前 HEAD，原 base 只保留为 Packet 历史，不能宣称 CLI 能重建它。T0/T1 有未提交修改时 `new` 会拒绝，不能通过改级别、清理现场或伪造 base 绕过。不要伪造 review、测试或 CI 事件；遇到不可读取或未知 schema 的文件，保留原文件并调查原因，不要覆盖或删除。
