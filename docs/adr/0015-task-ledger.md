# ADR-0015: Task 分级与台账复用

- **Date**: 2026-10-19
- **Revised**: 2026-11-22，修订为按需启用、默认状态目录迁至 `$XDG_CACHE_HOME`/`~/.cache/agent-task-ledger/`、补 `prune` 回收与稀疏检出解耦。
- **Status**: 已退役（2026-11-27，随 [ADR-0026](./0026-lean-agent-context-for-frontier-models.md) 从本仓移除 `task-ledger` skill）

## 背景

风险分级和本地 task 归属可跨项目复用；worktree、review、发布和授权要求则属于宿主仓库。

## 决策

`task-ledger` skill 承载风险分级与本地台账，不承载 review、CI 或发布结论。只读调查与单会话局部改动免建账；跨会话、跨 Harness 或多 worktree 接力时按需启用台账记录归属、进度与引用。分级依据改动影响，避免依赖具体包名或固定目录清单；现行判据由 skill 维护。宿主仓库负责 worktree、review 和交付规则。

默认状态目录按 `AGENT_TASK_STATE_DIR` > `$XDG_CACHE_HOME`（仅非空且为绝对路径时生效）> `~/.cache` 解析，其下以 `agent-task-ledger/<repo-id>/` 按 Git common directory 派生的仓库标识隔离，避免系统临时目录回收导致跨会话或重启后丢失接力状态；它仍是本地工作记忆而非审计记录，PR、Git 历史和其他持久文档承载交付结论。CLI 提供 `prune [--days N] [--dry-run]` 子命令按保留天数清理终态（`closed` / `dropped`）记录及同名 Packet，同时保护活跃态、损坏 JSON 与未知 schema 文件。

台账也可记录仓库相对的改动范围（`scope`），供实施方记录或衔接变更范围；台账只存路径，不解释路径含义，不触发检查或工作区动作，并与 `apps-sparse-checkout` 的按需 App 隔离保持完全解耦（稀疏脚本不读取台账 `scope`）。

## 后果

- 其他仓库可以复用分级与按需记账，不必继承本仓的编排政策或稀疏检出工具。
- 状态目录迁入用户缓存目录后仍属可清理的本地工作记忆，恢复时必须核对实际 Git 状态和持久证据；终态记录通过 `prune` 显式回收。
- 台账不会执行检查或 Git 写操作，其终态不表示 review、测试、CI、merge 或发布成功。
