import { ref, type Ref } from 'vue'

import type { LibraryQueueItem, LibraryRuntime } from '@/services/library'

import type { ResourceLocationMatchDTO } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import {
  ResourceKind,
  SourceType
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

type PreviewRuntime = Pick<
  LibraryRuntime,
  'isAvailable' | 'prepareFilePreview' | 'releaseFilePreview' | 'pendingFilePreviewURL' | 'findResourceLocationMatches'
>

/** 单个待入队位置的重复提示：库里已登记该入口的资源。 */
export interface LibraryDuplicatePrompt {
  location: string
  matches: ResourceLocationMatchDTO[]
}

export interface LibraryAddQueueController {
  queue: Ref<LibraryQueueItem[]>
  /** 当前等待用户裁决的重复提示；null 表示没有待裁决项。页面据此渲染 dialog。 */
  duplicatePrompt: Ref<LibraryDuplicatePrompt | null>
  enqueueFileLocations(locations: string[]): Promise<void>
  /** 裁决当前重复提示；accept=false（取消）时该项不入队。 */
  resolveDuplicate(accept: boolean): void
  renameItem(itemId: string, title: string): void
  setItemTags(itemId: string, tags: string[]): void
  removeItem(itemId: string): Promise<void>
  waitForPreview(itemId: string): Promise<void>
  releasePreview(itemId: string): Promise<void>
  close(): Promise<void>
}

function queueId() {
  return `queue-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function titleFromLocation(location: string) {
  return (
    location
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/\.[^.]+$/, '') || location
  )
}

export function createLibraryAddQueue(runtime: PreviewRuntime): LibraryAddQueueController {
  const queue = ref<LibraryQueueItem[]>([])
  const duplicatePrompt = ref<LibraryDuplicatePrompt | null>(null)
  const preparations = new Map<string, Promise<void>>()
  let settleDuplicate: ((accept: boolean) => void) | null = null
  // 逐项查询与逐项确认都是异步的：串在一条链上，弹窗才不会叠加，顺序也与提交顺序一致。
  let chain: Promise<void> = Promise.resolve()
  // close() 递增代次，让链上尚未处理的位置作废：添加对话框已经关掉，剩余项不再弹窗。
  let generation = 0

  function releaseToken(token: string | null) {
    if (!token || !runtime.isAvailable) return Promise.resolve()
    return runtime.releaseFilePreview(token)
  }

  function replaceItem(itemId: string, update: (item: LibraryQueueItem) => LibraryQueueItem) {
    queue.value = queue.value.map(item => (item.id === itemId ? update(item) : item))
  }

  function trackPreparation(itemId: string, preparation: Promise<void>) {
    preparations.set(itemId, preparation)
    void preparation.then(() => {
      if (preparations.get(itemId) === preparation) preparations.delete(itemId)
    })
  }

  function prepareItem(item: LibraryQueueItem) {
    const preparation = (async () => {
      if (!runtime.isAvailable) return
      try {
        const preview = await runtime.prepareFilePreview(item.location)
        const current = queue.value.find(candidate => candidate.id === item.id)
        if (!current || current.location !== item.location) {
          await releaseToken(preview.token ?? null)
          return
        }
        const mediaUrl = preview.token ? runtime.pendingFilePreviewURL(preview.token) : null
        replaceItem(item.id, candidate => ({
          ...candidate,
          resourceKind: preview.kind,
          previewToken: preview.token ?? null,
          mediaUrl
        }))
      } catch {
        // 预览失败时保留 generic fallback；真正的纳入仍由 AddFileResource 校验路径。
      }
    })()
    trackPreparation(item.id, preparation)
  }

  function resolveDuplicate(accept: boolean) {
    const settle = settleDuplicate
    settleDuplicate = null
    duplicatePrompt.value = null
    settle?.(accept)
  }

  function askDuplicate(prompt: LibraryDuplicatePrompt) {
    duplicatePrompt.value = prompt
    return new Promise<boolean>(resolve => {
      settleDuplicate = resolve
    })
  }

  async function confirmBeforeEnqueue(location: string, queried: Set<string>, startedAt: number) {
    // 无 Wails bridge 时没有库可查，直接入队；同一批次内的同一位置只查一次。
    if (!runtime.isAvailable || queried.has(location)) return true
    queried.add(location)
    try {
      const matches = await runtime.findResourceLocationMatches(location, SourceType.SourceTypeFile)
      if (!matches.length) return true
      // 查询在途时用户可能已经关掉添加对话框：此时弹窗会成为没有归属的悬空确认，
      // 按取消放行。调用方的代次检查在 await 之后才发生，那时弹窗已经弹出，来不及。
      if (startedAt !== generation) return false
      return await askDuplicate({ location, matches })
    } catch {
      // 查询失败按未命中处理：这条提示是轻提示，真正的纳入仍由 AddFileResource 校验路径把关，
      // 与 prepareItem 的失败降级同理，不因此让用户无法添加。
      return true
    }
  }

  async function enqueueLocations(locations: string[], startedAt: number) {
    const queued = new Set(queue.value.map(item => item.location))
    const queried = new Set<string>()
    for (const value of locations) {
      if (startedAt !== generation) return
      const location = value.trim()
      if (!location || queued.has(location)) continue
      if (!(await confirmBeforeEnqueue(location, queried, startedAt))) continue
      if (startedAt !== generation) return
      const item: LibraryQueueItem = {
        id: queueId(),
        kind: 'file',
        resourceKind: ResourceKind.ResourceKindFile,
        title: titleFromLocation(location),
        location,
        tags: [],
        previewToken: null,
        mediaUrl: null
      }
      queue.value.push(item)
      queued.add(location)
      prepareItem(item)
    }
  }

  function enqueueFileLocations(locations: string[]) {
    const startedAt = generation
    // 链上不外泄异常：入队是提示性流程，失败只影响单项，不该打断调用方的粘贴/选择路径。
    chain = chain.then(() => enqueueLocations(locations, startedAt)).catch(() => {})
    return chain
  }

  function renameItem(itemId: string, title: string) {
    replaceItem(itemId, item => ({ ...item, title }))
  }

  function setItemTags(itemId: string, tags: string[]) {
    replaceItem(itemId, item => ({ ...item, tags: [...tags] }))
  }

  async function waitForPreview(itemId: string) {
    await preparations.get(itemId)
  }

  async function releasePreview(itemId: string) {
    await waitForPreview(itemId)
    const item = queue.value.find(candidate => candidate.id === itemId)
    if (!item?.previewToken) return
    const token = item.previewToken
    replaceItem(item.id, candidate => ({ ...candidate, previewToken: null, mediaUrl: null }))
    await releaseToken(token)
  }

  async function removeItem(itemId: string) {
    const item = queue.value.find(candidate => candidate.id === itemId)
    if (!item) return
    await waitForPreview(itemId)
    const current = queue.value.find(candidate => candidate.id === itemId)
    if (!current) return
    queue.value = queue.value.filter(candidate => candidate.id !== itemId)
    await releaseToken(current.previewToken)
  }

  async function close() {
    generation += 1
    // 挂着的提示按「取消」裁决，链才不会停在这一项上。
    resolveDuplicate(false)
    await chain
    const items = [...queue.value]
    const pending = [...preparations.values()]
    queue.value = []
    await Promise.allSettled(pending)
    await Promise.allSettled(items.map(item => releaseToken(item.previewToken)))
  }

  return {
    queue,
    duplicatePrompt,
    enqueueFileLocations,
    resolveDuplicate,
    renameItem,
    setItemTags,
    removeItem,
    waitForPreview,
    releasePreview,
    close
  }
}
