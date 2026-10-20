# 贡献指南

本文件面向贡献者，覆盖环境准备、开发、测试、代码质量与提交。Agent 的任务流程以 [`AGENTS.md`](./AGENTS.md) 为入口，不在此重复。工具链版本与命令面分别以 `.mise.toml`、根 `package.json` 和各包 README 为准。

## 起步

首次准备按顺序执行 `mise install`、`pnpm install`，再运行根 `package.json` 的 `build` 脚本。`mise install` 保证工具链与当前分支钉住的版本一致，且重复执行是幂等的；`build` 生成 workspace 包的 `dist` 类型产物，缺失时跨包类型检查会失败。

## 开发

开发入口与包级启动方式见根 `package.json` 的 `dev:` namespace 和各包 README；上游构建与编排约束见 [`docs/agents/build.md`](docs/agents/build.md)。

## 测试

全仓与单包测试入口以根 `package.json` 和 Turbo 配置为准；测试环境与命令选择见 [`docs/agents/verification.md`](docs/agents/verification.md)。

## 代码质量

检查与修复入口以根 `package.json` 为准；各工具的规则以自身配置为权威。

## 提交

使用 Conventional Commits，message 的类型、scope 与字数规则以 `commitlint.config.js` 为准。Agent 执行提交、推送或发布时需用户逐次授权，机制见 [`docs/agents/workflow.md`](docs/agents/workflow.md#怎么取得这个授权)，提交边界见 [`docs/agents/commit.md`](docs/agents/commit.md)。

每个 PR 至少带一个 changeset；选择方式见 [`docs/agents/release.md`](docs/agents/release.md#changesets)。
