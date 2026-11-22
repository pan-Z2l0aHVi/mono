---
name: task-ledger
description: 跨会话、跨 Harness 或多 worktree 接力的可变任务时按需调用：按风险定级（T0/T1/T2），在用户缓存目录（$XDG_CACHE_HOME 或 ~/.cache）记录任务归属、范围、进度与引用，用于建账、状态推进、清理和跨项目复用；只读调查与单会话局部改动免建账；不承载 review、测试或 CI 结论。
---

# Task Ledger

## 何时加载

- **只读调查与单会话局部改动免建账**：无需调用 `ledger.mjs` 落盘，仅按下方「分级」判据确定验证深度即可。
- **跨会话、跨 Harness 或多 worktree 接力**：在开始实施前按需加载本 skill 并建账，记录 task 归属、起点、范围与恢复上下文。
- 宿主仓库另有 worktree、review、提交或授权规则时，按宿主规则执行；本 skill 只负责分级与记账，不替代它们。

## 分级

按下面的顺序判断，先命中即定级：

1. **T2**：非可执行内容（文档、注释、格式化、二进制资产），或行为与公共契约都不变的整理（重命名、移动、测试结构调整、无行为变化的清理）。
2. **T0**：公共 API / exports / 事件 / 类型契约、跨模块运行时行为、根级脚本与共享配置、构建与 CI 定义、依赖清单、发布、权限或基础设施。
3. **T1**：只位于单个模块内、未命中 T0 的可执行行为改动。

验证深度：T0 至少覆盖受影响测试与验收证据，并按宿主规则取得 PR 上的 review 结论；T1 至少一项相关测试；T2 至少运行宿主仓库针对该改动类型的既有检查，并在 Task Packet 记录命令与结果。级别不替代对具体改动的影响判断。

## 建账流程

1. 确定唯一的 task id、级别、owner 和 base。`new` 记录当前 Git 上下文；不要求工作区干净，也不接管 worktree 分配。
2. 启用台账时，在实施前运行 `new`，按需用 `--scope` 记录本任务的仓库相对改动范围，并把目标、非目标、验收条件、验证与恢复方式补进同目录的 Task Packet。实施中发现范围变化时，先更新 scope 再继续。
3. 开始实施时运行 `start`；发现 issue、PR 或其他外部引用时用 `ref` 记录。
4. 完成或放弃时运行 `close` 或 `drop`。`closed` / `dropped` 只是本地记录终态，不代表 review、测试、CI、merge 或发布成功。过期终态记录可用 `prune` 定期清理。

## 命令

直接调用 skill 内的 `ledger.mjs`，不在宿主仓库的根 `package.json` 另设转发命令。`<skill-dir>` 是加载本 skill 时得到的目录；本仓通过 `.agents/skills/task-ledger/` 访问。

```sh
node <skill-dir>/ledger.mjs new <id> --level <T0|T1|T2> --owner <owner> [--base <git-ref>] [--scope <path>]...
node <skill-dir>/ledger.mjs start <id>
node <skill-dir>/ledger.mjs status [<id>] [--json]
node <skill-dir>/ledger.mjs scope <id> [<path>...] [--set|--add|--remove|--clear]
node <skill-dir>/ledger.mjs ref <id> <kind> <value>
node <skill-dir>/ledger.mjs ref <id> <kind> --remove
node <skill-dir>/ledger.mjs close <id>
node <skill-dir>/ledger.mjs drop <id> [--reason <text>]
node <skill-dir>/ledger.mjs prune [--days <n>] [--dry-run] [--json]
node <skill-dir>/ledger.mjs help
```

`new` 在状态目录写 `<id>.json`，并在同名 `.md` 不存在时写一个 Task Packet 骨架。`ref` 不校验引用的语义类型或 URL——`issue`、`pr` 只是普通 kind，不是枚举；但 kind 与 value 有形状校验：kind 匹配小写短横线串（`/^[a-z][a-z0-9-]{0,31}$/`），value 非空、单行且不超过 2000 字符。`status` 不带 id 时列出当前仓库的记录。`prune` 默认清理 30 天前的终态（`closed` / `dropped`）记录，按记录终态更新时间（缺失或无效时回退文件 `mtime`）判定，同步删除同名 `<id>.json` 与 `<id>.md`；`--days` 必须为正整数，`--dry-run` 仅预览不删除，活跃态记录、损坏 JSON 与未知 schema 文件均保留不删。

## 改动范围（scope）

- `scope` 是仓库相对路径的字符串数组，由 agent 判定，不是包名；路径不要求已经存在。
- 路径不能是绝对路径，不能含 `..` 段；前导 `./` 与尾部 `/` 会被去掉，其他 `.` 段非法。写入前统一规范化、去重、排序。
- 实施中发现范围变化时先更新 scope：放宽用 `--add`，重算或收窄用默认 `--set` 或 `--remove`，清空用 `--clear`。终态记录（`closed` / `dropped`）不能再改。
- 台账只存路径，不解释路径含义，不触发检查、构建或工作区动作。
- 读取用 `status <id>` 或 `status --json`；Task Packet 不写 scope。老记录可以没有该字段。用 `--task <id>` 指定记录时，位置参数全部按路径处理。

## 存储与边界

- 状态目录优先级：`AGENT_TASK_STATE_DIR`（覆盖完整状态目录）> `$XDG_CACHE_HOME/agent-task-ledger/<repo-id>/`（仅 `XDG_CACHE_HOME` 非空且为绝对路径时生效）> `~/.cache/agent-task-ledger/<repo-id>/`。`repo-id` 由 Git common directory 的物理路径派生，因此同一仓库的 worktree 共享记录，不同仓库互相隔离。
- 旧 `<tmpdir>/agent-task-ledger/` 目录自然失效，不做自动迁移；如需保留或清理历史文件，由使用者按真实 Git 状态核对处理。
- `AGENT_TASK_ROOT` 覆盖仓库根，`AGENT_TASK_STATE_DIR` 覆盖完整状态目录，只用于隔离与 fixture。
- 记录存放于本机用户缓存目录，不进入版本控制，不承诺跨机器或换用户恢复；它不是 review、测试或 CI 证据。
- CLI 只读写状态与 Packet；不运行检查、fixer、构建，不修改源码或 Git index。
- 不要手工改写 JSON；遇到未知 schema 或损坏记录时保留原文件并调查，不要覆盖或删除（`prune` 同样保留这些文件）。

## 恢复

先读 Task Packet 与 `status`，再核对真实 Git 分支、HEAD 和工作区。记录丢失时保留现有工作树与 Packet，按实际 Git 状态与当前会话方式恢复；重新 `new` 记录的是当前 HEAD，不能凭它重建原 base。不要伪造 review、测试或 CI 事件。
