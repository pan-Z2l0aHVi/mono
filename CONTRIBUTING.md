# 贡献与 Agent 工作流

本文件只负责把读者带到对应文档，不在这里重复实现细节。代码事实以源码、manifest、配置和测试为准。

## 先看什么

- **任务路由与不可绕过的边界**、Multi-Agent 分工：[`AGENTS.md`](AGENTS.md)
- **全局拓扑、workspace 清单、依赖草图、热点与包级约束**：[`ARCHITECTURE.md`](ARCHITECTURE.md)
- **跨包原则、领域术语与 ADR 索引**：[`CONTEXT.md`](CONTEXT.md)
- **开发与协作工作流（任务级别、状态机、预授权操作、review）**：[`docs/agents/workflow.md`](docs/agents/workflow.md)
- **多 Agent Role、handoff、Supervisor 与 Herdr 编排**：[`herdr-agents`](.agents/skills/herdr-agents/SKILL.md)（用户显式调用 `/herdr-agents` 时）
- **按需加载 context 的原则与最小 context 组合**：[`docs/agents/context.md`](docs/agents/context.md)
- **提交与 AI 协作署名**：[`docs/agents/commit.md`](docs/agents/commit.md)

进入 `apps/` 或 `packages/` 后，读取最近的包级 `AGENTS.md`（若存在）；如果没有，就看 `ARCHITECTURE.md`「包级约束」表中的对应行。

## 关键约定

- 只读调查可以按需加载 rule/guide；所有实施变更必须先按 [`docs/agents/workflow.md`](docs/agents/workflow.md) 的「任务级别」判定并建立 task，再实施。任务 gate 命令统一为 `pnpm task new --task <task-id> --level t0|t1|t2` 与 `pnpm task start --task <task-id>`；状态机与 review 要求以 workflow.md 为准，此处不复制。
- 对源码任务只加载命中的 rule/guide，避免把整个 instruction system 预加载进上下文。
- 变更影响分析使用仓库内查询工具（`find:usages` / `inspect:contract` / `diff:contract`）；语义与参数见 [`docs/agents/context.md`](docs/agents/context.md)，不要把这些工具的用法复制进本文件。
- UI、UX 或浏览器运行时改动须在真实浏览器验证，见 [`docs/agents/browser-verification.md`](docs/agents/browser-verification.md)。

## 交付前

交付说明要写清改动文件、影响的 workspace、验证命令及结果、workflow task id、当前 phase、未验证的风险，以及需要用户决定的事项。未经授权不要提交、暂存或重写 Git 历史。关闭任务前必须留下通过的验证记录。
