# js-kit 包指令

- 优先使用小型、可组合的函数和 plugin system，而非继承；内部状态和行为模块使用 `definePlugin`，除非框架明确要求继承。
- 插件构建器导出为 `defineXxx = (...) => definePlugin(...)`，调用方通过 `defineXxx(...).make(...)` 实例化。
- 插件选项必须有运行时默认值；规范化后全为必需时，使用 `DEFAULT_OPTIONS` 加 `Required<Options>` 作为内部配置。
- 保留公共边界的泛型推导；公共行为和文档化 fallback 路径使用聚焦测试覆盖。
