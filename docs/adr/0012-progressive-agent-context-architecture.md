# ADR-0012: 渐进式 Agent Context 架构

- **Date**: 2026-08-09
- **Status**: 已接受

## 背景

仓库同时包含根 `AGENTS.md`、包级 `AGENTS.md`、rules、操作指南、ADR、skills 和工具配置。若把它们的细节都放入根入口，agent 会在简单局部任务中预加载无关信息；同一约束在多个文件复述后，也会增加冲突和过期风险。

项目仍需要让新 agent 快速获取项目身份、不可绕过的安全边界、包关系和长期设计决策，同时让 UI、测试、发布等任务可获得足够深度的专门 context。

## 决策

采用四层、按任务展开的 agent context 架构：

1. **Always available**：根 `AGENTS.md` 只保留项目身份、不可绕过的仓库约束和 task routing；根 `CLAUDE.md` 只作为 Claude Code 的薄适配入口，指向共享规范而不复制其正文。
2. **Project context**：`CONTEXT.md` 记录跨包边界、依赖方向、核心工程原则和 ADR 索引。只在架构、跨包、术语或长期设计取舍相关任务中加载。
3. **Task-specific context**：`docs/agents/*.md`、`.agents/rules/*.md` 和最近的包级 `AGENTS.md` 承载按领域执行的流程与局部约束。包级文件不复制根规则。
4. **On-demand evidence**：相关 ADR、README、manifest、配置、源码和测试在影响范围确定后加载；当前实现和可执行验证优先于文字说明。

`docs/agents/context.md` 是本架构的路由、文档同步映射和维护准则的权威来源。它还定义 planning、implementation、review、verification 和 release/workflow 阶段分别需要的最小 context。

新增 instruction、rule、skill 提示或 hook 之前，必须先判断代码边界、类型、测试、lint 或脚本能否更可靠地表达该约束。只有无法自动验证、且确实影响工程选择的约束才写入 instruction system。

## 后果

- 根入口从详细操作手册收敛为稳定导航层，局部任务的初始 context 更小。
- `docs/agents/web-ui.md` 只负责把 `web-ui` 任务路由到对应 ADR；组件契约和框架事件边界仍以 ADR-0003/0007/0011 为准。`docs/agents/build.md` 只承载部署与 release workflow，release plane 术语以 ADR-0009 为准，避免污染通用 project context。
- 文档同步要求集中在 `docs/agents/context.md`，减少根入口与 task guide 的重复；影响未来取舍的变更仍需 ADR，并更新 `CONTEXT.md` 索引。
- Agent 需要遵循路由选择 context，而不是把“读完所有文档”视为完成探索。缺少所需证据时，应回到 manifest、配置、源码、测试或相关 ADR。
- 双客户端共享的实施、review、验证和 worktree 隔离协议见 `docs/agents/agent-workflow.md`；新增评测基线与 client harness 的长期取舍见 ADR-0013。

## 替代方案

- **继续扩充根 `AGENTS.md`**：简单直接，但会使每个任务承担无关上下文，并加剧重复和冲突；不采用。
- **为每个 package 新建完整 `CONTEXT.md`**：只有当包拥有独立领域、复杂边界和长期 ADR 时才有价值。当前 package 规模下会制造维护面；暂不采用。
- **仅依赖 skills 或 MCP tools**：工具能力不能表达仓库当前事实、包边界或工程决策；不采用。
