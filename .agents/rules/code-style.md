# 代码风格入口

本文件只保留需要 Agent 主动记住、且不能可靠地从 formatter、lint、类型或现有代码推断的约束。格式和 lint 细节见 [`docs/agents/linting.md`](../../docs/agents/linting.md)；当前实现以源码和配置为准。

- 保持严格 TypeScript 和公共边界的类型推导；必要的例外要在代码附近说明原因，不用 `any` 掩盖契约不清。
- 错误处理和 fallback 必须保留可观察原因；公共 API 的 JSDoc 说明参数、返回值和副作用。
- 先匹配目标目录的现有代码风格，再让 formatter/import sorter 输出最终格式；不要手工对抗工具。
- `packages/js-kit` 的 plugin system、`packages/web-ui` 的 Shadow DOM/组件契约和各包 `AGENTS.md` 中的边界属于架构约束，不在本文件重复实现处方。
- 完成源码改动后，按 `find:usages` 输出和任务风险选择 `pnpm run check:code`；不要因为本文件而无条件扩大验证范围。
