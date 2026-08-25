/**
 * @file tracker
 * @description 数据埋点上报工具
 * 特性：
 * 1. 批量数据聚合：在 `defaultBatchDelay` 内合并多次上报。
 * 2. 临终遗言：关闭、离开或隐藏页面时，以 best-effort 方式尝试发送积压数据。
 * 3. 断网重发：重连或下次初始化时，继续处理 localStorage 中待传输的数据。
 * 4. 数据分片：超过 `maxBeaconSize`（默认 64 KB）的批次会二分递归分片。
 * 5. 自动降级：浏览器未接受 sendBeacon 时，使用 fetch keepalive 兜底。
 */

export * from './core'
export * from './plugins/batch-track'
export * from './plugins/last-words'
export * from './plugins/offline-restore'
