# Commit 约束

- 未经用户明确授权，不得暂存或提交变更；完成实施和验证后保持工作区变更可供用户 review。
- 获得授权后，先读取根目录 `commitlint.config.js` 与 [`docs/agents/commit.md`](../../docs/agents/commit.md)；AI 协作署名（Co-authored-by 尾注）规则见根目录 [`CONTRIBUTING.md`](../../CONTRIBUTING.md)。
- 不得使用 `--no-verify` 或 `--no-gpg-sign` 绕过 Git 检查。
- commit message 必须使用英文，不得使用中文。
- 提交前用 `git config user.name` / `user.email` 确认实际 author/committer；不要假定本地 Git 配置与预期一致。
