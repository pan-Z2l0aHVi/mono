# ADR-0043: Browser Kit 页面错误收集

- **Date**: 2026-09-08
- **Status**: 已接受

## 背景

Tracker 需要收集浏览器全局运行时错误。但“页面错误”可能被理解为包含资源加载失败、console 输出、框架生命周期错误或任意异常监控，这会让底层通用库变成日志平台，并带来错误风暴、payload 膨胀和敏感信息风险。

## 决策

`definePageErrors()` 只收集两类页面错误：`window` 上的 uncaught error 和 unhandled promise rejection。它通过组合后的 Tracker 上报，不单独建立传输链路；明确不收集 resource error、console 消息或框架回调错误。

插件采用以下边界：

- 事件名为 `page_error`，错误本体嵌套在 `error` 中；metadata 作为增强字段，不能覆盖标准字段或导致错误丢失。
- 内置错误风暴保护：默认最多上报 20 条，同一签名默认 5 秒内只上报一次。
- message 和 stack 默认截断，但不做内置 PII 内容脱敏；敏感信息由业务通过 Tracker transform 或 metadata 接缝自行处理。
- 不保留原始 rejection reason，只生成稳定的 message 与可选 stack，避免不可控序列化。
- 监听器在 `make()` 后自动安装；`stop()` 仅移除监听器，不提供重新启动能力，计数和窗口状态按插件实例生命周期保留。

## 后果

- 该插件保持为最小错误收集器，而不是应用监控或日志采集器；resource error 和 console capture 需要另行设计独立插件。
- 默认限流可能丢弃后续重复错误，因此服务端看到的错误数量是 best-effort 事件计数，不是完整异常清单。
- 错误 message 和 stack 仍可能携带业务敏感内容；启用该插件的应用必须自行评估脱敏策略。
