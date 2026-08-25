---
'@greypan/js-kit': major
'@greypan/browser-kit': major
---

修复 Tracker 待传输事件的持久化与重试：同一对象的重复上报会被独立保留，正常发送改为有序串行，失败事件会保留至 `resume()`、重连或下次初始化后重试；启动时离线不会抢先发送 localStorage 中恢复的数据。

同时删除 `defineLoopQueue`，不保留兼容别名，迁移到并列的 `defineQueue`（调用 `onConsume` 后移除）和 `defineAckQueue`（`onConsume` 返回的 Promise fulfilled 后移除）。两者都使用必填的 `onConsume`，并支持可选的同步 `onPersist` 快照接缝与 `onConsumeError` 错误观察器。

队列持久化采用 persist-before-commit：通用队列的持久化异常会使队列 fail-closed，避免在无法保存快照时静默丢失成员关系。Tracker 的 localStorage 适配层则是 best-effort：存储受限时只告警一次并降级为 memory-only；旧快照可能残留，因此下次初始化存在 at-least-once 重复发送风险。Tracker 的 `persistenceKey` 默认使用 URL；需要在同一页面创建多个相互独立的 Tracker 时，应提供不同的稳定 key。
