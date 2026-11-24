import { computed, ref, type ComputedRef, type Ref } from 'vue'

import type { LibraryQueueItem, LibraryRuntime } from '@/services/library'

import type { ResourceLocationMatchDTO } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import {
  ResourceKind,
  SourceType
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import type { PreviewLease } from './previewLease'

type PreviewRuntime = Pick<LibraryRuntime, 'isAvailable' | 'resources'>

type QueueKind = LibraryQueueItem['kind']

/** 两类入口在「重复检查的来源类型」和「入队时的默认 kind」上成对出现，改一处就要改两处。 */
const KIND_BY_SOURCE: Record<QueueKind, { sourceType: SourceType; resourceKind: ResourceKind }> = {
  file: { sourceType: SourceType.SourceTypeFile, resourceKind: ResourceKind.ResourceKindFile },
  url: { sourceType: SourceType.SourceTypeURL, resourceKind: ResourceKind.ResourceKindWeb }
}

/** 单个待入队位置的重复提示：库里已登记该入口的资源。 */
export interface LibraryDuplicatePrompt {
  kind: QueueKind
  location: string
  matches: ResourceLocationMatchDTO[]
}

export interface LibraryAddQueueController {
  queue: Ref<LibraryQueueItem[]>
  /** 当前等待用户裁决的重复提示；null 表示没有待裁决项。页面据此渲染 dialog。 */
  duplicatePrompt: Ref<LibraryDuplicatePrompt | null>
  /** 正在逐项提交资源；页面据此禁用提交入口。 */
  submitting: Ref<boolean>
  /**
   * 最近一段长流程的进度（done / total）。入队链按「已处理位置数」推进，
   * 提交循环按「已结算项数」推进；submit 会先等入队链收尾再开始，两阶段严格串行，
   * 因此共用一个 ref 不会交错，供加载中的按钮直接展示「已处理 / 总数」。
   */
  progress: ComputedRef<{ done: number; total: number }>
  /** 在批量入队确认放行前把共享进度重置为本批规模（0 / total），收口 progress 写入权。 */
  prepareBatchProgress(total: number): void
  enqueueFileLocations(locations: string[]): Promise<void>
  enqueueURL(url: string): Promise<void>
  /** 裁决当前重复提示；accept=false（取消）时该项不入队。 */
  resolveDuplicate(accept: boolean): void
  renameItem(itemId: string, title: string): void
  setItemTags(itemId: string, tags: string[]): void
  removeItem(itemId: string): Promise<void>
  waitForPreview(itemId: string): Promise<void>
  releasePreview(itemId: string): Promise<void>
  /**
   * 逐项提交整个队列。每项按 waitForPreview → create → releasePreview 结算 preview token，
   * 全部成功后 close() 收尾并返回 true；任一项失败时按 remaining 回卷队列（已成功的项移出，
   * 未处理的项原样保留），失败原因原样抛给调用方展示。
   */
  submit(create: (item: LibraryQueueItem) => Promise<void>): Promise<boolean>
  close(): Promise<void>
}

function queueId(kind: QueueKind) {
  return `queue-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function titleFromLocation(location: string) {
  return (
    location
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/\.[^.]+$/, '') || location
  )
}

/**
 * 队列项的显示标题。
 *
 * URL 项入队时标题留空（后端会按 hostname 或页面 <title> 定名，预填会把它覆盖掉），
 * 入队列表与确认文案改用主机名兜底展示，完整链接由位置栏承担。
 */
export function queueItemTitle(item: LibraryQueueItem) {
  if (item.title) return item.title
  if (item.kind !== 'url') return item.location
  try {
    return new URL(item.location).host
  } catch {
    return item.location
  }
}

export function createLibraryAddQueue(runtime: PreviewRuntime, lease: PreviewLease): LibraryAddQueueController {
  const queue = ref<LibraryQueueItem[]>([])
  // id → 队列项的镜像索引：replaceItem/validity 查找在万级批次下必须 O(1)。
  // 结构性变更（过滤、清空）后必须调用 rebuildQueueIndex 重建镜像。
  const queueById = new Map<string, LibraryQueueItem>()
  const duplicatePrompt = ref<LibraryDuplicatePrompt | null>(null)
  const submitting = ref(false)
  const progress = ref({ done: 0, total: 0 })
  const readonlyProgress = computed(() => progress.value)
  let settleDuplicate: ((accept: boolean) => void) | null = null
  // 逐项查询与逐项确认都是异步的：串在一条链上，弹窗才不会叠加，顺序也与提交顺序一致。
  let chain: Promise<void> = Promise.resolve()
  // close() 递增代次，让链上尚未处理的位置作废：添加 dialog 已经关掉，剩余项不再弹窗。
  let generation = 0

  function rebuildQueueIndex() {
    queueById.clear()
    for (const item of queue.value) queueById.set(item.id, item)
  }

  function replaceItem(itemId: string, update: (item: LibraryQueueItem) => LibraryQueueItem) {
    // 大批次下每项都会走这里：经索引定位并原位合并，避免整表复制随项数平方增长。
    // 索引里必须存响应式代理：push 会对入参执行 toRaw，直接改原始对象不触发任何依赖。
    const current = queueById.get(itemId)
    if (!current) return
    Object.assign(current, update(current))
  }

  function prepareItem(item: LibraryQueueItem) {
    void lease
      .prepare(item.id, item.location, () => queueById.get(item.id)?.location === item.location)
      .then(entry => {
        if (!entry) return
        const current = queueById.get(item.id)
        if (!current || current.location !== item.location) return
        // previewToken/mediaUrl 只作结算簿记；渲染读 lease.entries，驱逐后立即回落 fallback。
        replaceItem(item.id, candidate => ({
          ...candidate,
          resourceKind: entry.kind,
          previewToken: entry.token,
          mediaUrl: entry.mediaUrl
        }))
      })
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

  // decisions 记录同一批次内每个位置已给出的裁决：同一位置只查、只问一次，
  // 且取消过的位置在后续重复项上继续跳过，不会被自动放行。
  async function confirmBeforeEnqueue(
    location: string,
    kind: QueueKind,
    decisions: Map<string, boolean>,
    startedAt: number
  ) {
    // 无 Wails bridge 时没有库可查，直接入队。
    if (!runtime.isAvailable) return true
    const decided = decisions.get(location)
    if (decided !== undefined) return decided
    try {
      const matches = await runtime.resources.findLocationMatches(location, KIND_BY_SOURCE[kind].sourceType)
      if (!matches.length) {
        decisions.set(location, true)
        return true
      }
      // 查询在途时用户可能已经关掉添加 dialog：此时弹窗会成为没有归属的悬空确认，
      // 按取消放行。调用方的代次检查在 await 之后才发生，那时弹窗已经弹出，来不及。
      if (startedAt !== generation) return false
      const accept = await askDuplicate({ kind, location, matches })
      decisions.set(location, accept)
      return accept
    } catch {
      // 查询失败按未命中处理：这条提示是轻提示，真正的纳入仍由 CreateResource 校验路径把关，
      // 与 prepareItem 的失败降级同理，不因此让用户无法添加。
      return true
    }
  }

  async function enqueueLocations(kind: QueueKind, locations: string[], startedAt: number) {
    const queued = new Set(queue.value.map(item => item.location))
    const decisions = new Map<string, boolean>()
    // 进度按「已消费的输入位置」计：入队、重复跳过与取消裁决都算处理完成，
    // 这样加载中的按钮展示的比值始终收敛到 total，不会停在中间值。
    progress.value = { done: 0, total: locations.length }
    for (const [index, value] of locations.entries()) {
      if (startedAt !== generation) return
      const settle = () => {
        progress.value = { ...progress.value, done: index + 1 }
      }
      const location = value.trim()
      if (!location || queued.has(location)) {
        settle()
        continue
      }
      if (!(await confirmBeforeEnqueue(location, kind, decisions, startedAt))) {
        settle()
        continue
      }
      if (startedAt !== generation) return
      const item: LibraryQueueItem = {
        id: queueId(kind),
        kind,
        resourceKind: KIND_BY_SOURCE[kind].resourceKind,
        // URL 的名字交给后端定（hostname 或页面 <title>）：这里预填一个猜测值，提交时
        // 会把后端已经取好的名字覆盖掉。addResource 只在标题非空时才改名。
        title: kind === 'url' ? '' : titleFromLocation(location),
        location,
        tags: [],
        previewToken: null,
        mediaUrl: null
      }
      queue.value.push(item)
      // 从 ref 读回的就是代理：保存它，后续 replaceItem 的原位写入才会触发依赖。
      const stored = queue.value[queue.value.length - 1]!
      queueById.set(stored.id, stored)
      queued.add(location)
      // 只有文件能本地准备预览，URL 的入口要等后端抓过才知道它是什么。
      if (kind === 'file') prepareItem(item)
      settle()
    }
  }

  function enqueue(kind: QueueKind, locations: string[]) {
    const startedAt = generation
    // 链上不外泄异常：入队是提示性流程，失败只影响单项，不该打断调用方的粘贴/选择路径。
    chain = chain.then(() => enqueueLocations(kind, locations, startedAt)).catch(() => {})
    return chain
  }

  function prepareBatchProgress(total: number) {
    progress.value = { done: 0, total }
  }

  function enqueueFileLocations(locations: string[]) {
    return enqueue('file', locations)
  }

  function enqueueURL(url: string) {
    return enqueue('url', [url])
  }

  function renameItem(itemId: string, title: string) {
    replaceItem(itemId, item => ({ ...item, title }))
  }

  function setItemTags(itemId: string, tags: string[]) {
    replaceItem(itemId, item => ({ ...item, tags: [...tags] }))
  }

  async function waitForPreview(itemId: string) {
    await lease.awaitSettled(itemId)
  }

  async function releasePreview(itemId: string) {
    await waitForPreview(itemId)
    const item = queue.value.find(candidate => candidate.id === itemId)
    if (!item?.previewToken) {
      await lease.revoke(itemId)
      return
    }
    replaceItem(item.id, candidate => ({ ...candidate, previewToken: null, mediaUrl: null }))
    await lease.revoke(item.id)
  }

  async function removeItem(itemId: string) {
    const item = queueById.get(itemId)
    if (!item) return
    await waitForPreview(itemId)
    if (!queueById.has(itemId)) return
    const index = queue.value.indexOf(item)
    if (index >= 0) queue.value.splice(index, 1)
    queueById.delete(itemId)
    await lease.revoke(itemId)
  }

  async function close() {
    generation += 1
    // 挂着的提示按「取消」裁决，链才不会停在这一项上。
    resolveDuplicate(false)
    await chain
    const itemIds = queue.value.map(item => item.id)
    queue.value = []
    queueById.clear()
    // lease 与找回弹窗共用，这里只撤销本队列的 key，不整体清空。
    await Promise.allSettled(itemIds.map(itemId => lease.revoke(itemId)))
  }

  async function submit(create: (item: LibraryQueueItem) => Promise<void>): Promise<boolean> {
    if (submitting.value) return false
    submitting.value = true
    // 入队链还在推进时提交会结算出半批队列，close 再把剩余项整批丢弃——先等链收尾，
    // 快照才是完整批次，progress 的共用前提（两阶段严格串行）也因此成立。
    // 链上挂着重复提示时它会保持模态，用户裁决后链结束、提交继续；链自身吞掉异常，不会 reject。
    await chain
    if (!queue.value.length) {
      submitting.value = false
      return false
    }
    // 以链结算后的队列快照为准；remaining 记录尚未成功落库的项，失败时按它回卷。
    const remaining = new Set(queue.value.map(item => item.id))
    const items = [...queue.value]
    // 进度按「已成功落库的项」计；失败项在错误抛出前只结算 preview，不计入已导入。
    progress.value = { done: 0, total: items.length }
    try {
      for (const item of items) {
        await waitForPreview(item.id)
        try {
          await create(item)
          remaining.delete(item.id)
        } finally {
          // 失败的项同样要结算：token 是预览资源，失败不豁免释放。
          await releasePreview(item.id)
        }
        progress.value = { ...progress.value, done: progress.value.done + 1 }
      }
      await close()
      return true
    } catch (cause) {
      queue.value = queue.value.filter(item => remaining.has(item.id))
      rebuildQueueIndex()
      throw cause
    } finally {
      submitting.value = false
    }
  }

  return {
    queue,
    duplicatePrompt,
    submitting,
    progress: readonlyProgress,
    prepareBatchProgress,
    enqueueFileLocations,
    enqueueURL,
    resolveDuplicate,
    renameItem,
    setItemTags,
    removeItem,
    waitForPreview,
    releasePreview,
    submit,
    close
  }
}
