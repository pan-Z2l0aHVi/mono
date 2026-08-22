# Commit 约束

- 未经用户明确授权，不得暂存或提交变更；完成实施和验证后保持工作区变更可供用户 review。
- 获得授权后，先读取根目录 `commitlint.config.js` 与 [`docs/agents/commit.md`](../../docs/agents/commit.md)。
- 不得使用 `--no-verify` 或 `--no-gpg-sign` 绕过 Git 检查。
- commit message 必须使用英文，不得使用中文。
