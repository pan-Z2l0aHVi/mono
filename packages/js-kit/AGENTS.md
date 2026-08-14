# js-kit 包指令

- `plugin system` 是本包承载内部状态和可组合行为的架构边界；修改状态抽象或 plugin system 前读 [`docs/adr/0004-plugin-system.md`](../../docs/adr/0004-plugin-system.md) 和 `src/plugin-system/`。
- 新增或修改 plugin builder 时保持现有 `defineXxx(...).make(...)` 公共形状、选项默认值和公共类型推导；具体实现以当前源码为准，不要把这条规则扩展成新的继承层级。
- 公共行为或 fallback 改动需要聚焦测试；影响消费者时用 `repo:verify` 确认范围、所需证据和验证计划。
