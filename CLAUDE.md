# Mono Agent Entry

本文件是 Claude Code 的薄适配入口；仓库规范的权威来源仍是根 `AGENTS.md`、`CONTEXT.md`、`docs/agents/`、`.agents/rules/`、源码、配置和测试。

## 加载顺序

- 需要仓库地图时先读 [`ARCHITECTURE.md`](ARCHITECTURE.md)；不要将它当作实现事实或逐项操作手册。

1. 先读取根 [`AGENTS.md`](AGENTS.md)，确认项目身份、不可绕过边界、任务路由和「多 Agent 编排」约定的角色分工。
2. 仅按任务路由读取相关的 `docs/agents/*.md`、`.agents/rules/*.md` 和最近的包级 `AGENTS.md`。
3. 只有跨包、架构、术语或 instruction system 任务才读取 [`CONTEXT.md`](CONTEXT.md) 与相关 ADR。
4. Claude 专属的 agent、hook 和 settings 只提供工具适配，不得复制或覆盖共享规范。

## Claude Code 的角色绑定

多 Agent 编排的流程权威是根 [`AGENTS.md`](AGENTS.md) 的「多 Agent 编排」节和 [`docs/agents/workflow.md`](docs/agents/workflow.md)；Claude Code 在本仓库固定承担以下角色，角色契约见 [`.agents/agents/`](.agents/agents/)：

- **Manager**：统一接收需求，扁平编排，负责任务分解、依赖管理、并行派发、Review 闭环与最终总结。
- **Designer**：仅当 Manager 判定需求涉及产品设计/UI 时启用。
- **Lib Coder**：只修改 `packages/*`；不触碰 `apps/*`。
- **Reviewer 二次审查**：跨 workspace、公共 API/exports、UI 行为、构建/release 或高风险迁移时，在主审之后追加。

`Biz Coder` 与 `Reviewer` 主审由 Codex CLI 承担。角色之间统一使用结构化 handoff（目标、范围、验收标准、测试命令、未解决决策），模板以 [`docs/agents/task-packet.md`](docs/agents/task-packet.md) 为权威。

当前实现事实以源码、manifest、配置和测试为准。
