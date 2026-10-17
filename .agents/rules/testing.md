# 测试约束

测试用例该写什么以 [`docs/agents/test-authoring.md`](../../docs/agents/test-authoring.md) 为准；验证流程、层级与最小验证选择以 [`docs/agents/verification.md`](../../docs/agents/verification.md) 为准，浏览器取证以 [`docs/agents/runtime-verification.md`](../../docs/agents/runtime-verification.md) 为准。本文件只列权威文档没有的硬约束。

- 不要用裸 `pnpm --filter @greypan/<name> test|build` 做验证或构建：它可能读到残缺的 `dist`；一律走 `pnpm exec turbo test|build --filter=@greypan/<name>`。
