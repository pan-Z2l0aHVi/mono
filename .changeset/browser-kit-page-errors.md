---
'@greypan/browser-kit': minor
---

为 Tracker 新增 `definePageErrors()` 插件，收集 uncaught error 与 unhandled promise rejection 并复用既有上报链路。默认提供错误数量限制、签名去重窗口和 message / stack 截断保护。
