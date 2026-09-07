---
'@greypan/test-kit': minor
---

test-kit 新增 `createMswTestEnv({ handlers })` 一体化 MSW 测试环境：自动捕获请求（内置兜底 recorder，业务 handler 优先）并提供 `settle` 稳定窗口排空（保留 fake timers）。

同时将 `vite-plus` 声明为 peer dependency：`settle` 在运行期从 `vite-plus/test` 导入 `vi`，属于发布表面，消费方需提供 `vite-plus >= 0.3`。这是 `contract-diff` 判定的 packaging 契约变更（breaking candidate）；因既有消费方运行时行为不变（未安装 vite-plus 时本就无法运行其测试环境），且本包处于 0.x 版本线（minor 即 breaking 通道），故决策为 minor 而非 major。
