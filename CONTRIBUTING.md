# 贡献与 Agent 工作流

本文件是仓库协作流程的短入口；代码事实以源码、manifest、配置和测试为准。详细规则按根 `AGENTS.md` 的任务路由按需加载。

## 开始前

1. 查看 `git status --short --branch`，不要覆盖已有工作区变更。
2. 阅读 `AGENTS.md`；进入 `apps/` 或 `packages/` 后再阅读最近的包级 `AGENTS.md`。
3. 需要全局拓扑时阅读 [`ARCHITECTURE.md`](ARCHITECTURE.md)；需要跨包原则、术语或 ADR 时再阅读 [`CONTEXT.md`](CONTEXT.md)。
4. 对源码任务只加载命中的 rule/guide，避免把整个 instruction system 预加载进上下文；需要快速建立全局模型时优先看 `ARCHITECTURE.md`，不要默认加载全部 ADR。

## 定位和影响分析

- 先从目标 workspace 的 `package.json`、`src/`、测试和 README 定位。
- 变更路径明确后使用 `pnpm repo:verify -- <paths...>`，获取受影响 workspace、所需证据和最小充分验证建议。
- 修改已发布 package 的 exports、类型或运行时契约时，使用 `pnpm repo:contract -- <package-name>`；比较基线时使用 `pnpm repo:contract-diff -- --base <git-ref>`。
- 不把 `dist/`、`.turbo/`、生成 bindings、route tree 或测试附件当作源码入口。

## 变更分级

- **局部实现**：按目标包规则做聚焦测试或静态检查。
- **公共行为/导出/跨包引用**：读取 `docs/agents/testing.md`，添加公共 API 测试，并在根目录运行相应的全局验证。
- **构建、发布、配置或依赖**：读取对应 `docs/agents/*.md`，同时检查 manifest、Turbo、CI 和 Changesets。
- **UI、交互或浏览器运行时**：读取 `docs/agents/browser-verification.md`；真实浏览器验证不能由 jsdom 或构建替代。
- **架构或 instruction system**：更新相关 ADR/索引，并运行 `pnpm check:context`。

## 交付前

报告：改动文件、影响 workspace、验证命令及结果、未验证的风险和需要用户决定的事项。未经授权不要提交、暂存或重写 Git 历史。
