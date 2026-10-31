/**
 * 待写入队列。
 *
 * 事件钩子能识别锚点，却拿不到 `ctx.executeTool`，所以不能当场写进 pi-memory。这里把锚点
 * 暂存成 pending，由下一次工具调用（或 `agent_before_settle` 追加的那一轮指令）真正落盘。
 *
 * 队列状态放在内存而不是文件：它只在单次会话内有意义，写入成功后立即清掉。进程重启丢掉
 * 未落盘的锚点是可以接受的——镜像里已经有同一份内容，下一次工具调用会补写。
 */

import type { PendingAnchor } from '../contracts'

export interface PendingQueue {
  /** 入队；同 kind + slot 的锚点合并，保留最新内容。 */
  push(anchor: PendingAnchor): void
  /** 取出全部待写入锚点，不清空。 */
  peek(): readonly PendingAnchor[]
  /** 写入成功后按 kind + slot 移除。 */
  resolve(anchor: PendingAnchor): void
  /** 当前是否有待写入项。 */
  size(): number
  /** 清空；用于 session 切换与测试隔离。 */
  clear(): void
}

function identity(anchor: PendingAnchor): string {
  return `${anchor.kind}\u0000${anchor.slot}`
}

export function createPendingQueue(): PendingQueue {
  const items = new Map<string, PendingAnchor>()
  return {
    push(anchor) {
      items.set(identity(anchor), anchor)
    },
    peek() {
      return [...items.values()]
    },
    resolve(anchor) {
      items.delete(identity(anchor))
    },
    size() {
      return items.size
    },
    clear() {
      items.clear()
    }
  }
}
