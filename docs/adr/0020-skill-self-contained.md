# ADR-0020: 自撰 skill 保持运行时自包含

- **Date**: 2026-11-04
- **Status**: 已接受

## 背景

2026-11 的架构 review 发现 `.agents/skills/turbo-sparse-scope/sparse-scope.mjs` 与 `packages/monorepo-kit`（`src/workspace/workspace.ts`）各自维护一份 `pnpm-workspace.yaml` 容器目录推导，外加 cone-path 归一与排序比较的纯函数重复。两个推导的语义存在可分歧点：字面量条目（如 `tools/cli`）在 kit 只认含 glob 的模式（不产生容器），在 sparse-scope 取除末段外前缀（容器为 `tools`）。当时的提议是把解析收敛到 monorepo-kit 一处，sparse-scope 经安装后的包 import 消费。

## 决策

不统一。自撰 skill（经 GitHub 分发、实体自包含的 `.mjs` + 自带测试）保持运行时零 workspace 包依赖：

- skill 的可用性不绑定「`@greypan/monorepo-kit` 已构建（`vp pack` 出 `dist/`）且已安装」；
- skill 的版本演进与包发布解耦，改 skill 不需要等包发版；
- 接受跨实体的少量重复（~40 行纯函数）作为隔离的代价。

task-ledger 自带的 `parseArgs` / `compareText` / `normalizeScopePath` 同理不动——ADR-0015 已要求它 repo-agnostic、scope 路径只存储不解释。

## 后果

- 「什么算容器目录」在仓内有两个权威答案，且分歧是静默的（没有测试或门禁会发现）。
- 若未来该分歧成为真实 bug，升级路径是 parity 测试：在 sparse-scope 自己的测试里用 fixture 断言两个解析器同输出；测试期 import 不影响运行时自包含。
- 后续架构 review 不再把「kit 与 skill 的解析器重复」作为统一候选重新提出。

## 替代方案

- **sparse-scope import `@greypan/monorepo-kit`**：消除重复且类型可查，但 skill 可用性绑上构建与安装前提，skill 与包从解耦变为联动。
- **kit 暴露 CLI 供 skill 子进程调用**：运行时仍解耦，但多一次进程往返与解析成本，skill 依然依赖 repo 命令面存在。
- **保双实现 + parity 测试**：既不破坏自包含又拦住静默分歧；因当前分歧未造成真实 bug，fixture 成本先不付，留作后果里写明的升级路径。
