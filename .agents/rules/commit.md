# Commit 约束

提交格式、署名与 pre-commit checks 的完整规则以 [`docs/agents/commit.md`](../../docs/agents/commit.md) 为权威，本文件只列硬约束。

- commit、push、merge、tag、publish、release 都需要用户逐次明确授权；完成实施和验证后保持工作区变更可供 review。授权机制见 [`workflow.md`](../../docs/agents/workflow.md#怎么取得这个授权)。
- 不得绕过 Git hooks 或签名检查；禁止清单见权威文档。
- agent 创建的 commit 使用该执行体的官方署名；不得推造邮箱、冒用其他 agent；用户显式指定身份时优先遵循，不得改写 Git 配置来实现署名。
- pre-commit 只运行 task 无关的只读政策检查，不读取登记簿状态，不修复、不暂存。
- 修复命令不会自动暂存；提交前只暂存预期文件。
- changeset gate 只由 PR CI 按 base/head 执行；本地台账与政策检查不构成 CI 或 PR review 结论。
