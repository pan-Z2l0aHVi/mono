---
name: contract-change-review
description: 审查公共 API、exports、事件、类型适配和跨包运行时契约的影响面。用于已发布 package 的公共行为或跨 workspace 变更；不用于单包内部实现。
---

# Contract Change Review

## 何时加载与事实来源

当 diff 涉及公开导出、组件属性/事件、React/Vue 类型适配、peer dependency、`files`、`sideEffects`，或会被其他 workspace 观察到的运行时行为时加载本 skill。单包内部重构、未导出的 helper 或没有消费者可见变化时不要加载。

当前源码、workspace manifest、构建配置、消费者和测试是行为事实；README、ADR 和本 skill 解释意图与历史取舍，不能替代实际验证。未确认 package 是否发布或是否有消费者时，先查询而不是猜测。

## 流程

1. 先对改动路径运行：

   ```sh
   pnpm find:usages -- <paths...>
   ```

   在 review 或变更集审查中，按范围改用 `--base <git-ref>`、`--staged` 或 `--worktree`。以输出的 workspace、风险、required evidence 和验证建议作为后续工作的起点。

2. 若直接受影响的是已发布的 `@greypan/*` package，运行：

   ```sh
   pnpm inspect:contract -- <published-package>
   ```

   用报告确认当前 `exports`、`peerDependencies`、`sideEffects`、直接消费者和最小验证；私有 app 不把它当作 npm package contract。

3. 从 diff 与命令输出定位导出、属性、事件、类型、workspace 引用和运行时边界。读取受影响包的 `AGENTS.md`、README、manifest、测试和相关 ADR；只有跨包或架构问题才加载 `CONTEXT.md`。

4. 搜索 React、Vue、Wails demo 及其他直接消费者，逐项给出兼容结论。检查测试是否通过公共 API 验证行为，而不是只覆盖内部实现；浏览器、生成物和 framework adapter 风险按 `find:usages` 输出补足证据。

5. 按风险执行验证，不把所有 release 命令机械地用于每次变更：

   - 跨包导出、引用或运行时契约：运行 `pnpm run test`。
   - 可发布 package 的源码入口、构建产物、`exports`、`files`、类型入口或 `sideEffects`：先运行 `pnpm run build`，再运行 `pnpm run check:pack`。
   - 需要比较 Git 基线中的 manifest-level semver 候选，或进行 PR/release 审查：运行 `pnpm diff:contract -- --base <git-ref>`。
   - UI、交互或浏览器运行时：按 `docs/agents/browser-verification.md` 在 chrome-devtools MCP 中验证；`pnpm run test` 中的 browser-mode 测试不能替代真实集成验证。

6. 输出影响面、消费者兼容结论、必须同步的资料、实际执行的验证及未覆盖风险。发现破坏性候选时先提出兼容方案或明确升级路径，不擅自扩大实现范围。

## 完成定义

- 已运行并审阅 `find:usages`；每个受影响公共表面都有明确的兼容结论。
- 涉及已发布 package 时，`inspect:contract` 的消费者结论可追溯；涉及 Git 基线 semver 审查时，附上 `diff:contract` 结果或说明其不适用。
- 涉及发布产物边界时，`pnpm run build` 与 `pnpm run check:pack` 均有结果，或明确记录无法执行的原因。
- 导出、类型、README、消费者适配和测试的同步状态可追溯；跨包变更有根级验证结果，或明确记录未验证缺口。
