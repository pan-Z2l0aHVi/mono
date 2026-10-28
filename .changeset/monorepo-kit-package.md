---
'@greypan/monorepo-kit': patch
---

仓库门禁、策略检查与构建编排的实现从 `scripts/lib/` 收进本包，源码直出、按「换仓库是否重写」分 `shared/`、`policy/`、`repo/` 三个分区；`scripts/lib/` 只留 `.mise.toml` 在 Node 可用前执行的两个 POSIX helper。`test-scripts` 的发现集合排除本包，包内测试改由 turbo 的 `test` 任务承担。

对外只有一个入口 `exports["."]`，不提供子路径，跨包引用一律写 `@greypan/monorepo-kit`。检查单元（导出 `name` 与 `run` 的模块）以命名空间给出，其余叶子函数与常量平铺；运行时源码直出，类型声明由 `tsc` 生成到 `dist/`，与运行时入口的一致性由 `src/index.test.mjs` 逐名比对。
