/**
 * @file tracker
 * @description 数据埋点上报工具
 * 特性：
 * 1.批量数据聚合：在 batchingDelay ms 内合并多次上报
 * 2.临终遗言：关闭标签页或切换到后台时立即同步回调执行上报
 * 3.断网重发：重连后从 IndexedDB 中恢复数据重发
 * 4.数据分片：由于 sendBeacon 限制约 64 KB，超出阈值时分多次传输。二分递归分片。
 * 5.降级策略：sendBeacon 失败时降级到 fetch keepalive
 * @example
 * const trackerPlugin = createTracker()
 *   .use(createTransport({ url: 'https://example.com' }))
 *   .use(createOfflineRestore())
 *   .use(createBatchingEmitter())
 *   .use(createLeaveSend())
 *
 * const tracker = make(trackerPlugin)
 * tracker.track({ event: 'click' }) // custom
 */

export * from './plugins/leave-send'
export * from './plugins/offline-restore'
export * from './plugins/tracker'
export * from './plugins/transport'
