---
name: monorepo-change-impact
description: 计算 monorepo 变更的影响面、消费者与所需验证，审查公共 API、exports、事件、类型适配和跨包运行时契约。用于已发布 package 的公共行为、跨 workspace 变更或验证范围选择；不用于单包内部实现。
---

# Monorepo Change Impact

## 何时加载与事实来源

当 diff 涉及公开导出、组件属性/事件、框架类型适配、peer dependency、`files`、`sideEffects`，或会被其他 workspace 观察到的运行时行为时加载本 skill。单包内部重构、未导出的 helper 或没有消费者可见变化时不要加载。

当前源码、workspace manifest、构建配置、消费者和测试是行为事实；README、ADR 和本 skill 解释意图与历史取舍，不能替代实际验证。未确认 package 是否发布或是否有消费者时，先查询而不是猜测。

## 内置查询脚本

本 skill 自带 self-contained 的查询脚本（只依赖 Node 内置模块），workspace 图从宿主仓库的 `pnpm-workspace.yaml` 与各 `package.json` 派生：内部依赖 = 依赖名命中 workspace 名集合，可发布 = manifest 未标 `private`。不需要宿主仓库提供任何配套命令；脚本里标记 host policy 的段落（context 路径、专项风险与验证目录）按宿主仓库约定调整。

在仓库根运行，三个子命令：

```sh
node skills/monorepo-change-impact/repo-query.mjs verify [--json] [--base <git-ref> | --staged | --worktree] <changed-path>...
node skills/monorepo-change-impact/repo-query.mjs contract [--json] <published-package>
node skills/monorepo-change-impact/repo-query.mjs contract-diff --json --base <git-ref>
```

manifest 图以工作区内容为准，并会从 Git 索引补读稀疏检出隐藏的 manifest，因此 manifest 级影响面不要求全树检出。package 内的源文件与跨包引用不在该图里，仍要搜索完整索引（如 `git grep <pattern> HEAD`），不能只看已检出的文件或子包文档。

## 流程

1. 先对改动路径运行 `verify`。在 review 或变更集审查中，按范围改用 `--base <git-ref>`、`--staged` 或 `--worktree`。以输出的 workspace、风险、required evidence 和验证建议作为后续工作的起点。

2. 若直接受影响的是已发布的 package，运行 `contract`。用报告确认当前 `exports`、`peerDependencies`、`sideEffects`、直接消费者和最小验证；私有 app 不把它当作 npm package contract。

3. 从 diff 与命令输出定位导出、属性、事件、类型、workspace 引用和运行时边界。读取受影响包的 `AGENTS.md`、README、manifest、测试和相关 ADR；只有跨包或架构问题才加载宿主仓库的领域 context。

4. 搜索框架 demo 及其他直接消费者，逐项给出兼容结论。检查测试是否通过公共 API 验证行为，而不是只覆盖内部实现；浏览器、生成物和 framework adapter 风险按 `verify` 输出补足证据。

5. 按风险执行验证，不把所有 release 命令机械地用于每次变更：

   - 跨包导出、引用或运行时契约：运行宿主仓库的全量测试。
   - 可发布 package 的源码入口、构建产物、`exports`、`files`、类型入口或 `sideEffects`：先全量构建，再运行宿主仓库的发布产物校验（如 `check-pack`）。
   - 需要比较 Git 基线中的 manifest-level semver 候选，或进行 PR/release 审查：运行 `contract-diff`。
   - UI、交互或浏览器运行时：按宿主仓库的浏览器验证指南在真实浏览器中验证；jsdom 或 build 通过不能替代真实集成验证。

6. 输出影响面、消费者兼容结论、必须同步的资料、实际执行的验证及未覆盖风险。发现破坏性候选时先提出兼容方案或明确升级路径，不擅自扩大实现范围；semver 决策记录进宿主仓库的 changeset（含 breaking 候选时 bump 须为 major/minor，正文写明理由）。

## 完成定义

- 已运行并审阅 `verify`；每个受影响公共表面都有明确的兼容结论。
- 涉及已发布 package 时，`contract` 的消费者结论可追溯；涉及 Git 基线 semver 审查时，附上 `contract-diff` 结果或说明其不适用。
- 涉及发布产物边界时，全量构建与发布产物校验均有结果，或明确记录无法执行的原因。
- 导出、类型、README、消费者适配和测试的同步状态可追溯；跨包变更有根级验证结果，或明确记录未验证缺口。
