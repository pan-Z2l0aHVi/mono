# 代码风格规范

格式、lint、CSS 规则的细节见 [`docs/agents/linting.md`](../../docs/agents/linting.md)。

- 文件名使用 kebab-case；类型和接口使用 PascalCase；函数与变量使用 camelCase；常量使用 UPPER_SNAKE_CASE；布尔变量使用 `is`、`has` 或 `can` 前缀。
- 注释解释原因、语义或降级理由，不复述代码。公共 API 使用中文 JSDoc 说明参数、返回值和副作用。
- 保持严格 TypeScript。避免 `any`；只有类型级泛型约束且不泄漏推导结果时，才可使用带理由的行级禁用。保留公共边界的泛型推导。`no-explicit-any` 在非测试代码中以 warning 级别检查，测试文件（`*.{test,spec}.*`）在 lint 配置中显式豁免；事件处理中应使用具体元素类型（如 `HTMLElement & { value: string }`）而非 `any`。
- 不吞掉错误；降级逻辑必须说明原因。一个文件聚焦一个主要职责，内部辅助函数位于导出函数之后。
- 内部状态与行为实现使用 `import { definePlugin } from '@greypan/js-kit'` 的插件系统，不使用 `class` 封装；Lit 自定义元素等框架要求继承的类型不在此限。
- 插件构建器命名为 `defineXxx`，并以 `defineXxx = (...) => definePlugin(...)` 形式返回插件；调用端使用 `defineXxx(...).make(...)`。
- CSS 的组件内部后代状态优先使用原生 nesting 组织；`:host(...)` 状态选择器保持顶层，避免混淆 Shadow DOM 宿主边界。
- `apps/` 下的项目编写样式时，优先使用 Tailwind v4 工具类（含 arbitrary properties 和 arbitrary variants）；仅在 Tailwind 无法表达的场景（如 keyframes、复杂嵌套选择器）才允许使用 CSS 文件兜底。
- 格式化工具负责 import 排序；不要手工对抗其输出。
- 完成代码改动后，先运行 `pnpm run check:code`，再向用户报告结果。
