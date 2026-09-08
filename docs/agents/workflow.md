# 开发与协作工作流

本文件是 vibecoding 多 agent 协作、分支与 worktree 布局的权威流程。角色定义见 [`.agents/agents/`](../../.agents/agents/),review 检查项见 [`review.md`](review.md),提交规范见 [`commit.md`](commit.md),验证选择见 [`testing.md`](testing.md)。

## 分支与 worktree 布局

- 新建 worktree 统一放在仓库旁的 `<仓库目录名>-worktrees/<worktree 名>`(例:仓库在 `path/to/mono`,worktree 放 `path/to/mono-worktrees/<name>`);工具自带的 worktree 默认路径(如 `.claude/worktrees/`)不采用。共享工作区的 Git 改写禁令见根 `AGENTS.md`。
- **持久开发 worktree**:每个活跃子包(`apps/*`、`packages/*`)一个 worktree,分支名 `dev/<package-name>`(如 `dev/web-ui`、`dev/design`、`dev/interweave`)。worktree 与分支持久保留,沉淀构建缓存与验证环境。dev 分支**仅存本地、不推远端**——持久内容由 main 通过 squash 承担,dev 分支只是工作基线。
- **release worktree**:每轮需要提 PR 时新建,分支名 `release/<YYMMDD>`(同日多轮加 `-2`、`-3` 后缀),worktree 名与分支后缀一致(如 `release-260908`)。合并流程完成后删除分支与 worktree。

## 开发循环

1. 开始新任务前,若 main 已前进:把 dev 分支重切到最新 `origin/main`——在对应 worktree 内执行 `git switch -C dev/<name> origin/main`,**紧接着 `git branch --unset-upstream dev/<name>`**(否则 upstream 指向 `origin/main`,裸 `git push` 会推错目标)。重置前确认 worktree 无未提交变更、无未合并的独有提交。
2. agent 只在自己的 dev worktree 内开发,不得操作他人 worktree 或共享主工作区。
3. 完成后保持工作区变更待 review;验证范围按 [`testing.md`](testing.md) 选择。

## 发布循环(release 分支)

1. 需要提 PR 时,由 manager 或其指定的**单一 integrator** 从最新 `origin/main` 新建 `release/<YYMMDD>` 分支与对应 worktree;每个 worktree 同时只归属一个操作者。release worktree 创建后先 `pnpm install`(依赖缓存下约 5s),否则 pre-commit hooks 与本地验证不完整。
2. **同一时间只允许一个未合并的 release 分支**:上一轮未完成两段验证与删除收尾前,不开新一轮,避免基线漂移与重复解冲突。
3. 各 dev 分支已获用户审批的改动以 `git merge` 汇入 release worktree;跨包冲突在 release worktree 内由该操作者解决。
4. changeset 由各 dev worktree 的 agent 为自己改动的包编写(文件名带包名前缀,如 `web-ui-<slug>.md`),随 merge 汇入;integrator 合并后确认 `.changeset/` 至少一个文件,缺失时补空 changeset 兜底(见 [`commit.md`](commit.md))。
5. release 分支向 main 提 PR,合并方式为 **squash**;PR CI 通过(分支保护要求)且用户批准后合并。
6. release PR 的 CI 失败时:**格式化、笔误等机械性小修**由 integrator 直接在 release worktree 修复;**逻辑或测试问题**回对应 dev worktree 修复后再 merge——实现始终归属 dev 线。
7. 合并后验证两段:main push 触发的 CI 全绿;若包含版本变更,changesets 版本 PR 的批准、合并与 npm 发布链全部成功。
8. 两段验证完成后删除 release 分支与 release worktree,**并同步关闭其对应的 herdr workspace**(`herdr workspace close <workspace_id>`)——git 侧清理不会联动 herdr,漏掉会残留指向已删目录的僵尸面板。
9. 各 dev 分支按「开发循环」第 1 步重切到最新 main。

**hotfix 例外**:线上紧急修复允许跳过 dev 线——manager 指定单个 agent 直接在新建的 release worktree 内实施,其余流程(squash、CI、审批、两段验证、删除收尾)不变。

## 多 agent 协作

- 流程:用户提需求 → manager 使用 herdr 编排、按需创建 designer / lib-coder / biz-coder / reviewer 到对应 worktree 的分支进行开发(角色职责见 [`.agents/agents/`](../../.agents/agents/))→ manager 汇总结果 → 用户审批。
- **Reviewer worktree 归属**:reviewer 直接进入承载目标 diff 的 dev worktree 做只读 review;不为其创建独立 worktree,也不把未提交变更复制到第二个分支。release worktree 只用于发布聚合与 PR;reviewer 需要审查聚合结果时,在已存在的 release worktree 内只读 review,不另行复制 dev diff。
- **创建 agent 前先询问 harness 并给出推荐**:manager、designer 优先用 codex;lib-coder、biz-coder、reviewer 优先用 claude。manager 创建 agent 前必须向用户询问并等待 10 秒,让用户手动指定 harness;超时未响应则按上述推荐优先级创建。
- **Herdr workspace/tab 布局**:并行独立任务优先为每个 worktree 创建一个 Herdr workspace,workspace 内保持一个 tab + 一个 panel;workspace 与 tab label 使用任务/worktree 短名。Manager 保留 release/聚合 workspace,单 tab 多 panel 仅用于需要同时对比输出的短时观察或强耦合子任务。通信仍按 agent name / pane id 寻址,workspace/tab 只是可视化隔离与编排;任务完成后关闭对应 workspace。
- **审批在 commit 之前,按变更规模分档**:agent 完成后保持工作区变更,manager 汇总 diff 与验证证据交用户审批(见 [`.agents/rules/commit.md`](../../.agents/rules/commit.md))。默认**单次审批**——commit、聚合、提 PR 与合并一次授权;跨包、公共 API 或高风险变更采用**两道**——commit 前审 diff,合并前审 CI 证据。
- **reviewer 强制条件**:跨包变更、公共 API/导出变更、UI 行为变更必须有独立 reviewer;纯 docs、测试基建、单包内部实现可跳过。reviewer 必须独立于实施;pre-commit review 的对象是目标 dev worktree 的最终 diff,跨包聚合后的 review 对象是 release worktree 的聚合 diff,而非实施过程的描述(见 [`review.md`](review.md))。
- manager 不直接实施;其职责是拆解、编排、聚合与汇总状态。
