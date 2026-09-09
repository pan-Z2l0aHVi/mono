# Worktree 约定

worktree 是任务隔离边界，不是包名的别名。每个可变 task 只能有一个 owner 和一个实施 worktree，路径放在仓库旁的 `<仓库目录名>-worktrees/<task-id>`；工具默认的 `.claude/worktrees/` 不采用。共享主工作区只用于只读调查、状态查询和明确的集成操作。

## 创建和复用

- 新任务从已确认的 base SHA 创建独立 task worktree；不要让两个任务竞争一个持久 package worktree。
- package worktree 可以保留依赖安装和缓存，但必须通过 task state 绑定到单一任务后才能写入。
- 跨包变更使用一个 task worktree；不要按包拆成多个互相无法独立 review 的 worktree。
- worktree 交接时更新 task state 的 owner 和 path，并重新执行 `assign`；禁止依靠 pane 名称推断归属。

## Git 边界

根 [`AGENTS.md`](../../AGENTS.md) 的共享工作区 Git 改写禁令是权威边界。任何重切分支、清理、重置或删除 worktree 前，先确认没有未提交变更、没有未合并独有提交，并把结果写入交接记录。

## Review 边界

Reviewer 只审冻结的 task diff；不在 reviewer 自己的临时复制品上审查，也不复用变化后的旧结论。diff 变化后，原 review 和 approval 自动失效。
