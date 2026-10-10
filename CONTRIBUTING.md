# 贡献指南

本文件面向贡献者，覆盖安装、构建、测试与提交。Agent 的任务流程以 [`AGENTS.md`](AGENTS.md) 为入口，不在此重复。代码事实以源码、manifest、配置和测试为准。

## 起步

需要 Node.js（>=24.18.0）和 pnpm（>=12.4.0）。工具链版本由 `.mise.toml` 钉住：

```sh
mise install
pnpm install
pnpm run build
```

三步都不能省。`mise install` 排在第一位，因为不同分支可能钉的工具链版本不同；它本身幂等，装过就是一次快速 no-op。`pnpm run build` 生成 workspace 包的 `dist` 类型产物，没有它 `vp check` 会把每个跨包 import 报成假 `TS2307`。

## 开发

根 `package.json` 提供三个 dev 入口：

| 命令                         | 启动                         |
| ---------------------------- | ---------------------------- |
| `pnpm dev:react-web-ui-demo` | React demo                   |
| `pnpm dev:vue-web-ui-demo`   | Vue demo                     |
| `pnpm dev:interweave`        | Interweave（Wails 桌面应用） |

各包的 dev 命令见包级 README。

## 测试

```sh
pnpm run test                                # 全仓测试
pnpm exec turbo test --filter=@greypan/<name> # 单包测试
```

测试环境与命令选择见 [`docs/agents/test-execution.md`](docs/agents/test-execution.md)。

## 代码质量

```sh
pnpm run check-code    # 检查：拼写 + lint + 类型 + Go + stylelint
pnpm run fix-code      # 修复：自动修复 lint 与格式
```

## 提交

使用 Conventional Commits 格式，英文 message：

```sh
pnpm commit
```

prompt 的 scope 列出 `root` 与各包名（`web-ui`、`js-kit` 等），支持多选。需要清单外的名字时选「自定义输入 scope」再输入。

每个 PR 至少带一个 changeset。涉及发布包行为的变更写明 patch/minor/major；纯 docs/test/chore 的变更创建空 changeset（只含两行 `---`）。细则见 [`docs/agents/commit.md`](docs/agents/commit.md)。
