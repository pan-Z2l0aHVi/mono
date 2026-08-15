# 贡献与 Agent 工作流

本文件是仓库协作流程的短入口；代码事实以源码、manifest、配置和测试为准。详细规则按根 `AGENTS.md` 的任务路由按需加载。

## 开始前

1. 查看 `git status --short --branch`，不要覆盖已有工作区变更。
2. 阅读 `AGENTS.md`；进入 `apps/` 或 `packages/` 后再阅读最近的包级 `AGENTS.md`。
3. 需要全局拓扑时阅读 [`ARCHITECTURE.md`](ARCHITECTURE.md)；需要跨包原则、术语或 ADR 时再阅读 [`CONTEXT.md`](CONTEXT.md)。
4. 对源码任务只加载命中的 rule/guide，避免把整个 instruction system 预加载进上下文；需要快速建立全局模型时优先看 `ARCHITECTURE.md`，不要默认加载全部 ADR。
5. 对含有多个可观察阶段的任务，在 ACP 提供计划界面时创建并维护 plan；每完成分析、实施、验证或已获授权的提交阶段，立即同步其状态。最终答复前必须将已完成步骤标为 `completed`，避免客户端显示过期的“执行中”状态。plan 仅反映当前会话进度，不替代 Git、源码或验证证据，也不写入持久化 `agent-state`。

## 定位和影响分析

- 先从目标 workspace 的 `package.json`、`src/`、测试和 README 定位。
- 变更路径明确后使用 `pnpm find:usages -- <paths...>`，获取受影响 workspace、所需证据和最小充分验证建议。
- 修改已发布 package 的 exports、类型或运行时契约时，使用 `pnpm inspect:contract -- <package-name>`；比较基线时使用 `pnpm diff:contract -- --base <git-ref>`。
- 不把 `dist/`、`.turbo/`、生成 bindings、route tree 或测试附件当作源码入口。

## 变更分级

- **局部实现**：按目标包规则做聚焦测试或静态检查。
- **公共行为/导出/跨包引用**：读取 `docs/agents/testing.md`，添加公共 API 测试，并在根目录运行相应的全局验证。
- **构建、发布、配置或依赖**：读取对应 `docs/agents/*.md`，同时检查 manifest、Turbo、CI 和 Changesets。
- **UI、交互或浏览器运行时**：读取 `docs/agents/browser-verification.md`；真实浏览器验证不能由 jsdom 或构建替代。
- **架构或 instruction system**：更新相关 ADR/索引，并运行 `pnpm validate:context`。

## AI 协作署名

- 仅当 AI agent 对某项变更有实质贡献时，才在对应提交中添加共同作者尾注；不要为展示署名创建空提交或伪造身份。
- Codex 参与时使用以下固定格式；Claude Code 等其他 agent 也应使用相同的 Git trailers 机制进行透明署名：

  ```text
  Co-authored-by: Codex <noreply@openai.com>
  ```

- 人类提交者仍对需求、设计、审查、测试和最终合并承担全部责任。
- 共同作者尾注用于公开记录协作；GitHub 是否将其显示为独立 Contributors 条目取决于该邮箱能否被 GitHub 识别和归属。

## 交付前

报告：改动文件、影响 workspace、验证命令及结果、未验证的风险和需要用户决定的事项。未经授权不要提交、暂存或重写 Git 历史。
