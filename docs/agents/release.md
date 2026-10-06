# Release Playbook

release 是发布场景下的操作程序，不是独立的 task 类型。**流程本身不属本仓**：需要哪些工作、拆成几条 task、并行度多大、worktree 与分支怎么分配、PR 怎么跟进、合并后怎么回收，全部由编排层（herdr-projects）按它自己的 skill 承担（划界见 [ADR-0021](../adr/0021-orchestration-layer-moved-to-herdr-projects.md)）；**流程的权威文档是那份 skill，不是本文件**。本文件只描述仓库侧仍然负责的那一半：changeset 逐个校验、集成验证、开 PR 等 CI 与 approval、合并后验证，以及有版本变更时的发布链验证。

交付单元是**任务**：一条 task 一个 worktree、一条分支、一个 PR，PR 直接合进默认分支 `main`。中间没有把多条 task 聚到一起、再由那一条分支开 PR 进 `main` 的通道层。

## CI 的触发面

`.github/workflows/ci.yml` 的触发面是 `pull_request` 且 `branches: [main]`（触发面的单一声明在 `.github/scripts/ci-topology.mjs`，由 `scripts/ci-topology.test.mjs` 拿真实 YAML 逐字段比对）。在这个形态下每条 task 的 PR 都指向 `main`，所以**每条 PR 都拿得到 `check`**；`main` 的 ruleset（`strict required status`，唯一必需上下文 `check`）认的也是这一次运行。

指向其它分支的 PR 拿不到 `check`，那是触发面的形状而不是配置疏漏。**本仓不把 `branches:` 扩到 `main` 之外**：每条 task 的 PR 都指向 `main`，没有需要额外覆盖的 base。真要加目标分支，同时改 `ci.yml` 的 `branches:` 与 `.github/scripts/ci-topology.mjs` 那一行（两者必须一致，`scripts/ci-topology.test.mjs` 会比对）。

## 合并方式

- **PR → `main` 走 squash**，这是仓库既定策略，不在本 playbook 的选择范围内。`ci.yml` 不监听 push 与 ruleset 的 strict required status 都建立在「PR head 的树等于合并后 `main` 的树」这条保证上（见 [`build.md`](build.md) 与 `.github/scripts/ci-topology.mjs`），改掉它要同时重做这两处，代价与收益不成比例。
- squash 之后 `main` 上一条 task 对应一条 commit，正文按 GitHub 的形状带上 PR 编号。**message 级追溯保留，PR 分支内部的逐 commit 追溯不保留**——需要在 git 历史里定位到某条 task 的中间提交的人，查的是 PR 本身，不是 `main`。

## 步骤

1. 确认这条 task 的 gate 已满足（T0 与记了 review 的 T1 是 `approved`，未记 review 的 T1 是 `frozen` 加一条通过的验证），记录 task id、base SHA、diff hash 和 changeset。
2. 确认本 PR 会带入的 changesets 里，changesets 会读的**每一个**声明（`.changeset` 顶层与 `pre/` 下的非点 `.md`；`README.md`、`AGENTS.md`、`CLAUDE.md`、`GEMINI.md` 不参与发布，也不算声明——排除按 changesets 忽略表的原样大小写，只有 `README.md` 不区分大小写，所以 `.changeset/claude.md` 是一份真声明）都是 `changeset-required` 认可的形态（以成对 `---` 开头、分隔线前没有散落内容；frontmatter 里声明了包的还必须带正文），而不是「整批里至少有一个」——`changeset-required` 逐个核对，任何一条畸形或空描述的 changeset 都会拦住提交。
3. 运行影响范围内测试、构建、契约和必要的浏览器验证，记录到 task state。
4. 创建 PR（base = `main`），等待 CI 和用户 approval。合并本身要用户明确授权。跨包集成正确性由 CI 与 `main` 分支验证兜底（task 体系不再有 post-merge gate）。
5. 合并后验证 `main` CI；有版本变更时再验证 changesets 版本 PR、批准、合并和 npm 发布链。
6. 两段验证通过后关闭 task；未完成验证不得清理证据。task 的分支与 worktree 由编排层回收（`thread resolve`），仓库不规定删除命令。

CI 的机械性格式和拼写修复可以由该 PR 对应 task 的 owner 处理；逻辑、测试和契约问题回到原 task owner 修复。任何变更都会使该 PR 之前冻结的证据失效，需要重新 freeze/review/approve。
