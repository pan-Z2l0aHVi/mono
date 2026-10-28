---
'@greypan/monorepo-kit': patch
---

仓库门禁、策略检查与构建编排的实现从 `scripts/lib/` 收进本包，源码直出、按「换仓库是否重写」分 `shared/`、`policy/`、`repo/` 三个分区；`scripts/lib/` 只留 `.mise.toml` 在 Node 可用前执行的两个 POSIX helper。`test-scripts` 的发现集合排除本包，包内测试改由 turbo 的 `test` 任务承担，跨包引用改走包 specifier。
