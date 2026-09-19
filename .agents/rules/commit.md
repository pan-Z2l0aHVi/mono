# Commit 约束

- 未经用户明确授权，不得暂存或提交变更；完成实施和验证后保持工作区变更可供用户 review。
- 获得授权后，先读取根目录 `commitlint.config.js` 与 [`docs/agents/commit.md`](../../docs/agents/commit.md)（不得以任何方式绕过 Git 检查，禁止清单见该文档）；AI 协作署名（Co-authored-by 尾注）规则见根目录 [`CONTRIBUTING.md`](../../CONTRIBUTING.md)。
- workflow task 的提交受 pre-commit 的 `pnpm task guard` 保护；若 guard 以 stale 拦截提交，重新 freeze 并重新 review/approve（freeze 与 pre-commit 的机制见 [`docs/agents/workflow.md`](../../docs/agents/workflow.md)）。
- commit message 必须使用英文，不得使用中文。
- 提交前用 `git config user.name` / `user.email` 确认实际 author/committer；不要假定本地 Git 配置与预期一致。
- 每个 PR 都需要 changeset；不影响包版本的变更使用空 changeset，触发条件与格式见 [`docs/agents/commit.md`](../../docs/agents/commit.md)。
