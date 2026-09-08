# 开发与协作工作流

本文件是 vibecoding 多 agent 协作、分支与 worktree 布局的权威流程。角色定义见 [`.agents/agents/`](../../.agents/agents/),review 检查项见 [`review.md`](review.md),提交规范见 [`commit.md`](commit.md),验证选择见 [`testing.md`](testing.md)。

## 分支与 worktree 布局

- 新建 worktree 统一放在仓库旁的 `<仓库目录名>-worktrees/<worktree 名>`(例:仓库在 `path/to/mono`,worktree 放 `path/to/mono-worktrees/<name>`);工具自带的 worktree 默认路径(如 `.claude/worktrees/`)不采用。共享工作区的 Git 改写禁令见根 `AGENTS.md`。
- **持久开发 worktree**:每个活跃子包(`apps/*`、`packages/*`)一个 worktree,分支名 `dev/<package-name>`(如 `dev/web-ui`、`dev/design`、`dev/interweave`)。worktree 与分支持久保留,沉淀构建缓存与验证环境。
- **release worktree**:每轮需要提 PR 时新建,分支名 `release/<YYMMDD>`(同日多轮加 `-2`、`-3` 后缀),worktree 名与分支后缀一致(如 `release-260908`)。合并流程完成后删除分支与 worktree。

## 开发循环

1. 开始新任务前,若 main 已前进:把 dev 分支重切到最新 `origin/main`——在对应 worktree 内执行 `git switch -C dev/<name> origin/main`,**紧接着 `git branch --unset-upstream dev/<name>`**(否则 upstream 指向 `origin/main`,裸 `git push` 会推错目标)。重置前确认 worktree 无未提交变更、无未合并的独有提交。
2. agent 只在自己的 dev worktree 内开发,不得操作他人 worktree 或共享主工作区。
3. 完成后保持工作区变更待 review;验证范围按 [`testing.md`](testing.md) 选择。

## 发布循环(release 分支)

1. 需要提 PR 时,由 manager 或其指定的**单一 integrator** 从最新 `origin/main` 新建 `release/<YYMMDD>` 分支与对应 worktree;每个 worktree 同时只归属一个操作者。release worktree 创建后先 `pnpm install`(依赖缓存下约 5s),否则 pre-commit hooks 与本地验证不完整。
2. 各 dev 分支已获用户审批的改动以 `git merge` 汇入 release worktree;跨包冲突在 release worktree 内由该操作者解决。
3. release PR 必须携带至少一个 changeset(不影响包版本时用空 changeset,见 [`commit.md`](commit.md))。
4. release 分支向 main 提 PR,合并方式为 **squash**;PR CI 通过(分支保护要求)且用户批准后合并。
5. 合并后验证两段:main push 触发的 CI 全绿;若包含版本变更,changesets 版本 PR 的批准、合并与 npm 发布链全部成功。
6. 两段验证完成后删除 release 分支与 release worktree。
7. 各 dev 分支按「开发循环」第 1 步重切到最新 main。

## 多 agent 协作

- 流程:用户提需求 → manager 使用 herdr 编排、按需创建 designer / lib-coder / biz-coder / reviewer 到对应 worktree 的分支进行开发(角色职责见 [`.agents/agents/`](../../.agents/agents/))→ manager 汇总结果 → 用户审批。
- **创建 agent 前先询问 harness 并给出推荐**:manager、designer 优先用 codex;lib-coder、biz-coder、reviewer 优先用 claude。manager 创建 agent 前必须向用户询问并等待 10 秒,让用户手动指定 harness;超时未响应则按上述推荐优先级创建。
- **审批在 commit 之前**:agent 完成后保持工作区变更,manager 汇总 diff 与验证证据交用户审批;获得授权后才执行 commit、聚合到 release 分支、提 PR 与合并(见 [`.agents/rules/commit.md`](../../.agents/rules/commit.md))。
- reviewer 必须独立于实施,review 对象是 release 分支的聚合 diff,而非实施过程的描述(见 [`review.md`](review.md))。
- manager 不直接实施;其职责是拆解、编排、聚合与汇总状态。
