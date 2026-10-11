# Agent Context 维护约束

context 分层、权威归属、客户端适配与新增门槛都以 [`docs/agents/agent-context.md`](../../docs/agents/agent-context.md) 为准。本文件只写它没有的硬约束。

- 分层、权威归属或职责划分变化时，在对应 ADR（[ADR-0004](../../docs/adr/0004-progressive-agent-context-architecture.md)）加带日期的修订注记，不静默改写已落纸的决策正文。
- 新增 `.agents/` 下的任何文件后，必须在根 `AGENTS.md` 的 task routing 或对应文档建立加载路径；没有加载路径的文件等于死内容，不会被任何客户端读到。
