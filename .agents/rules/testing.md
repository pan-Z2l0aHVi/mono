# 测试约束

测试用例该写什么（什么值得测、什么别测）以 [`docs/agents/test-authoring.md`](../../docs/agents/test-authoring.md) 为准；本文件只列验证执行层面的约束。

- 跨包引用、导出或运行时契约变更，用 `pnpm exec turbo test --filter=@greypan/<name>` 回归，turbo 会先构建上游依赖。裸 `pnpm --filter @greypan/<name> test` 直接跑包内脚本，会用到陈旧或缺失的 `dist`。全量运行时机和最小验证选择以 [`docs/agents/test-execution.md`](../../docs/agents/test-execution.md) 为准。
- 构建配置、发布产物或导出变更，迭代期用 `pnpm exec turbo build --filter=@greypan/<name>`，提交确认前用根 `pnpm run build`。裸 `pnpm --filter @greypan/<name> build` 只跑包内脚本，不构建上游依赖，别拿它做构建验证。其他改动按风险选择验证，不要求无条件全仓构建。
- 浏览器原生行为与 UI 交互的测试层级与命令见 [`docs/agents/test-execution.md`](../../docs/agents/test-execution.md)。
- 浏览器验证前先跑 `pnpm agent:verify check-env` 做前置检查（页面可见性、rAF 推进、时钟推进）。环境不可信时，验证结论无效。真实触控管线与过渡插值取证的命令和判定见 [`docs/agents/browser-verification.md`](../../docs/agents/browser-verification.md)「引擎级验证工具链」。
- 本地复现系统负载时，负载进程必须可清理，且不能依赖 shell job 控制。CI 中光标敏感的 browser spec 要隔离挂载点，避免 hover 重算造成 flaky。机制与命令细节见 [`docs/agents/test-execution.md`](../../docs/agents/test-execution.md)。
