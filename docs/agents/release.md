# Release Playbook

release 是聚合发布场景下的操作程序，不是独立的 task 类型。聚合本身是一个 T0 task（`pnpm task new --task release-<date> --level t0 --playbook release.md`）。release worktree 只负责聚合和发布，不承担长期实施；必须从最新 `origin/main` 创建，同一时间只允许一个未完成的 release cycle。

1. Manager 确认所有待聚合 task 已 `approved`，记录各自 task id、base SHA、diff hash 和 changeset。
2. 在仓库旁创建唯一 release worktree，安装依赖并初始化 release task state；实施 task 不直接写入 release worktree。
3. 以 `git merge` 或等价的受控集成方式聚合已批准 task；冲突由 Manager 在 release worktree 解决，并记录决策。
4. 聚合后把 release diff 作为新的 review 对象；原 task 的 review 不自动覆盖聚合冲突解决或额外修改。
5. 确认聚合 diff 里 changesets 会读的**每一个**声明（`.changeset` 顶层与 `pre/` 下的非点 `.md`；`README.md`、`AGENTS.md`、`CLAUDE.md`、`GEMINI.md` 不参与发布，也不算声明——排除按 changesets 忽略表的原样大小写，只有 `README.md` 不区分大小写，所以 `.changeset/claude.md` 是一份真声明）都是 `changeset-required` 认可的形态（以成对 `---` 开头、分隔线前没有散落内容；frontmatter 里声明了包的还必须带正文），而不是「整批里至少有一个」——`changeset-required` 逐个核对，任何一个子 task 带畸形或空描述的 changeset 都会拦住聚合提交；聚合 diff 对 `origin/main` 天然包含被聚合 task 的 changeset，因此这道检查对 release 也无豁免。随后运行影响范围内测试、构建、契约和必要的浏览器验证，记录到 release task state。
6. 创建 PR，等待 CI 和用户 approval；合并方式按仓库策略执行，默认 squash。跨包集成正确性由 CI 与 main 分支验证兜底（task 体系不再有 post-merge gate）。
7. 合并后验证 main CI；有版本变更时再验证 changesets version PR、批准、合并和 npm 发布链。
8. 两段验证通过后关闭 release task、删除 release branch/worktree，并关闭由本轮创建的 Herdr workspace；未完成验证不得清理证据。

CI 的机械性格式和拼写修复可以由 Manager 处理；逻辑、测试和契约问题回到原 task owner 修复。任何 release diff 变化都必须重新 freeze/review/approve。

release 聚合与集成验证由 Manager 直接协调，详见 [`herdr-agents`](../../.agents/skills/herdr-agents/SKILL.md)，不设独立 Integrator 层级。
