# Commit 约束

提交格式、署名与 pre-commit checks 的完整规则以 [`docs/agents/commit.md`](../../docs/agents/commit.md) 为权威，本文件只列硬约束。

- 未经用户明确授权，不得提交；授权机制见 [`workflow.md`](../../docs/agents/workflow.md#怎么取得这个授权)。完成实施和验证后保持工作区变更可供用户 review。
- 不得绕过 Git hooks 或签名检查，禁止清单见 [`docs/agents/commit.md`](../../docs/agents/commit.md)。
- 由 agent 创建 commit 时，author 与 committer 使用实际执行体的官方名称和邮箱，以该 agent 的官方文档或客户端明确提供的署名为准；不得从产品名或模型名推造邮箱，也不得冒用其他 agent 的署名，用户显式指定身份时优先遵循。人类 author 保持本人身份；`Co-authored-by` 只记录实际参与 agent 的官方署名。不要改写 Git 配置来实现署名。
- `.vite-hooks/pre-commit` 调用 `mise exec -- pnpm ci:check-policies`，只运行 task 无关的只读 checks，不读取登记簿或 `AGENT_TASK_*`。
- `fix-code` 必须由实施者显式运行；检查和修复都不会自动暂存文件，提交前只暂存预期文件。
- `changeset-required` 只由 PR CI 按 base/head commit 执行；本地台账与政策检查都不代表 CI 或 PR review 结论。
