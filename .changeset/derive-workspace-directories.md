---
'@greypan/monorepo-kit': patch
---

新增叶子函数 `readPnpmWorkspaceDirectories(root)`：从 `pnpm-workspace.yaml` 的 `dir/**` 形态模式派生 workspace 容器目录。本仓的 `context-corpus`、`no-mutual-links`、`test-port-call-sites`、`env-doctor` 与 workflow 拓扑测试改用派生结果，不再各自手写 `apps` / `packages`；`scripts/policies/repo-root.mjs` 统一按 `pnpm-workspace.yaml` 定位仓库根。
