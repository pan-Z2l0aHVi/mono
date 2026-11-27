---
name: apps-sparse-checkout
description: 仅当用户明确要求物理隔离其他 apps/* 兄弟应用时调用：按 apps/<dir-name> 收缩或恢复 git sparse checkout（packages/ 与根级目录永不稀疏）。
disable-model-invocation: true
---

# Apps Sparse Checkout

仅在确需将其他 `apps/*` 从当前 worktree 物理隔离时按需使用（常规开发默认全树，见 [`environment.md`](../../docs/agents/environment.md)）。`packages/` 与全部根级目录永远全量保留、永不稀疏；不用于改动 `packages/*`、根共享配置或跑全仓门禁。

## 运行

在 worktree 根目录执行（完整参数见 `--help`，需要同步依赖时用 `mise exec --` 包装）：

```sh
mise exec -- node .agents/skills/apps-sparse-checkout/sparse-checkout.mjs --app <dir-name>... [--dry-run] [--json]
mise exec -- node .agents/skills/apps-sparse-checkout/sparse-checkout.mjs --status [--json]
mise exec -- node .agents/skills/apps-sparse-checkout/sparse-checkout.mjs --restore [--json]
```

已稀疏态下再次运行 `--app` 可幂等切换目标应用；`--app` 与 `--restore` 会自动执行 `pnpm install --frozen-lockfile`，失败自动回滚到进入前状态。

## 稀疏树安全规则

- **跨隐藏应用检索**：`rg`/Glob 只看已检出文件，全局搜用 `git grep <pattern> HEAD`（暂存区用 `--cached`），读文件用 `git show HEAD:<path>`。
- **门禁与依赖边界**：`check-pre-commit` 允许在稀疏树运行；全仓门禁（`test-scripts`、`check-context`、`check-policy`）、不带 `--frozen-lockfile` 的 `pnpm install`、变更依赖/lockfile、合并/rebase/切分支以及推送前全量检查（见 [`verification.md`](../../docs/agents/verification.md#推送前本地全量-check-门)）**必须先 `--restore`**。
