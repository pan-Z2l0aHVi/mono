// @vitest-environment jsdom

import type { WebUiDialog } from '@greypan/web-ui'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'

import type {
  ResourceDTO,
  SourceDTO
} from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import { SourceProbeOutcome } from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import {
  ResourceKind,
  SourceType,
  TagColor
} from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRuntime, SourceAvailabilityEventDTO } from '../services/library'
import { useLibraryStore } from '../stores/library'

import LibraryPage from './LibraryPage.vue'

const runtimeStub = {
  current: null as LibraryRuntime | null,
  droppedFilesListener: null as ((paths: string[]) => void) | null,
  availabilityListener: null as ((event: SourceAvailabilityEventDTO) => void) | null,
  availabilityDisposer: null as (() => void) | null
}

vi.mock('@/services/library', () => ({
  createLibraryRuntime: () => {
    if (!runtimeStub.current) throw new Error('测试必须先安装 LibraryRuntime')
    return runtimeStub.current
  }
}))

function source(overrides: Partial<SourceDTO> = {}): SourceDTO {
  return {
    id: 'source-1',
    resource_id: 'resource-1',
    type: SourceType.SourceTypeURL,
    location: 'https://example.com/dead',
    available: false,
    is_preferred: true,
    order_index: 0,
    metadata: null,
    created_at: 100,
    updated_at: 200,
    ...overrides
  }
}

function resource(overrides: Partial<ResourceDTO> = {}): ResourceDTO {
  const preferred = source()
  return {
    id: 'resource-1',
    title: '失效链接',
    note: '',
    kind: ResourceKind.ResourceKindWeb,
    size_bytes: null,
    created_at: 100,
    updated_at: 200,
    sources: [preferred],
    tags: [],
    preferred_source_id: preferred.id,
    ...overrides
  } as ResourceDTO
}

function createRuntime(overrides: Partial<LibraryRuntime> = {}): LibraryRuntime {
  return {
    isAvailable: true,
    listResources: async () => [resource()],
    getResource: async resourceId => resource({ id: resourceId }),
    addFileResource: async () => resource(),
    addURLResource: async () => resource(),
    updateResourceTitle: async (resourceId, title) => resource({ id: resourceId, title }),
    deleteResource: async () => {},
    addTag: async () => ({ id: 'tag-1', name: 'tag', created_at: 1, color: TagColor.TagColorTeal }),
    removeTag: async () => {},
    refreshURLSource: async () => source(),
    refreshFileSource: async () => source({ type: SourceType.SourceTypeFile, location: '/tmp/a.png' }),
    replaceFileSource: async () => source({ type: SourceType.SourceTypeFile, location: '/tmp/b.png' }),
    replaceURLSource: async () => source(),
    chooseFilePaths: async () => [],
    chooseFilePath: async () => null,
    getClipboardFilePaths: async () => [],
    prepareFilePreview: async () => ({ kind: ResourceKind.ResourceKindFile }),
    releaseFilePreview: async () => {},
    findResourceLocationMatches: async () => [],
    probeURLSourceOnOpen: async () => ({
      source: source(),
      outcome: SourceProbeOutcome.SourceProbeOutcomeAvailable
    }),
    openExternal: async () => {},
    resourceMediaURL: () => null,
    pendingFilePreviewURL: () => null,
    subscribeToDroppedFiles: listener => {
      runtimeStub.droppedFilesListener = listener
      return () => {
        runtimeStub.droppedFilesListener = null
      }
    },
    subscribeToPasteFileRequest: () => () => {},
    subscribeToSourceAvailability: listener => {
      runtimeStub.availabilityListener = listener
      runtimeStub.availabilityDisposer = () => {
        runtimeStub.availabilityListener = null
      }
      return runtimeStub.availabilityDisposer
    },
    ...overrides
  }
}

/** vue-router 的 useRoute/useRouter 需要注入；页面只读 path 与 push/back/forward。 */
const route = ref({ path: '/library' })
const router = {
  push: vi.fn<() => Promise<void>>(async () => {}),
  back: vi.fn<() => void>(),
  forward: vi.fn<() => void>()
}

vi.mock('vue-router', () => ({
  useRoute: () => route.value,
  useRouter: () => router
}))

async function mountPage() {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(LibraryPage)
  app.use(createPinia())
  app.mount(host)
  await nextTick()
  await nextTick()
  return {
    host,
    async close() {
      app.unmount()
      host.remove()
    }
  }
}

function row(host: HTMLElement, resourceId: string) {
  const element = host.querySelector<HTMLElement>(`[data-resource-id="${resourceId}"]`)
  if (!element) throw new Error(`row ${resourceId} not found`)
  return element
}

function button(host: HTMLElement, label: string) {
  const element = [...host.querySelectorAll<HTMLElement>('web-ui-button')].find(
    candidate => candidate.textContent?.trim() === label
  )
  if (!element) throw new Error(`button ${label} not found`)
  return element
}

/** 按确认按钮文案定位确认弹窗：页面上同时存在添加、找回等 dialog，靠按钮文案择出唯一的那个。 */
function confirmDialog(host: HTMLElement, confirmLabel: string) {
  const dialog = [...host.querySelectorAll<WebUiDialog>('web-ui-dialog')].find(candidate =>
    [...candidate.querySelectorAll('web-ui-button')].some(item => item.textContent?.trim() === confirmLabel)
  )
  if (!dialog) throw new Error(`confirm dialog for ${confirmLabel} not found`)
  return dialog
}

async function openContextMenuAction(host: HTMLElement, resourceId: string, label: string) {
  row(host, resourceId).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  await nextTick()
  const item = [...host.querySelectorAll<HTMLElement>('web-ui-dropdown-item')].find(
    candidate => candidate.textContent?.trim() === label
  )
  if (!item) throw new Error(`context menu item ${label} not found`)
  item.click()
  await nextTick()
}

/** jsdom 没有 ClipboardEvent 构造器；dialog 读的只有 clipboardData.getData('text')。 */
function paste(text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } })
  window.dispatchEvent(event)
}

async function openAddDialog(host: HTMLElement) {
  const trigger = host.querySelector<HTMLElement>('web-ui-button[aria-label="添加资源"]')
  if (!trigger) throw new Error('添加资源按钮未渲染')
  trigger.click()
  await nextTick()
}

function queueItems(host: HTMLElement) {
  return [...host.querySelectorAll('web-ui-dialog ol > li')]
}

/** jsdom 不实现 matchMedia；页面只在启动时读一次 matches 并订阅 change。 */
function matchMediaStub() {
  return {
    matches: false,
    media: '',
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false
  } as unknown as MediaQueryList
}

/** 入队链和确认动作都是多段 await：nextTick 只排一次渲染，这里把微任务队列排空。 */
async function flush() {
  for (let index = 0; index < 20; index += 1) await Promise.resolve()
  await nextTick()
}

describe('LibraryPage：可用性感知接线', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.value = { path: '/library' }
    runtimeStub.droppedFilesListener = null
    runtimeStub.availabilityListener = null
    runtimeStub.availabilityDisposer = null
    runtimeStub.current = createRuntime()
    window.matchMedia = vi.fn<() => MediaQueryList>(matchMediaStub)
  })

  afterEach(() => {
    runtimeStub.current = null
  })

  it('打开详情：失效的 URL 首选 source 恰好触发一次探测', async () => {
    const probeURLSourceOnOpen = vi.fn<LibraryRuntime['probeURLSourceOnOpen']>(async () => ({
      source: source(),
      outcome: SourceProbeOutcome.SourceProbeOutcomeAvailable
    }))
    runtimeStub.current = createRuntime({ probeURLSourceOnOpen })
    const mounted = await mountPage()

    try {
      row(mounted.host, 'resource-1').click()
      await nextTick()
      await nextTick()

      expect(probeURLSourceOnOpen).toHaveBeenCalledExactlyOnceWith('source-1')
    } finally {
      await mounted.close()
    }
  })

  it('打开详情：已可用的 URL 首选 source 不触发探测', async () => {
    const probeURLSourceOnOpen = vi.fn<LibraryRuntime['probeURLSourceOnOpen']>()
    runtimeStub.current = createRuntime({
      listResources: async () => [resource({ sources: [source({ available: true })] })],
      probeURLSourceOnOpen
    })
    const mounted = await mountPage()

    try {
      row(mounted.host, 'resource-1').click()
      await nextTick()
      await nextTick()

      expect(probeURLSourceOnOpen).not.toHaveBeenCalled()
    } finally {
      await mounted.close()
    }
  })

  it('打开详情：file 首选 source 不触发探测', async () => {
    const probeURLSourceOnOpen = vi.fn<LibraryRuntime['probeURLSourceOnOpen']>()
    runtimeStub.current = createRuntime({
      listResources: async () => [
        resource({
          kind: ResourceKind.ResourceKindImage,
          sources: [source({ type: SourceType.SourceTypeFile, location: '/tmp/missing.png', available: false })]
        })
      ],
      probeURLSourceOnOpen
    })
    const mounted = await mountPage()

    try {
      row(mounted.host, 'resource-1').click()
      await nextTick()
      await nextTick()

      expect(probeURLSourceOnOpen).not.toHaveBeenCalled()
    } finally {
      await mounted.close()
    }
  })

  it('收到可用性事件后就地翻转行状态，无需手动刷新', async () => {
    runtimeStub.current = createRuntime({
      listResources: async () => [
        resource({
          kind: ResourceKind.ResourceKindImage,
          size_bytes: 128,
          sources: [source({ type: SourceType.SourceTypeFile, location: '/tmp/a.png', available: true })]
        })
      ]
    })
    const mounted = await mountPage()

    try {
      expect(useLibraryStore().resources[0]?.available).toBe(true)
      runtimeStub.availabilityListener?.({
        source_id: 'source-1',
        resource_id: 'resource-1',
        type: 'file',
        available: false,
        changed_at: 300
      })
      await nextTick()

      expect(useLibraryStore().resources[0]?.available).toBe(false)
    } finally {
      await mounted.close()
    }
  })

  it('卸载时退订可用性事件', async () => {
    const mounted = await mountPage()
    expect(runtimeStub.availabilityListener).not.toBeNull()

    await mounted.close()

    expect(runtimeStub.availabilityDisposer).toBeTypeOf('function')
    expect(runtimeStub.availabilityListener).toBeNull()
  })

  it('根节点带 slot="header" 交给 AppLayout 的 layout，其余根节点走默认 slot', async () => {
    const mounted = await mountPage()

    // 页面是 shell 的子节点：这两个 slot 各要一个直属子节点，少一个 header 就会掉进 main。
    const header = mounted.host.querySelector<HTMLElement>(':scope > [slot="header"]')
    expect(header?.tagName).toBe('HEADER')
    expect(mounted.host.querySelector(':scope > web-ui-back-top')).toBeTruthy()

    await mounted.close()
  })
})

/*
 * #189：确认弹窗取消时的退场跳变。
 *
 * 根因是 open 与内容生命周期被绑在同一个 tick：closeConfirmDialog 把 confirmRequest 置空，
 * 标题/说明/按钮文案同时塌成空串，弹窗高度单帧塌掉 61.6px；紧凑变体的宽度还从标题字符串
 * 派生，一并从 320px 跳回 360px。dialog 的退场动画有 260ms，期间弹窗一直可见，所以这段
 * 期间的内容与宽度必须原样保留。
 */
describe('LibraryPage：确认弹窗退场', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.value = { path: '/library' }
    runtimeStub.droppedFilesListener = null
    runtimeStub.availabilityListener = null
    runtimeStub.availabilityDisposer = null
    runtimeStub.current = createRuntime()
    window.matchMedia = vi.fn<() => MediaQueryList>(matchMediaStub)
  })

  afterEach(() => {
    runtimeStub.current = null
  })

  it('取消后弹窗进入关闭态但内容保持原样，不再塌成空串', async () => {
    const mounted = await mountPage()

    try {
      await openContextMenuAction(mounted.host, 'resource-1', '删除')
      const dialog = confirmDialog(mounted.host, '删除')
      expect(dialog.open).toBe(true)
      expect(dialog.textContent).toContain('删除「失效链接」后无法恢复。')

      button(dialog, '取消').click()
      await nextTick()

      expect(dialog.open).toBe(false)
      // 退场期间仍可见：内容一旦清空，盒子会在第一帧塌陷。
      expect(dialog.textContent).toContain('删除「失效链接」后无法恢复。')
      expect(dialog.querySelector('[role="alert"]')).toBeNull()
    } finally {
      await mounted.close()
    }
  })

  it('紧凑变体取消后仍保持 320px 宽度声明', async () => {
    const mounted = await mountPage()

    try {
      // 走「移除待添加项」：这条路径此前用标题字符串派生 compact，宽度会在退场中途跳变。
      mounted.host.querySelector<HTMLElement>('web-ui-button[aria-label="添加资源"]')?.click()
      await nextTick()
      runtimeStub.droppedFilesListener?.(['/tmp/photo.png'])
      await flush()
      const remove = mounted.host.querySelector<HTMLElement>('web-ui-button[aria-label="移除待添加资源"]')
      if (!remove) throw new Error('移除待添加资源按钮未渲染')
      remove.click()
      await nextTick()

      const dialog = confirmDialog(mounted.host, '移除')
      const widthClass = '[--wui-dialog-width:320px]'
      expect(dialog.open).toBe(true)
      expect(dialog.getAttribute('class')).toContain(widthClass)

      button(dialog, '取消').click()
      await nextTick()

      expect(dialog.open).toBe(false)
      expect(dialog.getAttribute('class')).toContain(widthClass)
      expect(dialog.textContent).toContain('移除「photo」后不会加入资源库。')
    } finally {
      await mounted.close()
    }
  })

  it('确认失败时弹窗保持打开、错误可见且可再次点击确认', async () => {
    const deleteResource = vi
      .fn<LibraryRuntime['deleteResource']>()
      .mockRejectedValueOnce(new Error('资源正在被使用'))
      .mockResolvedValueOnce(undefined)
    runtimeStub.current = createRuntime({ deleteResource })
    const mounted = await mountPage()

    try {
      await openContextMenuAction(mounted.host, 'resource-1', '删除')
      const dialog = confirmDialog(mounted.host, '删除')

      button(dialog, '删除').click()
      await nextTick()
      await flush()

      expect(dialog.open).toBe(true)
      expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('资源正在被使用')
      expect(useLibraryStore().resources).toHaveLength(1)

      button(dialog, '删除').click()
      await flush()

      expect(deleteResource).toHaveBeenCalledTimes(2)
      expect(dialog.open).toBe(false)
      expect(useLibraryStore().resources).toHaveLength(0)
    } finally {
      await mounted.close()
    }
  })
})

/*
 * #188：粘贴网页链接。
 *
 * OS 的剪贴板文件接口只认文件，剪贴板里是链接时返回空数组。原先这条路径零次迭代就结束，
 * 既不添加也不报错；现在拿不到文件时把剪贴板文本按链接再解析一次，文本不是合法 http/https
 * 时给一句可读的错误。
 */
describe('LibraryPage：粘贴链接', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.value = { path: '/library' }
    runtimeStub.droppedFilesListener = null
    runtimeStub.availabilityListener = null
    runtimeStub.availabilityDisposer = null
    runtimeStub.current = createRuntime()
    window.matchMedia = vi.fn<() => MediaQueryList>(matchMediaStub)
  })

  afterEach(() => {
    runtimeStub.current = null
  })

  it('粘贴 http/https 链接入队为 URL 项，重复检查按 URL 来源走', async () => {
    const findResourceLocationMatches = vi.fn<LibraryRuntime['findResourceLocationMatches']>(async () => [])
    runtimeStub.current = createRuntime({ findResourceLocationMatches })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      paste(' https://example.com/article ')
      await flush()

      expect(findResourceLocationMatches).toHaveBeenCalledWith('https://example.com/article', SourceType.SourceTypeURL)
      const items = queueItems(mounted.host)
      expect(items).toHaveLength(1)
      // 标题留空给后端定名，队列列表用主机名兜底，完整链接落在位置栏。
      expect(items[0]?.textContent).toContain('example.com')
      expect(items[0]?.textContent).toContain('https://example.com/article')
    } finally {
      await mounted.close()
    }
  })

  it('粘贴非法文本不入队并给出可读的中文错误', async () => {
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      paste('这是一段普通文字')
      await flush()

      expect(queueItems(mounted.host)).toHaveLength(0)
      expect(mounted.host.querySelector('web-ui-dialog [role="alert"]')?.textContent).toContain(
        '剪贴板里没有文件，也不是有效的 http 或 https 链接'
      )
    } finally {
      await mounted.close()
    }
  })

  it('非 http/https 协议同样判为无效', async () => {
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      paste('file:///tmp/a.png')
      await flush()

      expect(queueItems(mounted.host)).toHaveLength(0)
      expect(mounted.host.querySelector('web-ui-dialog [role="alert"]')?.textContent).toContain('http 或 https')
    } finally {
      await mounted.close()
    }
  })

  it('剪贴板有文件时仍走文件路径，链接文本不参与入队', async () => {
    const prepareFilePreview = vi.fn<LibraryRuntime['prepareFilePreview']>(async () => ({
      kind: ResourceKind.ResourceKindImage,
      token: 'opaque-token'
    }))
    runtimeStub.current = createRuntime({
      getClipboardFilePaths: async () => ['/tmp/photo.png'],
      prepareFilePreview
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      paste('https://example.com/article')
      await flush()

      const items = queueItems(mounted.host)
      expect(items).toHaveLength(1)
      expect(items[0]?.textContent).toContain('/tmp/photo.png')
      expect(prepareFilePreview).toHaveBeenCalledWith('/tmp/photo.png')
    } finally {
      await mounted.close()
    }
  })

  it('提交时 URL 项走 addURLResource，资源出现在列表', async () => {
    const addURLResource = vi.fn<LibraryRuntime['addURLResource']>(async inputURL =>
      resource({ title: '示例文章', sources: [source({ location: inputURL, available: true })] })
    )
    const addFileResource = vi.fn<LibraryRuntime['addFileResource']>(async () => resource())
    runtimeStub.current = createRuntime({ addFileResource, addURLResource })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      paste('https://example.com/article')
      await flush()
      button(mounted.host, '添加').click()
      await flush()

      expect(addURLResource).toHaveBeenCalledExactlyOnceWith('https://example.com/article')
      expect(addFileResource).not.toHaveBeenCalled()
      expect(useLibraryStore().resources[0]?.title).toBe('示例文章')
    } finally {
      await mounted.close()
    }
  })
})
