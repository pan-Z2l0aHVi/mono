---
'@greypan/monorepo-kit': patch
---

新增 `defineTurboInputPaths()` 门禁：`turbo.json` 里指向不存在文件的 `$TURBO_ROOT$` 正模式不报错，只是收不进任何文件，任务因此静默停止失效。检查从 `pnpm-workspace.yaml` 列出根与每个 workspace 的 `turbo.json`，逐个判这些条目能否命中文件并指认到配置与条目下标；排除项不判，因为排除项打偏只会多算输入。无 options——配置集合与待判条目都从仓库配置读出来。并入 `check-pre-commit` 与 `check-policy`。
