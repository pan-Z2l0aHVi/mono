---
'@greypan/monorepo-kit': patch
---

按 ADR-0031 收敛包内分区：检查单元一律 `defineXxx(options)` 返回 `{ name, run }`，仓库事实（包目录、hook 名单、Turbo 输入、修复命令）只从 options 进入，实例由消费仓库的 `scripts/policies/` 建好交给 `scripts/checks/` 的入口。`policy/` 与 `repo/` 取消，`check-runner` 移到 `runner/`，`shared/` 只留与仓库无关的 `config`、`errors`、`order`；`shared/exec`、`shared/git`、`shared/repo-root`、`shared/workspace-manifests` 并入对应的 `exec`、`git`、`workspace` 插件，并新增 `turbo`、`changesets`、`test-ports` 插件。`test-scripts` 去掉 `exclude` 参数，发现集合不再排除本包。插件 API 的键与 context 同名（`root`、`env`）会在 `use` 合并后静默遮蔽 context，因此不再提供与 context 同名的 API。
