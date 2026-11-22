---
name: apps-sparse-checkout
description: 仅在确需把其他 apps/* 兄弟应用从当前 worktree 与检索面物理隔离时按需调用：按 apps/<dir-name> 收缩或切换 git sparse checkout；packages/ 与全部根级目录永远全量保留、永不稀疏；常规开发默认保持全树，不用于单包或跨包依赖裁剪。
---

# Apps Sparse Checkout

## 何时使用（按需 opt-in）

本仓默认工作在**全树（full checkout）**下，配合窄口径根 `.ignore`、路径前缀检索与 `turbo --filter` 控制视野和构建范围，见 [`worktree.md`](../../docs/agents/worktree.md#按需隔离兄弟应用) 与 [`verification.md`](../../docs/agents/verification.md#从变更路径到验证计划)。

仅在以下按需场景调用本 skill：

- 需要把兄弟应用（其他 `apps/*` 目录）从当前工作树与磁盘检索面物理隔离（例如专注单个应用、避免多应用生成物或路由目录同时出现在工作树里）。
- **核心边界**：`packages/` 与全部根级配置/脚本/文档目录（如 `docs/`、`scripts/`、`skills/`、`.github/`、`.agents/`）**永远全量保留、永不稀疏**；本 skill 仅对 `apps/*` 做按需隔离，不做 `turbo` 依赖图计算或包级裁剪。
- **不使用场景**：修改 `packages/*`、改动根共享面（`pnpm-workspace.yaml`、`pnpm-lock.yaml`、根脚本、CI 定义）、跑全仓门禁（`test-scripts`、`check-context`、`check-policy`），或常规全树足以胜任时直接跳过。

受权限或仓库规则限制无法修改 Git 配置或 worktree 时，只运行 `--dry-run` 或 `--status`，不执行会改动 checkout 的命令；`sparse-checkout init` 会启用 Git worktree 配置与 `worktreeConfig` 开关，须遵守根 `AGENTS.md` 的 Git 配置边界。

## 运行

在 worktree 根目录运行（脚本只依赖 Node 内置模块）。`<skill-dir>` 为加载本 skill 得到的目录，本仓通过 `.agents/skills/apps-sparse-checkout/` 访问；需要同步依赖时用 `mise exec -- node ...` 确保 `pnpm` 在 `PATH` 上：

```sh
mise exec -- node <skill-dir>/sparse-checkout.mjs --app <dir-name>... [--dry-run] [--json]
mise exec -- node <skill-dir>/sparse-checkout.mjs --app <dir-name>... --check [--json]
mise exec -- node <skill-dir>/sparse-checkout.mjs --status [--json]
mise exec -- node <skill-dir>/sparse-checkout.mjs --restore [--json]
```

| 参数                  | 作用                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--app <dir-name>...` | 必选目标参数：仅接受 `apps/` 下一级目录名（如 `interweave`、`react-web-ui-demo`、`vue-web-ui-demo`），校验目录存在并拒绝路径穿越；cone 始终保留 `apps/<dir-name>` 整棵子树（含 `apps/interweave/frontend` 等嵌套目录）；已稀疏态下直接再次调用 `--app` 即可幂等覆盖切换目标 App，无需先 `--restore` |
| `--check`             | 配合 `--app` 校验当前 cone 与指定应用集合是否一致（只读：一致 exit 0，漂移或非 cone 模式或全树 exit 1，不改工作区也不跑 install） |
| `--dry-run`           | 配合 `--app` 预览计算出的 cone 与将执行的命令，不修改工作区与依赖（全树与稀疏态均可用）                                            |
| `--status`            | 只读诊断：输出当前 `coneMode`、cone 清单、可见/隐藏的 `apps/*`、cone 外未提交文件与提醒                                            |
| `--restore`           | `git sparse-checkout disable` 恢复全树，并在存在 `pnpm-workspace.yaml` 与 `pnpm` 时执行 `pnpm install --frozen-lockfile`           |
| `--json`              | 在 stdout 输出机器可读 JSON 报告                                                                                                   |
| `-h`, `--help`        | 输出帮助信息并 exit 0                                                                                                              |

退出码：`0` 成功；`1` 环境/Git/pnpm 失败或 `--check` 不匹配；`2` 用法、参数冲突、路径穿越或未知目录名错误。

## 依赖同步与失败回滚

- `--app` 收缩或切换完成后，若根目录存在 `pnpm-workspace.yaml` 且 `pnpm` 在 `PATH` 上，脚本会自动执行 `pnpm install --frozen-lockfile` 对齐当前工作区 `node_modules`（`dependencies.status === 'synced'`）；缺失上述条件时跳过并告警。
- `--restore` 在关闭稀疏检出后同样自动执行 `pnpm install --frozen-lockfile` 恢复全工作区依赖链接。
- `--app` 阶段发生任何错误或 `pnpm install --frozen-lockfile` 失败时，脚本会回滚到进入前的状态（稀疏起步恢复原 cone，全树起步保持全树）。`--restore` 若在恢复全树后依赖同步失败，工作树保持全树并提示手动补跑 `mise exec -- pnpm install --frozen-lockfile`。

## 稀疏树里的安全规则

1. **跨被隐藏应用的全局检索用 `git grep <pattern> HEAD`**（未提交暂存内容用 `git grep --cached`）；读取被隐藏应用的文件用 `git show HEAD:<path>`。`rg` 与文件 Glob 只看磁盘上已检出的文件。
2. **提交前检查与全仓门禁分工**：
   - `check-pre-commit` 允许在稀疏工作树上运行（`packages/` 永远全量保留，`web-ui-docs-inputs` 等包级门禁正常校验）。
   - 全仓门禁（`test-scripts`、`check-context`、`check-policy`）前置 `full-checkout` 检查，会在稀疏状态下拒绝执行并提示恢复命令；请先 `--restore`，或在交付记录中明记缺口交由 PR CI 复检。
   - 跨包公共契约变更的影响面查询见 [`monorepo-change-impact`](../monorepo-change-impact/SKILL.md)。
3. **不要在稀疏树运行不带 `--frozen-lockfile` 的 `pnpm install`**：变更 `pnpm-workspace.yaml`、增删依赖或更新 `pnpm-lock.yaml` 前必须先 `--restore`。
4. **合并、rebase 或切换分支前先 `--restore`**：`--restore` 会自动补齐 `pnpm install --frozen-lockfile`；若后续需要消费曾被隐藏应用的构建产物，再按需执行 `mise exec -- pnpm run build`。
5. **cone 外未提交改动**：切换 `--app` 时若其他应用存在未提交文件，脚本会在 `dirtyOutsideCone` 告警；未跟踪文件留在磁盘，已暂存且与索引一致的改动会随 skip-worktree 隐藏并在 `--restore` 后恢复。
