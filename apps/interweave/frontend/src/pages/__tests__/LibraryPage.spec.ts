// @vitest-environment jsdom

import type { WebUiDialog } from '@greypan/web-ui'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'

import type {
  ResourceDTO,
  SourceDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import { SourceProbeOutcome } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import {
  ResourceKind,
  SourceType
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import { stubLayout } from '../../components/library/__tests__/virtualLayout'
import {
  MENU_FOCUS_SEARCH_EVENT,
  MENU_IMPORT_FROM_LINK_EVENT,
  MENU_REFRESH_EVENT,
  MENU_TOGGLE_FILTER_BAR_EVENT
} from '../../composables/menuActions'
import { queueWindowFileDrop, queueWindowURLDrop } from '../../composables/windowFileDrop'
import type { LibraryRuntime, SourceAvailabilityEventDTO } from '../../services/library'
import { useLibraryStore } from '../../stores/library'
import LibraryPage from '../library/index.vue'

// 页面测试只验证事件接线；原生弹层行为由组件浏览器测试覆盖。
vi.mock('@greypan/web-ui/components/context-menu', () => {
  class WebUiContextMenu extends HTMLElement {
    openAt() {}
    close() {}
  }
  customElements.define('web-ui-context-menu', WebUiContextMenu)
  return { WebUiContextMenu }
})

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

const toastWarning = vi.hoisted(() => vi.fn<(message: string, options: { position: string }) => void>())

vi.mock('@greypan/web-ui', () => ({
  toast: { warning: toastWarning },
  imagePreview: () => {
    throw new Error('图片预览由 AddDialog 组件用例覆盖')
  }
}))

// 页面用例验证事件接线；真实滚动容器的挂载保留在 PreviewDrawer / DetailDrawer 组件用例。
vi.mock('overlayscrollbars-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    OverlayScrollbarsComponent: defineComponent({
      inheritAttrs: false,
      props: ['options'],
      setup:
        (_, { attrs, slots }) =>
        () =>
          h('div', attrs, slots.default?.())
    })
  }
})

// 页面通过宿主 click 接线；button 的 shadow DOM 和原生命中由 web-ui 组件用例覆盖。
vi.mock('@greypan/web-ui/components/button', () => {
  class WebUiButton extends HTMLElement {
    disabled = false
    loading = false
    override click() {
      if (!this.disabled && !this.loading) super.click()
    }
  }
  customElements.define('web-ui-button', WebUiButton)
  return { WebUiButton }
})

// 页面验证 controlled open 与内容保留；模态、动画和命中由 web-ui 的浏览器用例覆盖。
vi.mock('@greypan/web-ui/components/dialog', () => {
  class WebUiDialog extends HTMLElement {
    open = false
  }
  customElements.define('web-ui-dialog', WebUiDialog)
  return { WebUiDialog }
})

vi.mock('@greypan/web-ui/components/drawer', () => {
  class WebUiDrawer extends HTMLElement {
    open = false
  }
  customElements.define('web-ui-drawer', WebUiDrawer)
  return { WebUiDrawer }
})

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
  return {
    id: 'resource-1',
    title: '失效链接',
    note: '',
    kind: ResourceKind.ResourceKindWeb,
    size_bytes: null,
    created_at: 100,
    updated_at: 200,
    sources: [source()],
    tags: [],
    ...overrides
  } as ResourceDTO
}

type RuntimeOverrides = {
  isAvailable?: boolean
  resources?: Partial<LibraryRuntime['resources']>
  sources?: Partial<LibraryRuntime['sources']>
  media?: Partial<LibraryRuntime['media']>
  events?: Partial<LibraryRuntime['events']>
  system?: Partial<LibraryRuntime['system']>
}

function createRuntime(overrides: RuntimeOverrides = {}): LibraryRuntime {
  return {
    isAvailable: overrides.isAvailable ?? true,
    resources: {
      list: async () => [resource()],
      get: async resourceId => resource({ id: resourceId }),
      create: async () => resource(),
      updateTitle: async (resourceId, title) => resource({ id: resourceId, title }),
      updateNote: async (resourceId, note) => resource({ id: resourceId, note }),
      remove: async () => {},
      setTags: async () => resource(),
      findLocationMatches: async () => [],
      // 默认按「文件原样通过」展开：既有的文件拖入/粘贴用例路径不经变换直接入队。
      expandImportEntries: async paths => ({ files: paths, folders: 0 }),
      prepareFilePreview: async () => ({ kind: ResourceKind.ResourceKindFile }),
      releaseFilePreview: async () => {},
      ...overrides.resources
    },
    sources: {
      startRecoveryScan: async () => 'scan',
      pollRecoveryScan: async () => ({
        candidates: [],
        checked: 0,
        currentDirectory: '',
        skipped: 0,
        done: true,
        cancelled: false,
        error: ''
      }),
      cancelRecoveryScan: async () => undefined,
      discardRecoveryScan: async () => undefined,
      replaceScannedFile: async () => {
        throw new Error('not implemented')
      },
      refreshSource: async () => resource(),
      replaceSource: async () => resource(),
      probeOnOpen: async () => ({
        source: source(),
        resource: resource(),
        outcome: SourceProbeOutcome.SourceProbeOutcomeAvailable
      }),
      ...overrides.sources
    },
    media: {
      saveThumbnail: async () => {},
      ...overrides.media
    },
    events: {
      onFilesDropped: listener => {
        runtimeStub.droppedFilesListener = listener
        return () => {
          runtimeStub.droppedFilesListener = null
        }
      },
      onURLsDropped: () => () => {},
      onSourceAvailability: listener => {
        runtimeStub.availabilityListener = listener
        runtimeStub.availabilityDisposer = () => {
          runtimeStub.availabilityListener = null
        }
        return runtimeStub.availabilityDisposer
      },
      onPreviewRevoked: () => () => {},
      ...overrides.events
    },
    system: {
      chooseDirectory: async () => null,
      chooseFilePaths: async () => [],
      chooseFilePath: async () => null,
      getClipboardFilePaths: async () => [],
      readClipboardText: async () => '',
      writeClipboardText: async () => {},
      defaultOpenWith: async () => '',
      showInFileManager: async () => {},
      openExternal: async () => {},
      ...overrides.system
    }
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

const mountedPages = new Set<() => void>()

async function mountPage(mark: (stage: string) => void = () => {}) {
  // 页面里的资源列表是虚拟滚动的，jsdom 没有布局时它算不出窗口、一行都不渲染。见
  // components/library/__tests__/virtualLayout。
  const restoreLayout = stubLayout()
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(LibraryPage)
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    mark('unmount:start')
    try {
      app.unmount()
      mark('unmount:end')
    } finally {
      try {
        host.remove()
      } finally {
        try {
          restoreLayout()
          mark('layout:restored')
        } finally {
          mountedPages.delete(close)
        }
      }
    }
  }
  mountedPages.add(close)
  try {
    app.use(createPinia())
    mark('mount:start')
    app.mount(host)
    mark('mount:end')
    await nextTick()
    mark('mount:tick1')
    await nextTick()
    mark('mount:tick2')
  } catch (error) {
    try {
      close()
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'LibraryPage mount and cleanup failed')
    }
    throw error
  }
  return {
    host,
    async close() {
      close()
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

/** 按确认 button 文案定位确认弹窗：页面上同时存在添加、找回等 dialog，靠 button 文案择出唯一的那个。 */
function confirmDialog(host: HTMLElement, confirmLabel: string) {
  const dialog = [...host.querySelectorAll<WebUiDialog>('web-ui-dialog')].find(candidate =>
    [...candidate.querySelectorAll('web-ui-button')].some(item => item.textContent?.trim() === confirmLabel)
  )
  if (!dialog) throw new Error(`confirm dialog for ${confirmLabel} not found`)
  return dialog
}

async function openContextMenuAction(host: HTMLElement, resourceId: string, label: string) {
  row(host, resourceId).focus()
  await nextTick()
  row(host, resourceId).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  await nextTick()
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
  const trigger = host.querySelector<HTMLElement>('web-ui-button[aria-label="导入资源"]')
  if (!trigger) throw new Error('导入资源 button 未渲染')
  trigger.click()
  await nextTick()
}

function queueItems(host: HTMLElement) {
  return [...host.querySelectorAll('web-ui-dialog ol > li')]
}

/** AddDialog 是页面上唯一带「导入资源」header 的 dialog；按 slot 文本定位。 */
function addDialog(host: HTMLElement): HTMLElement {
  const dialog = [...host.querySelectorAll('web-ui-dialog')].find(node =>
    node.querySelector('span[slot="header"]')?.textContent?.trim().includes('导入资源')
  )
  if (!(dialog instanceof HTMLElement)) throw new Error('没有找到导入资源 dialog')
  return dialog
}

/** dialog 的 open 是 reflect 属性，jsdom 里按属性读；没升级成自定义元素时退回读 attribute。 */
function dialogOpen(dialog: HTMLElement) {
  return (dialog as HTMLElement & { open?: boolean }).open ?? dialog.hasAttribute('open')
}

/** drawer 的 open 是 reflect 属性，jsdom 里按属性读；没升级成自定义元素时退回读 attribute。 */
function drawerOpen(host: HTMLElement, label: string) {
  const drawer = host.querySelector(`web-ui-drawer[aria-dialog-label="${label}"]`) as
    | (HTMLElement & { open?: boolean })
    | null
  if (!drawer) throw new Error(`没有找到「${label}」drawer`)
  return drawer.open ?? drawer.hasAttribute('open')
}

/*
 * 详情只从 context menu 进（列表左键是预览）。先右键唤起 menu，再点「详情」那一项。
 */
async function openDetailFromMenu(host: HTMLElement) {
  row(host, 'resource-1').focus()
  await nextTick()
  row(host, 'resource-1').dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 4, clientY: 4 })
  )
  await nextTick()
  await nextTick()
  const item = [...host.querySelectorAll('web-ui-dropdown-item')].find(node => node.textContent?.trim() === '详情')
  if (!item) throw new Error('context menu 里没有「详情」项')
  item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
  await nextTick()
}

/** fixture 的 runtime 返回链只派生 microtask；deferred 的完成仍由各用例显式放行。 */
async function flush() {
  await new Promise<void>(resolve => setImmediate(resolve))
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
  })

  afterEach(() => {
    const errors: unknown[] = []
    for (const close of mountedPages) {
      try {
        close()
      } catch (error) {
        errors.push(error)
      }
    }
    runtimeStub.current = null
    if (errors.length) throw new AggregateError(errors, 'LibraryPage fixture cleanup failed')
  })

  /*
   * 探测的分支判定（只对失效的 URL source 探测、file 不探测等）归 useLibraryRuntime.spec
   * ——composable 层已逐分支覆盖，页面层不重复。这里只守页面接线：
   * 左键走预览 drawer、不踩详情那一路的探测。
   */
  it('左键行进的是预览 drawer，不开详情也不探测', async ({ onTestFailed }) => {
    const started = performance.now()
    const stages: { stage: string; elapsed: number }[] = []
    const mark = (stage: string) => stages.push({ stage, elapsed: Math.round(performance.now() - started) })
    onTestFailed(() => console.error('LibraryPage first-case phases', JSON.stringify(stages)))
    const probeOnOpen = vi.fn<LibraryRuntime['sources']['probeOnOpen']>()
    runtimeStub.current = createRuntime({
      sources: { probeOnOpen },
      resources: {
        list: async () => {
          mark('listResources:return')
          return [resource()]
        }
      }
    })
    const mounted = await mountPage(mark)

    try {
      mark('click:start')
      row(mounted.host, 'resource-1').click()
      mark('click:end')
      await nextTick()
      mark('click:tick1')
      await nextTick()
      mark('click:tick2')

      expect(drawerOpen(mounted.host, '资源预览')).toBe(true)
      expect(drawerOpen(mounted.host, '资源详情')).toBe(false)
      const preview = mounted.host.querySelector<HTMLIFrameElement>(
        'web-ui-drawer[aria-dialog-label="资源预览"] iframe'
      )
      expect(preview?.getAttribute('src')).toBe('https://example.com/dead')
      expect(preview?.getAttribute('title')).toBe('失效链接 网页预览')
      expect(probeOnOpen).not.toHaveBeenCalled()
      mark('assertions:end')
    } finally {
      await mounted.close()
    }
  })

  it('有活动筛选时，展开的筛选按钮仍保持玻璃样式并可收起', async () => {
    const mounted = await mountPage()
    try {
      useLibraryStore().filterSource = SourceType.SourceTypeFile
      await nextTick()
      const filterButton = mounted.host.querySelector<HTMLElement>('web-ui-button[aria-label="筛选和排序"]')!
      expect(filterButton.getAttribute('variant')).toBe('glass')
      filterButton.click()
      await nextTick()
      expect(filterButton.getAttribute('aria-expanded')).toBe('true')
      expect(filterButton.getAttribute('variant')).toBe('glass')
      filterButton.click()
      await nextTick()
      expect(filterButton.getAttribute('aria-expanded')).toBe('false')
      expect(filterButton.getAttribute('variant')).toBe('glass')
    } finally {
      await mounted.close()
    }
  })

  it('单独搜索不强调筛选图标，失焦后保留搜索框和条件', async () => {
    const mounted = await mountPage()
    try {
      const store = useLibraryStore()
      store.searchQuery = '不存在的资源'
      const searchButton = mounted.host.querySelector<HTMLElement>('web-ui-button[aria-label="搜索"]')!
      searchButton.click()
      await nextTick()
      const input = mounted.host.querySelector<HTMLElement>('web-ui-input[aria-label="搜索资源"]')!
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await nextTick()
      const filter = mounted.host.querySelector<HTMLElement>('web-ui-button[aria-label="筛选和排序"]')!
      expect(filter.getAttribute('variant')).toBe('glass')
      expect(mounted.host.querySelector('web-ui-input[aria-label="搜索资源"]')).not.toBeNull()
      expect(store.searchQuery).toBe('不存在的资源')
    } finally {
      await mounted.close()
    }
  })

  /*
   * 进入选择态后筛选按钮被隐藏，展开中的筛选 panel 必须一起收起——否则它既失去可回退的
   * 开关，又继续压缩列表可视高度。jsdom 里 web-ui-collapse 不保证已升级，open 既可能是
   * 属性字符串（未升级）也可能是 reflect 出来的空串/缺失（已升级），两种情况一起判。
   */
  it('进入选择态时筛选面板自动收起', async () => {
    const mounted = await mountPage()

    const collapseOpen = () => {
      const attribute = mounted.host.querySelector('web-ui-collapse')?.getAttribute('open')
      return attribute !== null && attribute !== 'false'
    }

    try {
      const filterButton = mounted.host.querySelector<HTMLElement>('web-ui-button[aria-label="筛选和排序"]')
      if (!filterButton) throw new Error('筛选 button 未渲染')
      filterButton.click()
      await nextTick()
      expect(collapseOpen()).toBe(true)

      button(mounted.host, '选择').click()
      await nextTick()

      expect(collapseOpen()).toBe(false)
    } finally {
      await mounted.close()
    }
  })

  it('收到可用性事件后就地翻转行状态，无需手动刷新', async () => {
    runtimeStub.current = createRuntime({
      resources: {
        list: async () => [
          resource({
            kind: ResourceKind.ResourceKindImage,
            size_bytes: 128,
            sources: [source({ type: SourceType.SourceTypeFile, location: '/tmp/a.png', available: true })]
          })
        ]
      }
    })
    const mounted = await mountPage()

    try {
      expect(useLibraryStore().resources[0]?.available).toBe(true)
      runtimeStub.availabilityListener?.({
        source_id: 'source-1',
        resource_id: 'resource-1',
        type: SourceType.SourceTypeFile,
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

    // 退订的可观察后果是监听被清空（stub 的 disposer 做的事）；disposer 的存在性由
    // 注册半边（上一行）证明，单独断言它只是复述 fixture 自己的赋值。
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
 * 标题/说明/button 文案同时塌成空串，弹窗高度单帧塌掉 61.6px；紧凑变体的宽度还从标题字符串
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
      // 关闭状态回写后保留内容；实际退场的可见性和时序由浏览器用例验证。
      expect(dialog.textContent).toContain('删除「失效链接」后无法恢复。')
      expect(dialog.querySelector('[role="alert"]')).toBeNull()
    } finally {
      await mounted.close()
    }
  })

  it('窗口拖入文件时打开添加资源并入队', async () => {
    const mounted = await mountPage()
    try {
      queueWindowFileDrop(['/tmp/photo.png'])
      await flush()
      expect((addDialog(mounted.host) as WebUiDialog).open).toBe(true)
      expect(mounted.host.textContent).toContain('photo')
    } finally {
      await mounted.close()
    }
  })

  it('移除待导入资源时立即从队列移除', async () => {
    const mounted = await mountPage()
    try {
      mounted.host.querySelector<HTMLElement>('web-ui-button[aria-label="导入资源"]')?.click()
      await nextTick()
      queueWindowFileDrop(['/tmp/photo.png'])
      await flush()
      const remove = mounted.host.querySelector<HTMLElement>('web-ui-button[aria-label="移除待导入资源"]')
      if (!remove) throw new Error('移除待导入资源 button 未渲染')
      remove.click()
      await flush()
      expect(addDialog(mounted.host).textContent).not.toContain('photo')
      expect(mounted.host.textContent).not.toContain('移除待添加项')
    } finally {
      await mounted.close()
    }
  })

  it('确认失败时弹窗保持打开、错误可见且可再次点击确认', async () => {
    const remove = vi
      .fn<LibraryRuntime['resources']['remove']>()
      .mockRejectedValueOnce(new Error('资源正在被使用'))
      .mockResolvedValueOnce(undefined)
    runtimeStub.current = createRuntime({ resources: { remove } })
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

      expect(remove).toHaveBeenCalledTimes(2)
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
 * OS 的剪贴板文件接口只认文件，剪贴板里是链接时返回空数组。拿不到文件时把剪贴板文本按链接再
 * 解析一次，文本不是合法 http/https 时给一句可读的错误。
 */
describe('LibraryPage：粘贴链接', () => {
  beforeEach(() => {
    toastWarning.mockClear()
    setActivePinia(createPinia())
    route.value = { path: '/library' }
    runtimeStub.droppedFilesListener = null
    runtimeStub.availabilityListener = null
    runtimeStub.availabilityDisposer = null
    runtimeStub.current = createRuntime()
  })

  afterEach(() => {
    runtimeStub.current = null
  })

  it('粘贴 http/https 链接入队为 URL 项，重复检查按 URL 来源走', async () => {
    const findLocationMatches = vi.fn<LibraryRuntime['resources']['findLocationMatches']>(async () => [])
    runtimeStub.current = createRuntime({ resources: { findLocationMatches } })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      paste(' https://example.com/article ')
      await flush()

      expect(findLocationMatches).toHaveBeenCalledWith('https://example.com/article', SourceType.SourceTypeURL)
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
      expect(toastWarning).toHaveBeenCalledWith('剪切板中没有可导入的文件或有效链接', { position: 'top-center' })
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
      expect(toastWarning).toHaveBeenCalledWith('剪切板中没有可导入的文件或有效链接', { position: 'top-center' })
    } finally {
      await mounted.close()
    }
  })

  it('剪贴板有文件时仍走文件路径，链接文本不参与入队', async () => {
    const prepareFilePreview = vi.fn<LibraryRuntime['resources']['prepareFilePreview']>(async () => ({
      kind: ResourceKind.ResourceKindImage,
      token: 'opaque-token'
    }))
    runtimeStub.current = createRuntime({
      system: { getClipboardFilePaths: async () => ['/tmp/photo.png'] },
      resources: { prepareFilePreview }
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

  it('提交时 URL 项走 createResource，资源出现在列表', async () => {
    const createResource = vi.fn<LibraryRuntime['resources']['create']>(async input =>
      resource({ title: '示例文章', sources: [source({ location: input.location, available: true })] })
    )
    runtimeStub.current = createRuntime({ resources: { create: createResource } })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      paste('https://example.com/article')
      await flush()
      button(mounted.host, '确认导入').click()
      await flush()

      expect(createResource).toHaveBeenCalledExactlyOnceWith({
        kind: SourceType.SourceTypeURL,
        location: 'https://example.com/article',
        title: '',
        tags: []
      })
      expect(useLibraryStore().resources[0]?.title).toBe('示例文章')
    } finally {
      await mounted.close()
    }
  })

  it('提交成功后 AddDialog 自动关闭；controller 的 close 是队列收尾，不代 dialog 开合', async () => {
    const createResource = vi.fn<LibraryRuntime['resources']['create']>(async input =>
      resource({ title: '示例文章', sources: [source({ location: input.location, available: true })] })
    )
    runtimeStub.current = createRuntime({ resources: { create: createResource } })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      const dialog = addDialog(mounted.host)
      expect(dialogOpen(dialog)).toBe(true)

      paste('https://example.com/article')
      await flush()
      button(mounted.host, '确认导入').click()
      await flush()

      expect(createResource).toHaveBeenCalledTimes(1)
      expect(dialogOpen(dialog)).toBe(false)
    } finally {
      await mounted.close()
    }
  })

  it('提交失败时 AddDialog 保持打开、队列按 remaining 回卷', async () => {
    const createResource = vi.fn<LibraryRuntime['resources']['create']>(async () => {
      throw new Error('磁盘已满')
    })
    runtimeStub.current = createRuntime({ resources: { create: createResource } })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      const dialog = addDialog(mounted.host)
      paste('https://example.com/article')
      await flush()
      button(mounted.host, '确认导入').click()
      await flush()

      expect(dialogOpen(dialog)).toBe(true)
      // takeOperationError 优先透出 cause 的 message，fallback 文案只兜无消息错误。
      expect(mounted.host.textContent).toContain('磁盘已满')
    } finally {
      await mounted.close()
    }
  })
})

/*
 * 统一导入入口：选择面板、拖入与剪贴板都走「后端展开目录 → 超阈值先确认 → 入队」同一条链。
 * 页面层只验证确认与进度接线；逐项重复提示链由 addQueue 拥有，不再重复验证。
 */
describe('LibraryPage：统一导入入口', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.value = { path: '/library' }
    runtimeStub.droppedFilesListener = null
    runtimeStub.availabilityListener = null
    runtimeStub.availabilityDisposer = null
    runtimeStub.current = createRuntime()
    toastWarning.mockClear()
  })

  afterEach(() => {
    runtimeStub.current = null
  })

  /** 统一入口的页面驱动：点按上传区，等展开与入队链尘埃落定。 */
  async function pickFromDropZone(host: HTMLElement) {
    const dropZone = host.querySelector<HTMLElement>('[data-file-drop-target="library-add-files"]')
    if (!dropZone) throw new Error('上传区未渲染')
    dropZone.click()
    await flush()
  }

  it('未超阈值时展开结果直接入队，不弹确认', async () => {
    const expandImportEntries = vi.fn<LibraryRuntime['resources']['expandImportEntries']>(async () => ({
      files: ['/tmp/imports/a.png', '/tmp/imports/sub/b.md'],
      folders: 1
    }))
    runtimeStub.current = createRuntime({
      system: { chooseFilePaths: async () => ['/tmp/imports'] },
      resources: { expandImportEntries }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      await pickFromDropZone(mounted.host)

      expect(expandImportEntries).toHaveBeenCalledWith(['/tmp/imports'])
      expect(queueItems(mounted.host)).toHaveLength(2)
      expect(mounted.host.textContent).not.toContain('确认批量导入')
    } finally {
      await mounted.close()
    }
  })

  it('超过阈值先弹确认；确认按钮忙时展示进度比值，整批入队后关闭', async () => {
    const files = Array.from({ length: 21 }, (_, index) => `/tmp/imports/file-${index}.png`)
    // 用重复检查的 gate 控制入队链节奏：确认弹窗的忙按钮应显示实时比值。
    const gates: Array<() => void> = []
    runtimeStub.current = createRuntime({
      system: { chooseFilePaths: async () => ['/tmp/imports'] },
      resources: {
        expandImportEntries: async () => ({ files, folders: 1 }),
        findLocationMatches: async () => new Promise(resolve => gates.push(() => resolve([])))
      }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      await pickFromDropZone(mounted.host)

      expect(queueItems(mounted.host)).toHaveLength(0)
      const dialog = confirmDialog(mounted.host, '导入 21 个文件')
      expect(dialogOpen(dialog)).toBe(true)
      expect(dialog.textContent).toContain('文件夹已递归展开')

      button(dialog, '导入 21 个文件').click()
      await flush()
      // 链上第一项停在重复检查 gate：忙按钮显示 0 / 21。
      expect(dialog.textContent).toContain('0 / 21')

      gates.shift()!()
      await flush()
      expect(dialog.textContent).toContain('1 / 21')

      // 逐个放行剩余项，链走完即弹窗关闭、整批入队。
      while (gates.length) {
        gates.shift()!()
        await flush()
      }
      await flush()
      expect(dialogOpen(dialog)).toBe(false)
      expect(queueItems(mounted.host)).toHaveLength(21)
    } finally {
      await mounted.close()
    }
  })

  it('导入进行中取消按钮变成停止：停止后只结算在途项，剩余项不再入队', async () => {
    const files = Array.from({ length: 21 }, (_, index) => `/tmp/imports/file-${index}.png`)
    const gate = deferred<void>()
    let lookups = 0
    const findLocationMatches = vi.fn<LibraryRuntime['resources']['findLocationMatches']>(async () => {
      lookups += 1
      // 第 4 项停在重复检查上：前三项已入队，停止后第 4 项也不该被推进。
      if (lookups === 4) await gate.promise
      return []
    })
    runtimeStub.current = createRuntime({
      system: { chooseFilePaths: async () => ['/tmp/imports'] },
      resources: {
        expandImportEntries: async () => ({ files, folders: 0 }),
        findLocationMatches
      }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      await pickFromDropZone(mounted.host)

      const dialog = confirmDialog(mounted.host, '导入 21 个文件')
      // 未开始时按钮仍是「取消」。
      expect(dialog.textContent).toContain('取消')
      button(dialog, '导入 21 个文件').click()
      await flush()
      // 前三项已入队，第 4 项的查询在途：按钮已换成「停止」。
      expect(queueItems(mounted.host)).toHaveLength(3)
      expect(findLocationMatches).toHaveBeenCalledTimes(4)
      expect(dialog.textContent).not.toContain('取消')

      // 点停止后放行在途查询：代次已变，第 4 项不入队、其余 17 项不再发起查询。
      button(dialog, '停止').click()
      gate.resolve()
      await vi.waitFor(() => expect(dialogOpen(dialog)).toBe(false))

      expect(findLocationMatches).toHaveBeenCalledTimes(4)
      expect(queueItems(mounted.host)).toHaveLength(0)
    } finally {
      await mounted.close()
    }
  })

  it('排队批次确认后从 0 起算进度，不复用上一批的已处理数', async () => {
    const first = Array.from({ length: 21 }, (_, index) => `/tmp/batch-a/file-${index}.png`)
    const second = Array.from({ length: 25 }, (_, index) => `/tmp/batch-b/file-${index}.png`)
    const gates: Array<() => void> = []
    let gateLookups = false
    runtimeStub.current = createRuntime({
      resources: {
        expandImportEntries: vi
          .fn<LibraryRuntime['resources']['expandImportEntries']>()
          .mockResolvedValueOnce({ files: first, folders: 0 })
          .mockResolvedValueOnce({ files: second, folders: 0 }),
        findLocationMatches: async () => {
          if (!gateLookups) return []
          return new Promise(resolve => gates.push(() => resolve([])))
        }
      }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      queueWindowFileDrop(['/tmp/batch-a'])
      queueWindowFileDrop(['/tmp/batch-b'])
      await flush()

      // 第一批照常入队完成，进度停在 21 / 21；第二批弹窗随后接上。
      button(confirmDialog(mounted.host, '导入 21 个文件'), '导入 21 个文件').click()
      await flush()
      const dialog = confirmDialog(mounted.host, '导入 25 个文件')

      // 第二批确认后的第一帧就应是本批的 0 / 25：链的起点重置晚于这次渲染，
      // 不先重置就会拿上一批的 21 配本批的 25。
      gateLookups = true
      button(dialog, '导入 25 个文件').click()
      await nextTick()
      expect(dialog.textContent).toContain('0 / 25')
      expect(dialog.textContent).not.toContain('21 / 25')
      await flush()

      while (gates.length) {
        gates.shift()!()
        await flush()
      }
    } finally {
      await mounted.close()
    }
  })

  it('超过阈值时取消确认，一批都不入队', async () => {
    const files = Array.from({ length: 21 }, (_, index) => `/tmp/imports/file-${index}.png`)
    runtimeStub.current = createRuntime({
      system: { chooseFilePaths: async () => ['/tmp/imports'] },
      resources: { expandImportEntries: async () => ({ files, folders: 0 }) }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      await pickFromDropZone(mounted.host)

      const dialog = confirmDialog(mounted.host, '导入 21 个文件')
      button(dialog, '取消').click()
      await flush()

      expect(queueItems(mounted.host)).toHaveLength(0)
    } finally {
      await mounted.close()
    }
  })

  it('纯文件多选超过阈值：确认文案只讲批量导入，不提文件夹', async () => {
    const files = Array.from({ length: 25 }, (_, index) => `/tmp/picked/file-${index}.png`)
    runtimeStub.current = createRuntime({
      system: { chooseFilePaths: async () => files },
      resources: { expandImportEntries: async paths => ({ files: paths, folders: 0 }) }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      await pickFromDropZone(mounted.host)

      const dialog = confirmDialog(mounted.host, '导入 25 个文件')
      expect(dialog.textContent).toContain('共 25 个文件将加入待导入列表。')
      expect(dialog.textContent).not.toContain('文件夹')
      button(dialog, '取消').click()
      await flush()
    } finally {
      await mounted.close()
    }
  })

  it('文件夹递归展开超过阈值：文案补出实际展开的文件夹数', async () => {
    const files = Array.from({ length: 30 }, (_, index) => `/tmp/dropped/file-${index}.png`)
    runtimeStub.current = createRuntime({
      resources: { expandImportEntries: async () => ({ files, folders: 2 }) }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      queueWindowFileDrop(['/tmp/dropped/a', '/tmp/dropped/b'])
      await flush()

      const dialog = confirmDialog(mounted.host, '导入 30 个文件')
      expect(dialog.textContent).toContain('共 30 个文件将加入待导入列表（2 个文件夹已递归展开）。')
      button(dialog, '取消').click()
      await flush()
    } finally {
      await mounted.close()
    }
  })

  it('展开结果为空时给一句可读提示，不弹确认也不入队', async () => {
    runtimeStub.current = createRuntime({
      system: { chooseFilePaths: async () => ['/tmp/empty'] },
      resources: { expandImportEntries: async () => ({ files: [], folders: 0 }) }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      await pickFromDropZone(mounted.host)

      expect(toastWarning).toHaveBeenCalledWith('所选内容里没有可导入的文件', { position: 'top-center' })
      expect(queueItems(mounted.host)).toHaveLength(0)
    } finally {
      await mounted.close()
    }
  })

  it('提交进行中上传区继续入队被挡下并提示，不再扩张队列', async () => {
    const expandImportEntries = vi.fn<LibraryRuntime['resources']['expandImportEntries']>(async () => ({
      files: ['/tmp/late.png'],
      folders: 0
    }))
    const gate = deferred<void>()
    runtimeStub.current = createRuntime({
      system: { chooseFilePaths: async () => ['/tmp/late'] },
      resources: {
        expandImportEntries,
        create: async () => gate.promise.then(() => resource())
      }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      queueWindowFileDrop(['/tmp/first.png'])
      await flush()
      expect(queueItems(mounted.host)).toHaveLength(1)

      // 提交被 gate 挂起；此时再走上传区入队必须被挡下。
      button(mounted.host, '确认导入').click()
      await flush()
      await pickFromDropZone(mounted.host)

      expect(toastWarning).toHaveBeenCalledWith('正在导入当前批次，请等它完成再继续添加', { position: 'top-center' })
      // 只有首次拖入那次合法展开；提交期间的尝试没有走到展开。
      expect(expandImportEntries).toHaveBeenCalledTimes(1)
      expect(queueItems(mounted.host)).toHaveLength(1)

      gate.resolve()
      await flush()
    } finally {
      await mounted.close()
    }
  })

  it('提交进行中拖入链接被挡下并提示，不入队', async () => {
    const gate = deferred<void>()
    runtimeStub.current = createRuntime({
      resources: { create: async () => gate.promise.then(() => resource()) }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      queueWindowFileDrop(['/tmp/first.png'])
      await flush()
      expect(queueItems(mounted.host)).toHaveLength(1)

      // 提交挂起时窗口拖入链接：快照之外的新项会被 close() 丢弃，入口必须挡下。
      button(mounted.host, '确认导入').click()
      await flush()
      queueWindowURLDrop(['https://example.com/late'])
      await flush()

      expect(toastWarning).toHaveBeenCalledWith('正在导入当前批次，请等它完成再继续添加', { position: 'top-center' })
      expect(queueItems(mounted.host)).toHaveLength(1)

      gate.resolve()
      await flush()
    } finally {
      await mounted.close()
    }
  })

  it('展开在途时提交开始：展开返回后不再入队', async () => {
    const expandGate = deferred<string[]>()
    const createGate = deferred<void>()
    const create = vi.fn<LibraryRuntime['resources']['create']>(async () => {
      await createGate.promise
      return resource()
    })
    let gated = false
    runtimeStub.current = createRuntime({
      resources: {
        expandImportEntries: async paths => ({ files: gated ? await expandGate.promise : paths, folders: 0 }),
        create
      }
    })
    const mounted = await mountPage()

    try {
      await openAddDialog(mounted.host)
      queueWindowFileDrop(['/tmp/first.png'])
      await flush()
      expect(queueItems(mounted.host)).toHaveLength(1)

      // 第二次拖入的展开被 gate 拖住；用户在这段时间里点了提交（create 也被拖住）。
      gated = true
      queueWindowFileDrop(['/tmp/slow'])
      await flush()
      button(mounted.host, '确认导入').click()
      await flush()
      expect(create).toHaveBeenCalledTimes(1)

      // 展开返回时提交仍在进行：这一批必须被挡下，而不是塞进正在结算的队列。
      expandGate.resolve(['/tmp/slow/a.png'])
      await vi.waitFor(() =>
        expect(toastWarning).toHaveBeenCalledWith('正在导入当前批次，请等它完成再继续添加', {
          position: 'top-center'
        })
      )
      expect(queueItems(mounted.host)).toHaveLength(1)

      createGate.resolve()
      await flush()
      expect(queueItems(mounted.host)).toHaveLength(0)
    } finally {
      await mounted.close()
    }
  })

  it('并发两个超阈值批次排队依次确认，先到的先入队且互不覆盖', async () => {
    const filesA = Array.from({ length: 21 }, (_, index) => `/tmp/drop-a/file-${index}.png`)
    const filesB = Array.from({ length: 25 }, (_, index) => `/tmp/drop-b/file-${index}.png`)
    const expandImportEntries = vi
      .fn<LibraryRuntime['resources']['expandImportEntries']>()
      .mockResolvedValueOnce({ files: filesA, folders: 0 })
      .mockResolvedValueOnce({ files: filesB, folders: 0 })
    runtimeStub.current = createRuntime({ resources: { expandImportEntries } })
    const mounted = await mountPage()

    try {
      // 同一轮里先后拖入两个批次：两个确认请求都超阈值，第二个必须排队而不是覆盖第一个。
      queueWindowFileDrop(['/tmp/drop-a'])
      queueWindowFileDrop(['/tmp/drop-b'])
      await flush()

      const first = confirmDialog(mounted.host, '导入 21 个文件')
      expect(dialogOpen(first)).toBe(true)
      expect(queueItems(mounted.host)).toHaveLength(0)

      button(first, '导入 21 个文件').click()
      // 第一个弹窗退场收尾后，排队的批次 B 依次出现。
      await vi.waitFor(() => {
        const second = [...mounted.host.querySelectorAll<WebUiDialog>('web-ui-dialog')].find(candidate =>
          [...candidate.querySelectorAll('web-ui-button')].some(item => item.textContent?.trim() === '导入 25 个文件')
        )
        expect(second).toBeTruthy()
      })
      const second = confirmDialog(mounted.host, '导入 25 个文件')
      expect(dialogOpen(second)).toBe(true)
      button(second, '导入 25 个文件').click()
      await flush()

      expect(queueItems(mounted.host)).toHaveLength(46)
      expect(dialogOpen(second)).toBe(false)
    } finally {
      await mounted.close()
    }
  })

  it('拖入文件夹走同一条展开链，目录被递归展开后入队', async () => {
    const expandImportEntries = vi.fn<LibraryRuntime['resources']['expandImportEntries']>(async () => ({
      files: ['/tmp/drop/a.png', '/tmp/drop/nested/b.md'],
      folders: 1
    }))
    runtimeStub.current = createRuntime({ resources: { expandImportEntries } })
    const mounted = await mountPage()

    try {
      queueWindowFileDrop(['/tmp/drop'])
      await flush()

      expect(expandImportEntries).toHaveBeenCalledWith(['/tmp/drop'])
      expect(queueItems(mounted.host)).toHaveLength(2)
    } finally {
      await mounted.close()
    }
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('LibraryPage：菜单动作', () => {
  beforeEach(() => {
    toastWarning.mockClear()
    setActivePinia(createPinia())
    route.value = { path: '/library' }
    runtimeStub.droppedFilesListener = null
    runtimeStub.availabilityListener = null
    runtimeStub.availabilityDisposer = null
    runtimeStub.current = createRuntime()
  })

  afterEach(() => {
    runtimeStub.current = null
  })

  /** 菜单事件由壳派发在 document 上；页面订阅的是同一个事件名。 */
  function dispatchMenu(eventName: string) {
    document.dispatchEvent(new CustomEvent(eventName))
  }

  async function flushMenu() {
    // 菜单动作里有两段 nextTick（打开对话框、再翻开链接输入），外加一次微任务链，
    // 固定等到下一轮宏任务为止，避免按调用次数猜渲染时机。
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await nextTick()
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  it('「导入来自 › 链接」打开添加对话框并直接翻开链接输入', async () => {
    const mounted = await mountPage()
    try {
      dispatchMenu(MENU_IMPORT_FROM_LINK_EVENT)
      await flushMenu()

      const dialog = addDialog(mounted.host)
      expect(dialogOpen(dialog)).toBe(true)
      // 链接输入是对话框里唯一的 type=url 控件，它打开即说明用户不必再点一次「添加链接」。
      // 链接输入封在 web-ui-input 的 shadow root 里，按对话框 header 文案定位。
      const linkDialog = [...mounted.host.querySelectorAll<HTMLElement & { open?: boolean }>('web-ui-dialog')].find(
        node => node.querySelector('span[slot="header"]')?.textContent?.trim() === '导入链接'
      )
      if (!linkDialog) throw new Error('链接输入 dialog 没有挂载')
      expect(dialogOpen(linkDialog)).toBe(true)
    } finally {
      await mounted.close()
    }
  })

  it('「切换筛选栏」「搜索」翻开对应面板', async () => {
    const mounted = await mountPage()
    // 筛选面板是 Toolbar 里的 collapse；搜索框展开时「搜索」按钮本身会消失，用它当判据。
    const filterCollapseOpen = () => {
      const attribute = mounted.host.querySelector('web-ui-collapse')?.getAttribute('open')
      return attribute !== null && attribute !== 'false'
    }
    const searchButton = () => mounted.host.querySelector('web-ui-button[aria-label="搜索"]')
    try {
      expect(filterCollapseOpen()).toBe(false)
      dispatchMenu(MENU_TOGGLE_FILTER_BAR_EVENT)
      await flushMenu()
      expect(filterCollapseOpen()).toBe(true)

      // 「切换」是双向的：再点一次要收起。单向展开会让已展开时看起来毫无反应。
      dispatchMenu(MENU_TOGGLE_FILTER_BAR_EVENT)
      await flushMenu()
      expect(filterCollapseOpen()).toBe(false)

      expect(searchButton()).not.toBeNull()
      dispatchMenu(MENU_FOCUS_SEARCH_EVENT)
      await flushMenu()
      expect(searchButton()).toBeNull()
    } finally {
      await mounted.close()
    }
  })

  it('「刷新」重新读库', async () => {
    const list = vi.fn<LibraryRuntime['resources']['list']>(async () => [])
    runtimeStub.current = createRuntime({ resources: { list } })
    const mounted = await mountPage()
    list.mockClear()
    try {
      dispatchMenu(MENU_REFRESH_EVENT)
      await flushMenu()
      expect(list).toHaveBeenCalledTimes(1)
    } finally {
      await mounted.close()
    }
  })
})

describe('LibraryPage：备注失败回写', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.value = { path: '/library' }
    runtimeStub.availabilityListener = null
    runtimeStub.availabilityDisposer = null
  })

  afterEach(() => {
    runtimeStub.current = null
  })

  it('先发的请求后失败时，回滚用 store 活值，不抹掉后发请求已保存的内容', async () => {
    const first = deferred<ResourceDTO>()
    const second = deferred<ResourceDTO>()
    const calls: string[] = []
    runtimeStub.current = createRuntime({
      resources: {
        updateNote: (resourceId, note) => {
          calls.push(note)
          return calls.length === 1 ? first.promise : second.promise
        }
      }
    })
    const mounted = await mountPage()

    try {
      await openDetailFromMenu(mounted.host)

      const editor = mounted.host.querySelector('web-ui-textarea') as HTMLElement & { value: string }
      if (!editor) throw new Error('备注 input 未渲染')

      // 连续两次失焦提交：A 与 B 捕获的是同一个「编辑前」快照。
      editor.value = 'abc'
      editor.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      editor.value = 'abcd'
      editor.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      expect(calls).toEqual(['abc', 'abcd'])

      // B 先成功落库，store 变成 'abcd'。
      second.resolve(resource({ note: 'abcd' }))
      await nextTick()
      await nextTick()

      // A 随后失败。若回滚目标是 emit 时的快照，这里会把界面写成编辑前的 ''，
      // 而 store 里已经是 'abcd'——已保存的值看不见了。
      first.reject(new Error('保存失败'))
      await nextTick()
      await nextTick()

      expect(editor.value).toBe('abcd')
    } finally {
      await mounted.close()
    }
  })
})

describe('LibraryPage：重命名后的激活行', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.value = { path: '/library' }
    runtimeStub.current = createRuntime()
  })

  afterEach(() => {
    runtimeStub.current = null
  })

  /*
   * 右键「重命名」要把目标行置成激活行：父级在这条入口上写 activeResourceId，与左键预览、
   * 详情、标签同一条路。
   *
   * 判据取 roving tabindex：整列只有一个 tab stop，它停在当前行上，是 activeResourceId
   * 落到行上的公开出口。
   */
  it('右键「重命名」后激活行落在被改名的那一行上', async () => {
    const mounted = await mountPage()
    try {
      await openContextMenuAction(mounted.host, 'resource-1', '重命名')
      await nextTick()
      await nextTick()

      const renamed = row(mounted.host, 'resource-1')
      expect(renamed.getAttribute('tabindex'), '被改名的一行应成为当前行').toBe('0')
    } finally {
      await mounted.close()
    }
  })
})
