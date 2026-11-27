# 贡献指南

本文件面向贡献者，覆盖环境准备、开发、测试与提交。Agent 流程以 [`AGENTS.md`](./AGENTS.md) 为入口；工具链版本与命令面以 `.mise.toml`、根 `package.json` 和各包 README 为准。

## 起步

首次准备按顺序执行 `mise install`、`pnpm install`、`pnpm run build`（生成跨包类型依赖产物 `dist/`）。环境与缓存细节见 [`docs/agents/environment.md`](docs/agents/environment.md)。

## 开发与测试

- 开发入口见根 `package.json` 的 `dev:` namespace 与各包 README；构建约束见 [`docs/agents/build.md`](docs/agents/build.md)。
- 测试与推送前全量检查见 [`docs/agents/verification.md`](docs/agents/verification.md)。
- Lint 与格式化入口为根 `package.json` 的 `check-code` / `fix-code`。

## 提交与 Changeset

使用 Conventional Commits，规则以 `commitlint.config.js` 为准。Agent 授权边界、提交脚本与 PR 自动跟进见 [`docs/agents/workflow.md`](docs/agents/workflow.md#授权边界与-pr-自动跟进)。

每个 PR 至少带一个 changeset，规则见 [`docs/agents/release.md`](docs/agents/release.md#changesets)。
