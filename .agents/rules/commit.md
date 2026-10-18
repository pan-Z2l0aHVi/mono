# Commit 约束

提交格式与 AI 署名的完整规则以 [`docs/agents/commit.md`](../../docs/agents/commit.md) 为权威，本文件只列提交边界上的硬约束。

- 未经用户明确授权，不得提交；授权机制见 [`workflow.md`](../../docs/agents/workflow.md#怎么取得这个授权)。完成实施和验证后保持工作区变更可供用户 review。
- 不得绕过 Git hooks 或签名检查，禁止清单见 [`docs/agents/commit.md`](../../docs/agents/commit.md)。
- 提交前用 `git config user.name` / `user.email` 确认实际 author/committer；不要假定本地 Git 配置与预期一致。
- workflow task 的提交受 pre-commit 的 `pnpm agent:task guard` 保护；guard 因冻结快照过期拦截提交时，按 [`docs/agents/workflow.md`](../../docs/agents/workflow.md) 重新 freeze 并补齐该级别要求的 review/approve。
- pre-commit 的检查只判不改：`format-clean` 查格式，`vp check` 连 lint 与类型一起判。提交前自己跑过检查再暂存，光跑 fixer 不够。
