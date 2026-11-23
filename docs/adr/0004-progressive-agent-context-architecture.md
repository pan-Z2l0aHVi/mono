# ADR-0004: 渐进式 Agent Context 架构

- **Date**: 2026-08-09
- **Status**: 已接受
- **Revised**: 2026-10-30，ADR 范围限定为技术选型、架构设计和工程化决策；文件引用统一使用链接，通过职责划分避免互指；2026-11-22，固化跨 Harness 适配边界（禁根 `CLAUDE.md` 与 `.claude/{rules,skills}` POSIX 相对软链）；2026-11-23，取消「每包必有 `AGENTS.md`」强制门禁，子包入口改为按真实信息增量按需建档。

## 背景

仓库包含入口、目录地图、规则、操作指南、ADR 和 skills。将所有细节放进入口会让每个任务加载无关内容，也会增加规则重复与漂移。

## 决策

按任务逐层加载 context：根 [`AGENTS.md`](../../AGENTS.md) 提供项目身份、仓库边界和任务路由；[`ARCHITECTURE.md`](../../ARCHITECTURE.md) 提供仓库地图；[`CONTEXT.md`](../../CONTEXT.md) 提供跨包原则与 ADR 索引；任务指南、包级 `AGENTS.md`、rules 和 skills 按影响范围加载。ADR、README、配置、源码和测试提供按需证据，当前行为以实现和验证为准。

每个主题只设一个权威来源，其余文档负责导航。跨应用的 UI 视觉原则由独立 task-specific 文档承载，并由根入口统一路由；应用与组件的局部入口只提供领域导航，不重复处方。新增 instruction 前先判断类型、测试、lint 或脚本能否更可靠地表达约束。ADR 只记录技术选型、架构设计和工程化决策及其取舍；具体实现细节由源码、测试或对应文档承载。

（2026-11-22 修订）跨 Harness 适配边界固定为两项结构约束：仓库根目录禁止放置 `CLAUDE.md`，因为 Claude Code 2.1.283+ 与 Codex 均原生支持 [`AGENTS.md`](../../AGENTS.md)，而根目录一旦存在 `CLAUDE.md` 会静默关闭其包级 `AGENTS.md` 按需注入；`.claude/rules` 与 `.claude/skills` 统一以 POSIX 相对软链分别指向 `../.agents/rules` 与 `../.agents/skills`，共享规范只维护单份实体目录，详情见 `agent-context.md`。

（2026-11-23 修订）取消「每个 workspace 必有 `AGENTS.md`」的强制门禁：包级与应用级 `AGENTS.md` 改为按真实信息增量按需建档——仅在存在无法从源码、类型、测试、`README.md` 或 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 推导的局部硬边界、易踩坑约定、专属验证口径或该包独有领域词汇时设置，不再为凑门禁产出空壳文件或复读根规则的段落；已存在的子包 `AGENTS.md` 继续接受 `check-context` 的链接与语料检查（准入口径见 `agent-context.md`）。

## 后果

- 简单任务只加载所需内容，复杂任务仍能沿路由找到依据。
- 路由与权威归属需要随仓库结构维护。Context 层级和同步规则以 agent-context.md 为准。
- 共享规则不按客户端复制；客户端配置只承担适配。

## 替代方案

扩充根入口会增加每次任务的 context 并加剧重复；只依赖 skills 或工具则无法表达项目事实与长期取舍。
