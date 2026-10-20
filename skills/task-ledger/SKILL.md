---
name: task-ledger
description: 按风险给任务定级（T0/T1/T2），并在系统临时目录记录任务归属、进度与引用。用于可变任务的建账、状态推进、恢复和跨项目复用；不承载 review、测试或 CI 结论。
---

# Task Ledger

## 何时加载

在开始一个会修改仓库的任务前加载：先定级，再建账。只读调查不需要建账。宿主仓库另有 worktree、review、提交或授权规则时，按宿主规则执行；本 skill 只负责分级与记账，不替代它们。

## 分级

按下面的顺序判断，先命中即定级：

1. **T2**：非可执行内容（文档、注释、格式化、二进制资产），或行为与公共契约都不变的整理（重命名、移动、测试结构调整、无行为变化的清理）。
2. **T0**：公共 API / exports / 事件 / 类型契约、跨模块运行时行为、根级脚本与共享配置、构建与 CI 定义、依赖清单、发布、权限或基础设施。
3. **T1**：只位于单个模块内、未命中 T0 的可执行行为改动。

验证深度：T0 至少覆盖受影响测试与验收证据，并按宿主规则取得独立 review；T1 至少一项相关测试；T2 按风险选择。级别不替代对具体改动的影响判断。

## 建账流程

1. 确定唯一的 task id、级别、owner 和 base。`new` 记录当前 Git 上下文；不要求工作区干净，也不接管 worktree 分配。
2. 在实施前运行 `new`，并把目标、非目标、验收条件、验证与恢复方式补进同目录的 Task Packet。
3. 开始实施时运行 `start`；发现 issue、PR 或其他外部引用时用 `ref` 记录。
4. 完成或放弃时运行 `close` 或 `drop`。`closed` / `dropped` 只是本地记录终态，不代表 review、测试、CI、merge 或发布成功。

## 命令

直接调用 skill 内的 `ledger.mjs`，不在宿主仓库的根 `package.json` 另设转发命令。`<skill-dir>` 是加载本 skill 时得到的目录；本仓通过 `.agents/skills/task-ledger/` 访问。

```sh
node <skill-dir>/ledger.mjs new <id> --level <T0|T1|T2> --owner <owner> [--base <git-ref>]
node <skill-dir>/ledger.mjs start <id>
node <skill-dir>/ledger.mjs status [<id>] [--json]
node <skill-dir>/ledger.mjs ref <id> <kind> <value>
node <skill-dir>/ledger.mjs ref <id> <kind> --remove
node <skill-dir>/ledger.mjs close <id>
node <skill-dir>/ledger.mjs drop <id> [--reason <text>]
node <skill-dir>/ledger.mjs help
```

`new` 在状态目录写 `<id>.json`，并在同名 `.md` 不存在时写一个 Task Packet 骨架。`ref` 不校验引用类型或 URL；`issue`、`pr` 只是普通 kind。`status` 不带 id 时列出当前仓库的记录。

## 存储与边界

- 状态目录：`<系统临时目录>/agent-task-ledger/<repo-id>/`。`repo-id` 由 Git common directory 的物理路径派生，因此同一仓库的 worktree 共享记录，不同仓库互相隔离。
- `AGENT_TASK_ROOT` 覆盖仓库根，`AGENT_TASK_STATE_DIR` 覆盖完整状态目录，只用于隔离与 fixture。
- 记录可以丢失，不进入版本控制，不承诺跨机器、换用户或系统重启后的恢复。它不是 review、测试或 CI 证据。
- CLI 只读写状态与 Packet；不运行检查、fixer、构建，不修改源码或 Git index。
- 不要手工改写 JSON；遇到未知 schema 或损坏记录时保留原文件并调查，不要覆盖或删除。

## 恢复

先读 Task Packet 与 `status`，再核对真实 Git 分支、HEAD 和工作区。记录丢失时保留现有工作树与 Packet，由宿主编排层决定恢复方式；重新 `new` 记录的是当前 HEAD，不能凭它重建原 base。不要伪造 review、测试或 CI 事件。
