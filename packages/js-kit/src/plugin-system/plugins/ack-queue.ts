import { definePlugin } from '../core'
import { createQueueCore } from '../internal/queue-core'
import type { QueueController, QueueOptions } from '../internal/queue-core'

/**
 * 定义“消费者 fulfilled 后才确认”的队列。
 *
 * 消费者 rejection 会保留当前条目并继续处理后续条目；显式 `resume()` 或 `flush()`
 * 才会再次尝试 failed 条目。
 */
export function defineAckQueue<T>(options: QueueOptions<T>) {
  return definePlugin<QueueController<T>, object>(() => createQueueCore({ ...options, mode: 'ack' }))
}
