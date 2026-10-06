# Release Playbook

release 是发布场景下的操作程序，不是独立的 task 类型。**发布通道本身不由本仓建立**：谁决定哪些 task 进入这一轮、并行度多大、分支与 worktree 怎么分配、合并节奏如何，全部由编排层（herdr-projects）承担（划界见 [ADR-0021](../adr/0021-orchestration-layer-moved-to-herdr-projects.md)）。本文件只描述仓库侧仍然负责的那一半：changeset 逐个校验、集成验证、开 PR 等 CI 与 approval、合并后验证，以及有版本变更时的发布链验证。流程形态本身的决策与取舍见 [ADR-0022](../adr/0022-release-flow-follows-herdr-projects.md)。

## CI 只在 base 为 main 的 PR 上运行

`.github/workflows/ci.yml` 的触发面是 `pull_request` 且 `branches: [main]`。**PR 指向任何其它分支都拿不到 `check`**，这不是配置疏漏，而是发布形态的成因：编排层把各 task 落在发布通道分支上，由「发布通道 → main」的那一个 PR 承担集成验证与合并门控，`main` 的 ruleset（`strict required status`，唯一必需上下文 `check`）也只认这一次运行。

推论有两条，流程按它们成立：

- 想让每条 task 的 PR 各自跑一遍 CI，需要给 `ci.yml` 扩展 `branches:` 列表。本仓有意不做：同一份树会被验证 N 次，而发布通道那一次已经是最终判据。判据与代价见 ADR-0022。
- 编排层把某条 task 的 base 放在非 `main` 分支上时，那条 task 的 PR 在合并进发布通道之前**没有 CI 证据**。这不是可以靠仓库文档补上的缺口，接这条 task 的人需要知道集成验证发生在哪一步。

## 合并方式

- **发布通道内保留每条 task 的独立 commit**（merge commit / `--no-ff`）。squash 会把 N 条 task 压成一条，task 边界在 git 历史里消失，之后既不能整笔回滚某条 task，也不能单独 bisect 到它——而 task 体系的全部证据链正是按「一条 task 一个可定位的 diff」建立的。留痕的需求不止 commit message：task id、reviewer、approver 都挂在这条边界上。
- **发布通道 → main 走 squash**，这是仓库既定策略，不在本 playbook 的选择范围内。`ci.yml` 不监听 push 与 ruleset 的 strict required status 都建立在「PR head 的树等于合并后 main 的树」这条保证上（见 [`build.md`](build.md) 与 `.github/scripts/ci-topology.mjs`），改掉它要同时重做这两处，代价与收益不成比例。squash 之后 main 上是一条 commit，正文按 GitHub 的形状拼接各 task 的 message：message 级追溯仍在，commit 级追溯不在。

## 步骤

1. 确认本轮待发布的每条 task 都已 `approved`，记录各自的 task id、base SHA、diff hash 和 changeset。
2. 确认本 PR 会带入的 changesets 里，changesets 会读的**每一个**声明（`.changeset` 顶层与 `pre/` 下的非点 `.md`；`README.md`、`AGENTS.md`、`CLAUDE.md`、`GEMINI.md` 不参与发布，也不算声明——排除按 changesets 忽略表的原样大小写，只有 `README.md` 不区分大小写，所以 `.changeset/claude.md` 是一份真声明）都是 `changeset-required` 认可的形态（以成对 `---` 开头、分隔线前没有散落内容；frontmatter 里声明了包的还必须带正文），而不是「整批里至少有一个」——`changeset-required` 逐个核对，任何一条 task 带畸形或空描述的 changeset 都会拦住提交。
3. 运行影响范围内测试、构建、契约和必要的浏览器验证，记录到 task state。
4. 创建 PR，等待 CI 和用户 approval。跨包集成正确性由 CI 与 `main` 分支验证兜底（task 体系不再有 post-merge gate）。
5. 合并后验证 `main` CI；有版本变更时再验证 changesets 版本 PR、批准、合并和 npm 发布链。
6. 两段验证通过后关闭 task、清理本轮创建的临时资源；未完成验证不得清理证据。发布通道的分支与 worktree 由编排层回收（`thread resolve`），仓库不规定删除命令。

CI 的机械性格式和拼写修复可以由该 PR 对应 task 的 owner 处理；逻辑、测试和契约问题回到原 task owner 修复。任何变更都会使该 PR 之前冻结的证据失效，需要重新 freeze/review/approve。
