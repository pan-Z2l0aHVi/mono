# 测试约束

测试用例该写什么以 [`docs/agents/test-authoring.md`](../../docs/agents/test-authoring.md) 为准；验证流程、层级与最小验证选择以 [`docs/agents/verification.md`](../../docs/agents/verification.md) 为准，浏览器取证以 [`docs/agents/runtime-verification.md`](../../docs/agents/runtime-verification.md) 为准。本文件只列权威文档没有的硬约束。

- 验证与构建必须包含受影响包的上游依赖产物；绕过仓库编排直接调用单包脚本可能读到残缺的 `dist`，不算有效验证。
