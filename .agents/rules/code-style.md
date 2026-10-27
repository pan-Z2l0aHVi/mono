# 代码与散文风格约束

本文件只保留不能从工具、类型或现有代码推导的约束。格式和 lint 细节见 [`docs/agents/lint-format.md`](../../docs/agents/lint-format.md)；当前实现以源码和配置为准。

- 错误处理和 fallback 必须保留出错原因，不能静默吞掉；公共 API 的 JSDoc 写清参数、返回值和副作用。
- 注释只写代码读不出来的信息：API 契约、设计意图、特殊逻辑、竞态与时序原因；删掉后代码仍能表达原意的注释不写。
- 注释与文档散文只陈述现状，不叙述被取代的旧实现、旧属性名与改动过程；指令面与参考语料的约定见 [`docs/agents/agent-context.md`](../../docs/agents/agent-context.md)，组件示例文档见所属包的 `AGENTS.md`。
