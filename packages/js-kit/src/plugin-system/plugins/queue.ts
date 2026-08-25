import { definePlugin } from '../core'
import { createQueueCore } from '../internal/queue-core'
import type { QueueController, QueueOptions } from '../internal/queue-core'

export type { QueueConsumeResult, QueueController, QueueOptions } from '../internal/queue-core'

/**
 * 定义“交付即消费”的队列。
 *
 * 调用 `onConsume` 后条目立即视为完成，不等待它返回的 Promise；若 Promise rejection，
 * 只通过 `onConsumeError` 观察，不会把条目重新放回队列。
 */
export function defineQueue<T>(options: QueueOptions<T>) {
  return definePlugin<QueueController<T>, object>(() => createQueueCore({ ...options, mode: 'consume' }))
}
