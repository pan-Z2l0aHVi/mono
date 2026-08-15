# Mono Agent Entry

本文件是 Claude Code 的薄适配入口；仓库规范的权威来源仍是根 `AGENTS.md`、`CONTEXT.md`、`docs/agents/`、`.agents/rules/`、源码、配置和测试。

## 加载顺序

- 需要仓库地图时先读 [`ARCHITECTURE.md`](ARCHITECTURE.md)；不要将它当作实现事实或逐项操作手册。

1. 先读取根 [`AGENTS.md`](AGENTS.md)，确认项目身份、不可绕过边界和任务路由。
2. 仅按任务路由读取相关的 `docs/agents/*.md`、`.agents/rules/*.md` 和最近的包级 `AGENTS.md`。
3. 只有跨包、架构、术语或 instruction system 任务才读取 [`CONTEXT.md`](CONTEXT.md) 与相关 ADR。
4. Claude 专属的 agent、hook 和 settings 只提供工具适配，不得复制或覆盖共享规范。

当前实现事实以源码、manifest、配置和测试为准。
