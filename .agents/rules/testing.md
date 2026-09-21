# 测试约束

- 跨包引用、导出或运行时契约变更用 `pnpm --filter @greypan/<name> test` 或包级聚焦测试回归；全量运行时机与最小验证选择以 [`docs/agents/testing.md`](../../docs/agents/testing.md) 为准。
- 构建配置、发布产物或导出变更用 `pnpm --filter @greypan/<name> build` 验证；其他改动按风险选择验证，不要求无条件全仓构建。
- 浏览器原生行为、UI 交互和 reduced motion 的测试层级与命令见 [`docs/agents/testing.md`](../../docs/agents/testing.md)。
- 浏览器验证前先跑 `pnpm agent:verify check-env` 前置检查（页面可见性、rAF 推进、时钟推进），证据不可信环境中的验证结论无效；真实触控管线与过渡插值取证的命令与判定见 [`docs/agents/browser-verification.md`](../../docs/agents/browser-verification.md)「引擎级验证工具链」。
- 生成系统负载做本地复现时，负载进程必须可清理且不得依赖 shell job 控制；CI 光标敏感的 browser spec 需隔离挂载点，避免 hover 重算造成 flaky。机制与命令细节见 [`docs/agents/testing.md`](../../docs/agents/testing.md)。
