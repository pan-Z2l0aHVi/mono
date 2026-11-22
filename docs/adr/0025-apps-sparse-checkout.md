# ADR-0025: App-only 稀疏检出与默认全树双轨策略

- **Date**: 2026-11-22
- **Status**: 已接受

## 背景

原 `turbo-sparse-scope` skill 要求可变任务在建账后按台账 `scope` 调用 `turbo ls --filter <target>...` 计算传递依赖闭包，将工作树裁剪到目标包及其上游依赖集合。这一设计在多轮演进后暴露出结构性矛盾：

1. **单向依赖闭包会静默漏掉下游消费者**：修改公共包（如 `@greypan/js-kit`、`@greypan/web-ui`）时，`target...` 仅保留上游依赖，反过来将消费该公共契约的下游包与集成应用从磁盘隐藏。若改用双向闭包（`...target...`）拉回全部消费者，底座包的闭包几乎覆盖整棵仓库，稀疏收益归零却仍需承担模式切换、依赖同步与产物重建开销。
2. **包级稀疏迫使脚本层维护容忍分支**：当 `packages/web-ui` 可被稀疏隐藏时，`check-pre-commit` 等检查入口不得不维护 `webUiDocsInputsSparseTolerant`（`allowSparsePackages`）等特判出口来防止局部校验误红。
3. **默认全树聚焦已有更轻量的载体**：仓库根目录已设置窄口径 `.ignore`（排除 `apps/*/src/generated/**`、`**/__screenshots__/**`、`**/.vitest-attachments/**` 等高噪/二进制目录），配合路径前缀检索与 `turbo --filter` 即可在不修改 Git 工作区状态的前提下收窄搜索、构建与测试范围。

## 决策

采用**「默认全树 + 按需 App-only 稀疏隔离」双轨策略**：

1. **常规开发默认全树作业**：日常开发与审查不再把稀疏检出作为前置动作，保持全树检出；利用窄口径根 `.ignore`、路径前缀检索与 `turbo --filter` 控制上下文视野与任务执行范围。
2. **废除 turbo 闭包计算与 `packages/` 裁剪**：彻底移除 `turbo ls` 依赖图闭包解析；`packages/` 下全部共享包以及全部根级配置、脚本、文档与 skills 目录**永远全量保留、永不稀疏**，保证跨包契约、消费者测试与文档门禁始终面对完整共享包树。同步回收 `scripts/policies/web-ui-docs-inputs.mjs` 中的 `webUiDocsInputsSparseTolerant` 导出，使 `check-pre-commit` 与 `check-policy` 统一复用 `webUiDocsInputs`。
3. **将 `turbo-sparse-scope` 更名重构为极简 App-only `apps-sparse-checkout`（按需 opt-in）**：保留 `skills/apps-sparse-checkout/sparse-checkout.mjs`（遵守 [ADR-0020](./0020-skill-self-contained.md) 约定的运行时零 workspace 包依赖自包含），面向未来多应用扩展保留可选的 `apps/*` 物理隔离出口。CLI 仅接受 `apps/` 下一级目录名（`--app <dir-name>...`），校验目录存在并拒绝路径穿越，保留 `apps/<dir-name>` 整棵子树（兼容 `apps/interweave/frontend` 等嵌套目录），支持在已稀疏态下直接再次调用 `--app` 幂等覆盖切换目标 App，并在 `--app` 与 `--restore` 变更工作树后自动执行 `pnpm install --frozen-lockfile` 同步依赖。它与 [ADR-0015](./0015-task-ledger.md) 的 `task-ledger` 保持完全解耦，不读取台账 `scope`。

## 后果

- 共享包（`packages/*`）与根级基础设施永远完整可见，消除因单向依赖闭包导致的下游消费者静默漏检与脚本层包级稀疏容忍逻辑。
- 移除 `turbo ls` 子进程与图解析后，稀疏切换变为纯 Git cone 操作，支持在已稀疏态下直接跨 App 切换而无需先退回全树重算。
- 按需开启 App-only 稀疏检出时，被隐藏的 `apps/*` 仍不在磁盘上：`test-scripts`、`check-context` 与 `check-policy` 仍通过 `full-checkout` 门禁拒绝稀疏工作区（须先 `--restore` 或交由 CI），跨隐藏应用的全局搜索需使用 `git grep <pattern> HEAD`。具体操作与验证纪律见 `worktree.md`、`verification.md` 与 `script-policy.md`。

## 替代方案

- **彻底删除稀疏检出能力**：当前应用数量较少、全树完全可控，直接删除可进一步减少脚本维护面；但随着未来应用数量增长，保留一个零图依赖、不碰 `packages/` 的极简 App-only opt-in 隔离出口成本极低，避免日后从零重建。
- **保留 `turbo-sparse-scope` 并改为双向闭包（`...target...`）**：改动基础共享包时会拉回几乎全部下游消费者与全部应用，实际等价于全树却额外引入 cone 计算、状态切换与恢复开销，故不采用。
