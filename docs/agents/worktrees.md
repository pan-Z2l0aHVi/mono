# Worktree 约定

worktree 是任务隔离边界，不是包名的别名。每个可变 task 只能有一个 owner 和一个实施 worktree，路径放在仓库旁的 `<仓库目录名>-worktrees/<task-id>`；工具默认的 `.claude/worktrees/` 不采用。共享主工作区只用于只读调查、状态查询和明确的集成操作。

## 创建和复用

- 新任务从已确认的 base SHA 创建独立 task worktree；不要让两个任务竞争一个持久 package worktree。新 worktree 在实施或 freeze 前必须执行 `pnpm install && pnpm run build`，两步都不能省：freeze 的 guard 只看 `node_modules` 是否存在，装完依赖就通过，缺的其实是 workspace 包的 `dist` 类型产物；没有它，`vp check`（`fix:code` 与 `check:code` 都调用它）会把每个跨包 import 报成假 `TS2307`，实测只 `pnpm install` 的新 worktree 报出 1696 个错误，全部类型感知验证随之不可用。
- 长期使用的 dev/task worktree 在开新任务前若 `main` 已前进，先确认 worktree 无未提交变更、无未合并独有提交，再执行 `git switch -C <branch> origin/main` 并紧跟 `git branch --unset-upstream <branch>`，避免 upstream 指向 `origin/main` 导致裸 push 误推。
- package worktree 可以保留依赖安装和缓存，但必须通过 task state 绑定到单一任务后才能写入。
- 每个实施 task 使用一个 worktree；是否因 `packages/*` 与 `apps/*` 的目录边界拆分 task，由多 Agent 编排 skill 根据影响面决定。
- worktree 交接时更新 task state 的 owner 和 path，并重新执行 `pnpm task assign`；禁止依靠 pane 名称推断归属。

### turbo 缓存共享

- `.mise.toml` 的 `[env]` 用 `git rev-parse --path-format=absolute --git-common-dir` 把 `TURBO_CACHE_DIR` 锚定到 **git common dir**（`mono/.git/turbo-cache`）：主仓与全部 task worktree 共享同一份本地 turbo 缓存（构建产物含 dist d.ts），新 worktree 不必冷缓存全量重建，跨 checkout 复用安全（turbo 内容寻址）。
- 手动回收直接删除 `mono/.git/turbo-cache`，turbo 下次运行自动重建。CI 在 `ci.yml` 显式覆盖回 workspace 内路径，mise 注入不影响 CI 缓存键；git common dir 不受 `git gc` / worktree 清理影响。

## 任务隔离边界

本文件只描述 worktree 与 task state 的关系。Role 的目录边界、只读 Supervisor、跨边界需求如何拆分，以及 pane 编排见 [`herdr-agents`](../../.agents/skills/herdr-agents/SKILL.md)。

## Git 边界

根 [`AGENTS.md`](../../AGENTS.md) 的共享工作区 Git 改写禁令是权威边界。任何重切分支、清理、重置或删除 worktree 前，先确认没有未提交变更、没有未合并独有提交，并把结果写入交接记录。

## Review 边界

Reviewer 只审冻结的 task diff，不在自己的临时副本上审查，也不复用变化后的旧结论。diff 变化后，原 review 和 approval 自动失效。
