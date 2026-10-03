# Worktree 约定

worktree 是任务隔离边界，不是包名的别名。本文件只描述**仓库侧**的边界：一个可变 task 只能有一个 owner 和一个实施 worktree。worktree 本身怎么创建、放在哪个路径、用什么命令建、由谁清理，都由编排层（herdr-projects）决定，仓库不再规定。共享主工作区只用于只读调查、状态查询和明确的集成操作。

## 编排层交付之后

编排层把一个新 worktree 交给执行者之后，**收到它的执行者**（而不是编排层代劳）必须在实施或 freeze 之前先跑一次 `pnpm install && pnpm run build`，两步都不能省：freeze 的 guard 只看 `node_modules` 是否存在，装完依赖就通过，缺的其实是 workspace 包的 `dist` 类型产物；没有它，`vp check`（`fix-code` 与 `check-code` 都调用它）会把每个跨包 import 报成假 `TS2307`，实测只 `pnpm install` 的新 worktree 报出 1696 个错误，全部类型感知验证随之不可用。判据见 [`workflow.md`](workflow.md)「先建立任务」的 preflight 第 4 步。

编排层交接 task 时会带上 worktree 路径、base SHA 和 owner 标识。执行者按它们填 [`task-packet.md`](task-packet.md) 的 `Worktree`、`Base`、`Owner` 并执行 `pnpm agent:task assign` 记录归属，不自行推导、也不改写；交接后归属有变更是编排层的动作，重新 assign 即可。禁止依靠 pane 名称或目录名推断归属。

### turbo 缓存共享

- `.mise.toml` 的 `[env]` 用 `git rev-parse --path-format=absolute --git-common-dir` 把 `TURBO_CACHE_DIR` 锚定到 **git common dir**（`mono/.git/turbo-cache`）：主仓与全部 task worktree 共享同一份本地 turbo 缓存（构建产物含 dist d.ts），新 worktree 不必冷缓存全量重建，跨 checkout 复用安全（turbo 内容寻址）。编排层创建的 worktree 同样落在这份共享缓存上，所以「新 worktree 不必冷缓存全量重建」对它一样成立。
- 上一条「新 worktree 不必冷缓存全量重建」的前提是**期间没人清过这份共享缓存**：`pnpm run clean` 的默认档会连它一起清掉（解析方式与影响面见 [`build.md`](build.md)），清后主仓与全部 worktree 都会冷缓存全量重建。在 A worktree 干活的 agent 可能被 B worktree 或主仓的一次 `pnpm run clean` 打中且无从预知；判断要不要预留冷重建时间时要把这条算进去。
- 手动回收直接删除 `mono/.git/turbo-cache`，turbo 下次运行自动重建。CI 在 `ci.yml` 显式覆盖回 workspace 内路径，mise 注入不影响 CI 缓存键；git common dir 不受 `git gc` / worktree 清理影响。

## 任务隔离边界

并行实施时 owner 与 worktree 的唯一性边界见根 [`AGENTS.md`](../../AGENTS.md)。拆分与派发本身由编排层决定，本文件不规定一个需求该拆成几个 task。

## Git 边界

根 [`AGENTS.md`](../../AGENTS.md) 的共享工作区 Git 改写禁令是权威边界。任何重切分支、清理、重置或删除 worktree 前，先确认没有未提交变更、没有未合并独有提交，并把结果写入交接记录。

## Review 边界

Reviewer 只审冻结的 task diff，不在自己的临时副本上审查，也不复用变化后的旧结论。diff 变化后，原 review 和 approval 自动失效。T0 的 reviewer 由编排层另起独立线程提供，形态见 [`workflow.md`](workflow.md)「review 拓扑」。
