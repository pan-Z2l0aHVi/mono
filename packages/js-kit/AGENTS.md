# js-kit 包指令

- 优先使用小型、可组合的函数和插件系统，而非继承。
- 内部状态和行为模块使用 `definePlugin` 而非 class，除非框架明确要求继承。
- 插件构建器导出为 `defineXxx = (...) => definePlugin(...)` 形式。调用方通过 `defineXxx(...).make(...)` 实例化。
- 插件选项必须有运行时默认值。当所有选项在规范化后均为必需时，使用 `DEFAULT_OPTIONS` 加 `Required<Options>` 作为内部配置。
- 保留公共边界的泛型推导。为公共行为和文档化的 fallback 路径添加聚焦测试。
