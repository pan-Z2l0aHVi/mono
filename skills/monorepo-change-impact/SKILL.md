---
name: monorepo-change-impact
description: 改动公开导出、组件属性/事件、框架类型适配、peerDependency 或跨 workspace 运行时契约时调用：用内置脚本计算影响面、消费者与验证范围。
---

# Monorepo Change Impact

仅当 diff 影响公共契约或跨 workspace 可观察行为时加载；单包内部重构跳过。

## 内置查询脚本

在仓库根运行（自包含，仅依赖 Node 内置模块；稀疏态可补读 Git 索引 manifest，但跨包源码检索仍须用 `git grep <pattern> HEAD`）：

```sh
node .agents/skills/monorepo-change-impact/repo-query.mjs verify [--json] [--base <git-ref> | --staged | --worktree] <changed-path>...
node .agents/skills/monorepo-change-impact/repo-query.mjs contract [--json] <published-package>
node .agents/skills/monorepo-change-impact/repo-query.mjs contract-diff [--json] --base <git-ref>
```

## 执行要点

1. 运行 `verify` 获取受影响 workspace、风险与建议验证；涉及已发布包时再跑 `contract` 确认 `exports`/`peerDependencies`/`sideEffects` 与直接消费者。
2. 逐项核对直接消费者与框架 demo 兼容性，同步导出、类型、README、文档与测试；semver 审查或 PR/release 核对时运行 `contract-diff`，命中 `deterministicBreaking` 时必须采用 `major`，命中 `heuristicReview` 时核对兼容性并在 changeset 中写明对应 bump 理由。
3. 按风险执行对应层级的验证（含 `check-pack`、跨包测试或浏览器集成），不以 jsdom 或 build 替代真实集成验证；交付时列明实际影响面、兼容结论、验证结果与未覆盖缺口。
