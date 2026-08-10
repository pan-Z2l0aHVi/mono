---
name: context-audit
description: 审计仓库 instruction system 的加载路径、重复约束、权威来源和验证缺口。用于修改 AGENTS.md、CLAUDE.md、rules、skills、agent profiles 或 hooks；不用于普通源码任务。
---

# Context Audit

## 流程

1. 读取根 `AGENTS.md`、`docs/agents/context.md`、`CONTEXT.md` 和当前 diff。
2. 按任务目录列出最近的 `AGENTS.md`、命中的 guide/rule、skills、agent profile 和工具配置。
3. 为每条规则记录：加载条件、权威来源、自动验证方式、重复/冲突和删除风险。
4. 优先删除重复或可由代码/测试/配置表达的内容；新增文字必须说明何时加载、事实来源和违反风险。
5. 运行 `pnpm check:context` 检查 symlink、路径、frontmatter 和 ADR 索引；再按一个代表性任务人工复核 context 路由效果，不以文档总字数作为质量指标。

## 输出

报告 context 层级、重复项、冲突项、建议变更、验证命令和仍需人工决策的长期取舍。不要在审计 skill 中直接改写用户的业务源码。
