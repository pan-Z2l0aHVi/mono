# ADR-0013: 双客户端 Agent Harness 与最小评测基线

- **Date**: 2026-08-10
- **Status**: 已接受

## 背景

仓库已采用渐进式 context 架构，但根 `CLAUDE.md` 与 `AGENTS.md` 复制相同内容，客户端适配、实施/审查/验证工作流和并行工作区隔离没有统一的权威协议。重复入口会漂移；仅依赖文字规则又无法证明 agent 是否加载了正确 context、遵守了范围和完成了正确验证。

仓库需要同时支持 Codex 与 Claude Code，同时避免为两个客户端维护两套工程规范。当前规模也不需要建设自动化 agent benchmark 平台，但需要一个足够小、可复核的真实任务集来校准 instruction system。

## 决策

1. `AGENTS.md`、`CONTEXT.md`、`docs/agents/`、`.agents/rules/`、`.agents/skills/` 与 `.agents/agents/` 是客户端中立的共享规范。Codex 使用层级 `AGENTS.md`；根 `CLAUDE.md` 保持为薄适配入口，只说明读取顺序与共享资料位置。
2. `docs/agents/agent-workflow.md` 定义共享任务协议：探索、计划、实现、独立审查、分层验证、交付证据，以及并行 agent 必须使用独立 branch/worktree 的要求。
3. 需要独立审查时使用 `.agents/agents/reviewer.md` 的契约。reviewer 不修改同一变更，实施者不得担任该变更的最终 reviewer。
4. 高风险、可复用的流程以按需加载 skill 表达；不为普通任务增加 always-loaded instruction。
5. 在 `docs/agents/evals/tasks/` 维护 8 个固定 baseline/fixture/oracle 任务；在 `docs/agents/evals/runs/` 使用模板记录 client、context、命令、review evidence 和逐项评分。第一阶段不引入自动化 agent 执行或趋势平台，但任务和评分必须可复核。
6. `scripts/context-check.mjs` 检查 client adapter、symlink、Markdown 路径、skill/profile frontmatter 和 ADR 索引；`scripts/agent-review-check.mjs` 检查独立 worktree、身份和实现快照绑定。

## 后果

- Codex 与 Claude Code 共享同一事实来源，降低规则漂移风险。
- 根入口保持轻量；工作协议、reviewer 和 skills 只在任务需要时加载。
- 并行开发通过 worktree 隔离，避免 agent 为切换任务而破坏其他 agent 的未提交工作。
- eval 只能校准 harness，不能替代产品测试、真实浏览器验证或 CI；没有运行记录就不能声称形成 baseline。
- review profile 本身不是执行闭环；review evidence 与只读检查脚本共同构成最低闭环，无法执行时必须显式标记 `not executed`。

## 替代方案

- **持续复制完整 `AGENTS.md` 到 `CLAUDE.md`**：客户端上手简单，但规则一定会漂移；不采用。
- **为 Codex 和 Claude Code 分别维护独立 rules、skills、agents**：可做深度定制，但维护面和冲突风险过高；不采用。
- **立即建设自动化 benchmark 平台**：可量化程度更高，但在任务集尚未稳定时投入过大；暂不采用。
