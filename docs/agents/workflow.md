# 开发与协作工作流

本文件是 vibecoding 多 agent 协作、分支与 worktree 布局的权威流程。角色定义见 [`.agents/agents/`](../../.agents/agents/)，review 检查项见 [`review.md`](review.md)，提交规范见 [`commit.md`](commit.md)，验证选择见 [`testing.md`](testing.md)。

## 分支与 worktree 布局

- 新建 worktree 的目录约定与共享工作区的 Git 改写禁令属于仓库边界，权威定义见根 [`AGENTS.md`](../../AGENTS.md)「不可绕过的仓库边界」。
- **持久开发 worktree**：每个活跃子包（`apps/*`、`packages/*`）一个 worktree，分支名 `dev/<package-name>`（如 `dev/web-ui`）。worktree 与分支持久保留以沉淀缓存/验证环境；dev 分支仅存本地，最终内容由 main 通过 squash 承担。
- **release worktree**：需要提 PR 时新建，分支名 `release/<YYMMDD>`（同日多轮加 `-2`、`-3`）；worktree 名与分支后缀一致。合并完成后删除分支与 worktree。

## 开发循环

1. 开始新任务前，若 main 已前进：在对应 worktree 执行 `git switch -C dev/<name> origin/main`，紧接着 `git branch --unset-upstream dev/<name>`，避免 upstream 指向 origin/main 导致裸 push 误推；重置前确认 worktree 无未提交变更、无未合并独有提交。
2. agent 只在自己的 dev worktree 内开发，不得操作他人 worktree 或共享主工作区。
3. 完成后保持工作区变更待 review；验证范围按 [`testing.md`](testing.md) 选择。

## 发布循环（release 分支）

1. 需要提 PR 时，由 manager 或指定 integrator 从最新 `origin/main` 新建 release worktree；每个 worktree 同时只归属一个操作者。创建后先 `pnpm install`，否则 pre-commit hooks 与本地验证不完整。
2. 同一时间只允许一个未合并的 release 分支；上一轮未完成两段验证与删除收尾前，不开新一轮。
3. 各 dev 分支已获用户审批的改动以 `git merge` 汇入 release worktree；跨包冲突由该操作者在 release worktree 内解决。
4. 各 dev worktree 的 agent 为自己改动的包编写 changeset（文件名带包名前缀，如 `web-ui-<slug>.md`；空 changeset 无包可归属，文件名可不带包名前缀），随 merge 汇入；integrator 合并后确认至少一个 changeset，缺失时补空 changeset。
5. release 分支向 main 提 PR，合并方式为 **squash**；PR CI 通过且用户批准后合并。
6. release PR 的 CI 失败时，格式化、笔误等机械性小修由 integrator 直接修复；逻辑或测试问题回对应 dev worktree 修复后再 merge，实现始终归属 dev 线。
7. 合并后验证两段：main push 触发的 CI 全绿；若包含版本变更，changesets 版本 PR 的批准、合并与 npm 发布链全部成功。
8. 两段验证后删除 release 分支与 worktree，并关闭对应 Herdr workspace；否则会残留指向已删目录的僵尸面板。
9. 各 dev 分支按「开发循环」第 1 步重切到最新 main。

**hotfix 例外**：线上紧急修复可跳过 dev 线，由 manager 指定单个 agent 直接在新建 release worktree 实施；其余流程不变。

## 多 agent 协作

- 流程：用户提需求 → manager 用 Herdr 按需创建对应角色到 worktree 开发 → manager 汇总结果 → 用户审批。
- **Reviewer worktree**：reviewer 直接在承载目标 diff 的 dev worktree 只读 review；不另建 worktree 或复制 diff。release worktree 只用于聚合/PR，审聚合 diff 时也在该 worktree 只读 review。
- **Harness 选择**：manager、designer 优先用 codex；lib-coder、biz-coder、reviewer 优先用 claude。创建前询问用户指定 harness 并等待 10 秒，超时按推荐创建。
- **Agent 启动权限**：Codex 与 Gemini CLI 用 `--yolo`，Claude 用 `--dangerously-skip-permissions`；不要额外指定 model 或 effort 参数。仅用于隔离 task worktree；实施 agent 不得擅自 commit/push，Manager 负责汇总 diff 与验证。
- **Herdr workspace 布局**：并行独立任务按 worktree 建 Herdr workspace，内部保持一个 tab + 一个 panel；workspace label 使用任务/worktree 短名。新建 agent 的 tab label 以 role 后缀结尾，格式 `<task>-<role>`（如 `drawer-lib-coder`、`ci-review-reviewer`）；role 取自 [`.agents/agents/`](../../.agents/agents/) 文件名。Manager 保留聚合 workspace。单 tab 多 panel 仅用于短时对比或强耦合子任务。通信按 agent name / pane id 寻址；任务完成后关闭 workspace。
- **提交前审批**：agent 完成后保持工作区变更，Manager 汇总 diff 与验证交用户审批。默认单次审批覆盖 commit、聚合、PR 和合并；跨包、公共 API 或高风险变更采用两道审批：先审 diff，再审 CI 证据。
- **Reviewer 条件**：跨包、公共 API/导出、UI 行为变更必须有独立 reviewer；纯 docs、测试基建或单包内部实现可跳过。pre-commit 审 dev worktree 最终 diff，聚合后审 release worktree diff。
- manager 不直接实施，只负责拆解、编排、聚合与汇总。
