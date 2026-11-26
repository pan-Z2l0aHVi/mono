import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit'

const sent: object[] = []

const tracker = defineTracker({
  url: '/api/track',
  persistenceKey: 'demo-session',
  transport: async payload => {
    sent.push(payload)
  }
})
  .use(defineBatchTrack({ defaultBatchDelay: 500, maxBatchKB: 64 }))
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .use(definePageErrors({ maxErrors: 10, dedupeWindowMs: 5_000 }))
  .make()

// 默认按 500ms 窗口批量聚合
tracker.track({ event: 'page_view', path: '/docs' })

// 传入 batchDelay <= 0 跳过聚合窗口，立即进入发送队列
tracker.track({ event: 'checkout_start' }, 0)

// 离线期间暂停发送，恢复在线后继续冲刷
tracker.pause()
tracker.track({ event: 'click', target: 'cta' })
await tracker.resume()
await tracker.flush()

// 卸载时清理所有插件注册的 window / document 监听
tracker.stop()

console.log(sent.length)
