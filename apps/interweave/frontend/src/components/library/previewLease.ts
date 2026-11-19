import { ref, type Ref } from 'vue'

import type { LibraryRuntime } from '@/services/library'

import type { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

type LeaseRuntime = Pick<LibraryRuntime, 'isAvailable' | 'resources' | 'events'>

/** 一次 pending 预览授权：token 由后端签发，mediaUrl 是可直接渲染的临时地址。 */
export interface PreviewLeaseEntry {
  kind: ResourceKind
  token: string
  mediaUrl: string | null
  path: string
}

/**
 * 待添加文件与找回资源的预览授权账本。
 *
 * 预览 token 是后端有界缓存里的短期资源：要么由持有方显式释放，要么被容量淘汰。
 * 两个入口共用同一条结算纪律：prepare 返回后逐条重判是否仍然有效。lease 把三者收敛到一处：
 *
 * - 版本化 prepare：生效前重新校验 validity，过期结果立即释放，不落 entries。
 * - 驱逐对账：订阅后端 `library:previews-revoked`，被淘汰的 token 从 entries 移除，
 *   渲染方据此回落 fallback，而不是把 404 当成文件消失。
 * - 显式撤销与整体清理：幂等，且等待在途 prepare 结算后再返回。
 */
export interface PreviewLease {
  /** 按 key（队列项 / Source id）索引的有效预览；缺失即「没有可用预览」。 */
  entries: Ref<Readonly<Record<string, PreviewLeaseEntry | undefined>>>
  /** 版本化获取：prepare 返回后仍通过 validity 才生效；过期结果自动释放。 */
  prepare(key: string, path: string, validity: () => boolean): Promise<PreviewLeaseEntry | null>
  /** 立即失效并释放（幂等）。 */
  revoke(key: string): Promise<void>
  /** 释放全部（dialog close / unmount）。 */
  clear(): Promise<void>
  /** key 的 preparation 完成等待（结算时序用）。 */
  awaitSettled(key: string): Promise<void>
  /** 取消驱逐订阅；持有方在 unmount 时调用。 */
  dispose(): void
}

export function createPreviewLease(runtime: LeaseRuntime): PreviewLease {
  const entries = ref<Readonly<Record<string, PreviewLeaseEntry | undefined>>>({})
  // per-key 版本让同一 key 的新一轮 prepare 作废旧一轮；全局代次让 clear() 作废所有在途请求。
  const versions = new Map<string, number>()
  const preparations = new Map<string, Promise<PreviewLeaseEntry | null>>()
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
    const next = { ...entries.value }
    delete next[key]
    entries.value = next
  }

  function prepare(key: string, path: string, validity: () => boolean): Promise<PreviewLeaseEntry | null> {
    if (!runtime.isAvailable) return Promise.resolve(null)
    const version = bump(key)
    const startedAt = generation
    const preparation = (async () => {
      try {
        const preview = await runtime.resources.prepareFilePreview(path)
        const token = preview.token ?? null
        if (token && revokedTokens.delete(token)) {
          // 授权在响应到达前就被 LRU 驱逐：后端已删除它，不入账也不再释放。
          return null
        }
        if (!token || startedAt !== generation || versions.get(key) !== version || !validity()) {
          await releaseToken(token)
          return null
        }
        const entry: PreviewLeaseEntry = { kind: preview.kind, token, mediaUrl: preview.media_url ?? null, path }
        const previous = entries.value[key]
        entries.value = { ...entries.value, [key]: entry }
        if (previous) await releaseToken(previous.token)
        return entry
      } catch (cause) {
        // 预览失败时保留通用 fallback；真正的纳入仍由 CreateResource 校验路径。
        console.error('准备文件预览失败', cause)
        return null
      }
    })()
    preparations.set(key, preparation)
    void preparation.then(() => {
      if (preparations.get(key) === preparation) preparations.delete(key)
    })
    return preparation
  }

  async function revoke(key: string) {
    bump(key)
    // 在途 prepare 看到版本变化会自行释放晚到的 token；先等它结算，再处理已有的条目。
    const pending = preparations.get(key)
    if (pending) await pending
    const entry = entries.value[key]
    dropEntry(key)
    if (entry) await releaseToken(entry.token)
  }

  async function clear() {
    generation += 1
    const pending = [...preparations.values()]
    const previous = entries.value
    entries.value = {}
    // 在途 prepare 看到代次变化会自行释放晚到的 token；等它们结算后上一轮 entries 的 token 也已释放完毕。
    await Promise.allSettled(pending)
    revokedTokens.clear()
    await Promise.allSettled(Object.values(previous).map(entry => releaseToken(entry?.token ?? null)))
  }

  function awaitSettled(key: string) {
    return preparations.get(key)?.then(() => undefined) ?? Promise.resolve()
  }

  const unsubscribe = runtime.events.onPreviewRevoked(tokens => {
    const revoked = new Set(tokens)
    const landed = new Set<string>()
    for (const [key, entry] of Object.entries(entries.value)) {
      if (!entry || !revoked.has(entry.token)) continue
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
    unsubscribe()
    revokedTokens.clear()
  }

  return {
    entries,
    prepare,
    revoke,
    clear,
    awaitSettled,
    dispose
  }
}
