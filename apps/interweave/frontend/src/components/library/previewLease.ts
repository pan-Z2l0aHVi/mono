import { ref, type Ref } from 'vue'

import type { LibraryRuntime } from '@/services/library'

import type { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

type LeaseRuntime = Pick<LibraryRuntime, 'isAvailable' | 'resources' | 'events'>

/** 并发上限：大批次导入时按 FIFO（顶部优先）节流，避免瞬间打爆后端 IPC 与 LRU 缓存。 */
const DEFAULT_MAX_PREPARE_CONCURRENCY = 4

/** 一次 pending 预览授权：token 由后端签发，mediaUrl 是可直接渲染的临时地址。 */
export interface PreviewLeaseEntry {
  kind: ResourceKind
  token: string | null
  mediaUrl: string | null
  path: string
}

/**
 * 待添加文件与找回资源的预览授权账本。
 *
 * 预览 token 是后端有界缓存里的短期资源：要么由持有方显式释放，要么被容量淘汰。
 * 两个入口共用同一条结算纪律：prepare 返回后逐条重判是否仍然有效。lease 把四者收敛到一处：
 *
 * - 有界并发调度（FIFO 顶部优先）：限制同时在途的 prepareFilePreview 数量，取消时直接丢弃排队任务；
 * - 版本化 prepare：生效前重新校验 validity，过期结果立即释放，不落 entries；
 * - 驱逐对账：订阅后端 `library:previews-revoked`，被淘汰的 token 从 entries 移除，
 *   渲染方据此回落 fallback，而不是把 404 当成文件消失；
 * - 显式撤销、排队取消与整体清理：幂等，且按单键 O(1) 更新响应式表，避免大批次浅拷贝抖动。
 */
export interface PreviewLease {
  /** 按 key（队列项 / Source id）索引的有效预览；缺失即「没有可用预览」。 */
  entries: Ref<Readonly<Record<string, PreviewLeaseEntry | undefined>>>
  /** 版本化获取：prepare 返回后仍通过 validity 才生效；过期结果自动释放。 */
  prepare(key: string, path: string, validity: () => boolean): Promise<PreviewLeaseEntry | null>
  /** 立即失效并释放（幂等）。 */
  revoke(key: string): Promise<void>
  /** 仅中止尚未发往后端的排队 prepare（保留已完成的预览条目），用于批量扫描中途停止。 */
  cancelPending(): void
  /** 释放全部（dialog close / unmount）。 */
  clear(): Promise<void>
  /** key 的 preparation 完成等待（结算时序用）。 */
  awaitSettled(key: string): Promise<void>
  /** 取消驱逐订阅；持有方在 unmount 时调用。 */
  dispose(): void
}

interface QueuedPrepare {
  key: string
  path: string
  version: number
  startedAt: number
  validity: () => boolean
  resolve: (entry: PreviewLeaseEntry | null) => void
}

export function createPreviewLease(runtime: LeaseRuntime, options: { maxConcurrency?: number } = {}): PreviewLease {
  const maxConcurrency = Math.max(1, options.maxConcurrency ?? DEFAULT_MAX_PREPARE_CONCURRENCY)
  const entries = ref<Record<string, PreviewLeaseEntry | undefined>>({})
  // per-key 版本让同一 key 的新一轮 prepare 作废旧一轮；全局代次让 clear() 作废所有在途请求。
  const versions = new Map<string, number>()
  const preparations = new Map<string, Promise<PreviewLeaseEntry | null>>()
  const pendingQueue: QueuedPrepare[] = []
  let activeCount = 0
  // 已被后端驱逐、但对应 prepare 还没兑现的 token。驱逐事件只按 entries 对账，
  // 突发入队时 token 可能先被 LRU 淘汰、prepare 的响应后到；没有这份 tombstone
  // 就会把已吊销的授权写进 entries，渲染方只能拿到 404。
  const revokedTokens = new Set<string>()
  let generation = 0

  function bump(key: string) {
    const version = (versions.get(key) ?? 0) + 1
    versions.set(key, version)
    return version
  }

  async function releaseToken(token: string | null) {
    if (!token || !runtime.isAvailable) return
    try {
      await runtime.resources.releaseFilePreview(token)
    } catch (cause) {
      // 释放失败只留下一个会被后端 LRU 兜底回收的 token，不能反过来打断调用方的提交流程。
      console.error('释放文件预览授权失败', cause)
    }
  }

  function dropEntry(key: string) {
    if (!(key in entries.value)) return
    delete entries.value[key]
  }

  function dropQueuedForKey(key: string) {
    for (let i = pendingQueue.length - 1; i >= 0; i--) {
      const queued = pendingQueue[i]!
      if (queued.key === key) {
        pendingQueue.splice(i, 1)
        queued.resolve(null)
      }
    }
  }

  function pumpQueue() {
    while (activeCount < maxConcurrency && pendingQueue.length > 0) {
      const task = pendingQueue.shift()!
      if (task.startedAt !== generation || versions.get(task.key) !== task.version || !task.validity()) {
        task.resolve(null)
        continue
      }
      activeCount += 1
      void runTask(task).finally(() => {
        activeCount -= 1
        pumpQueue()
      })
    }
  }

  async function runTask(task: QueuedPrepare) {
    try {
      const preview = await runtime.resources.prepareFilePreview(task.path)
      const token = preview.token || null
      if (token && revokedTokens.delete(token)) {
        // 授权在响应到达前就被 LRU 驱逐：后端已删除它，不入账也不再释放。
        task.resolve(null)
        return
      }
      if (task.startedAt !== generation || versions.get(task.key) !== task.version || !task.validity()) {
        await releaseToken(token)
        task.resolve(null)
        return
      }
      // 非图片/视频文件（如 JSON/代码、文档、音频）后端不签发短期媒体 token，
      // 但仍返回权威 kind，供导入与找回列表展示与资源库一致的类型图标。
      if (!token && !preview.kind) {
        task.resolve(null)
        return
      }
      const entry: PreviewLeaseEntry = {
        kind: preview.kind,
        token,
        mediaUrl: preview.media_url || null,
        path: task.path
      }
      const previous = entries.value[task.key]
      entries.value[task.key] = entry
      if (previous) await releaseToken(previous.token)
      task.resolve(entry)
    } catch (cause) {
      // 预览失败时保留通用 fallback；真正的纳入仍由 CreateResource 校验路径。
      console.error('准备文件预览失败', cause)
      task.resolve(null)
    }
  }

  function prepare(key: string, path: string, validity: () => boolean): Promise<PreviewLeaseEntry | null> {
    if (!runtime.isAvailable) return Promise.resolve(null)
    dropQueuedForKey(key)
    const version = bump(key)
    const startedAt = generation
    let resolveTask!: (entry: PreviewLeaseEntry | null) => void
    const preparation = new Promise<PreviewLeaseEntry | null>(resolve => {
      resolveTask = resolve
    })
    preparations.set(key, preparation)
    void preparation.then(() => {
      if (preparations.get(key) === preparation) preparations.delete(key)
    })
    pendingQueue.push({ key, path, version, startedAt, validity, resolve: resolveTask })
    pumpQueue()
    return preparation
  }

  function cancelPending() {
    for (const queued of pendingQueue.splice(0)) {
      queued.resolve(null)
    }
  }

  async function revoke(key: string) {
    bump(key)
    dropQueuedForKey(key)
    // 在途 prepare 看到版本变化会自行释放晚到的 token；先等它结算，再处理已有的条目。
    const pending = preparations.get(key)
    if (pending) await pending
    const entry = entries.value[key]
    dropEntry(key)
    if (entry) await releaseToken(entry.token)
  }

  async function clear() {
    generation += 1
    cancelPending()
    const pending = [...preparations.values()]
    const previous = Object.values(entries.value)
    entries.value = {}
    // 在途 prepare 看到代次变化会自行释放晚到的 token；等它们结算后上一轮 entries 的 token 也已释放完毕。
    await Promise.allSettled(pending)
    revokedTokens.clear()
    await Promise.allSettled(previous.map(entry => releaseToken(entry?.token ?? null)))
  }

  function awaitSettled(key: string) {
    return preparations.get(key)?.then(() => undefined) ?? Promise.resolve()
  }

  const unsubscribe = runtime.events.onPreviewRevoked(tokens => {
    const revoked = new Set(tokens)
    const landed = new Set<string>()
    for (const [key, entry] of Object.entries(entries.value)) {
      if (!entry?.token || !revoked.has(entry.token)) continue
      landed.add(entry.token)
      // 后端已删除授权，无需再调用 release；只让渲染方看到预览消失。
      bump(key)
      dropEntry(key)
    }
    // 命中不到条目的 token 属于仍在途的 prepare：先记下，等它兑现时拒收。
    for (const token of revoked) {
      if (!landed.has(token)) revokedTokens.add(token)
    }
  })

  function dispose() {
    cancelPending()
    unsubscribe()
    revokedTokens.clear()
  }

  return {
    entries,
    prepare,
    revoke,
    cancelPending,
    clear,
    awaitSettled,
    dispose
  }
}
