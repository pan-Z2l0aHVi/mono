# Commit 约束

提交格式、署名与 pre-commit checks 的完整规则以 [`docs/agents/commit.md`](../../docs/agents/commit.md) 为权威，本文件只列硬约束。

- 改变仓库历史、分支、远端或发布状态需用户逐次明确授权；边界与取得方式见 [`workflow.md`](../../docs/agents/workflow.md#预授权操作)。
- 不得绕过 Git hooks 或签名检查；禁止清单见 [`commit.md`](../../docs/agents/commit.md#pre-commit-与本地-checks)。
- commit 署名使用执行体的官方身份，不得推造邮箱、冒用其他 agent 或改写 Git 配置；细则见 [`commit.md`](../../docs/agents/commit.md#message-与署名)。
- pre-commit 只读，不读取台账状态，不修复、不暂存；检查集合见 [`commit.md`](../../docs/agents/commit.md#pre-commit-与本地-checks)。
- 修复命令不会自动暂存，提交前只暂存预期文件；规则见 [`commit.md`](../../docs/agents/commit.md#pre-commit-与本地-checks)。
- changeset gate 只由 PR CI 按 base/head 执行；本地台账与政策检查不构成 CI 或 PR review 结论。
