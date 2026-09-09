# 测试约束

- 新增或修改公共行为时，添加与风险相称的聚焦测试；测试通过公共 API 验证行为，并保持彼此独立。
- 跨包引用、导出或运行时契约变更在迭代期用 `pnpm run test:affected` 或包级聚焦测试快速回归；提交确认前必须在根目录运行全量 `pnpm test`。单包测试用于开发中的快速定位。
- 构建配置、发布产物或导出变更在迭代期用 `pnpm run build:affected` 验证；提交确认前必须运行根目录全量 `pnpm build`；其他改动按风险选择验证，不要求无条件全仓构建。
- 浏览器原生行为、UI 交互和 reduced motion 的测试层级与命令见 [`docs/agents/testing.md`](../../docs/agents/testing.md)。
- 生成系统负载做本地复现时，负载进程必须可清理且不得依赖 shell job 控制；CI 光标敏感的 browser spec 需隔离挂载点，避免 hover 重算造成 flaky。机制与命令细节见 [`docs/agents/testing.md`](../../docs/agents/testing.md)。
