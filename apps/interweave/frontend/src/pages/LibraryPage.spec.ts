// @vitest-environment jsdom

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
  SourceType
} from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRuntime, SourceAvailabilityEventDTO } from '../services/library'
import { useLibraryStore } from '../stores/library'

import LibraryPage from './LibraryPage.vue'

// 右键菜单由 web-ui 自己接管渲染，单测只需要它有这两个接口
if (!customElements.get('web-ui-context-menu')) {
  customElements.define(
    'web-ui-context-menu',
    class extends HTMLElement {
      openAt() {}
      close() {}
    }
  )
}

const runtimeStub = {
  current: null as LibraryRuntime | null,
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
    updateResourceNote: async (resourceId, note) => resource({ id: resourceId, note }),
    deleteResource: async () => {},
    addTag: async () => ({ id: 'tag-1', name: 'tag', created_at: 1 }),
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
    subscribeToDroppedFiles: () => () => {},
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

/** 抽屉的 open 是 reflect 属性，jsdom 里按属性读；没升级成自定义元素时退回读 attribute。 */
function drawerOpen(host: HTMLElement, label: string) {
  const drawer = host.querySelector(`web-ui-drawer[dialog-label="${label}"]`) as
    | (HTMLElement & { open?: boolean })
    | null
  if (!drawer) throw new Error(`没有找到「${label}」抽屉`)
  return drawer.open ?? drawer.hasAttribute('open')
}

/*
 * 详情只从右键菜单进（列表左键是预览）。先右键唤起菜单，再点「详情」那一项。
 */
async function openDetailFromMenu(host: HTMLElement) {
  row(host, 'resource-1').dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 4, clientY: 4 })
  )
  await nextTick()
  const item = [...host.querySelectorAll('web-ui-dropdown-item')].find(node => node.textContent?.trim() === '详情')
  if (!item) throw new Error('右键菜单里没有「详情」项')
  item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
  await nextTick()
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

describe('LibraryPage：可用性感知接线', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.value = { path: '/library' }
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
      await openDetailFromMenu(mounted.host)

      expect(probeURLSourceOnOpen).toHaveBeenCalledExactlyOnceWith('source-1')
    } finally {
      await mounted.close()
    }
  })

  /*
   * 列表左键现在是预览：开的是预览抽屉，不该顺手去探测详情那条路上的 URL source。
   * 探测只属于「打开详情」，由右键菜单的详情项触发。
   */
  it('左键行进的是预览抽屉，不开详情也不探测', async () => {
    const probeURLSourceOnOpen = vi.fn<LibraryRuntime['probeURLSourceOnOpen']>()
    runtimeStub.current = createRuntime({ probeURLSourceOnOpen })
    const mounted = await mountPage()

    try {
      row(mounted.host, 'resource-1').click()
      await nextTick()
      await nextTick()

      expect(drawerOpen(mounted.host, '资源预览')).toBe(true)
      expect(drawerOpen(mounted.host, '资源详情')).toBe(false)
      expect(probeURLSourceOnOpen).not.toHaveBeenCalled()
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
      await openDetailFromMenu(mounted.host)

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
      await openDetailFromMenu(mounted.host)

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

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('LibraryPage：备注失败回写', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.value = { path: '/library' }
    runtimeStub.availabilityListener = null
    runtimeStub.availabilityDisposer = null
    window.matchMedia = vi.fn<() => MediaQueryList>(matchMediaStub)
  })

  afterEach(() => {
    runtimeStub.current = null
  })

  it('先发的请求后失败时，回滚用 store 活值，不抹掉后发请求已保存的内容', async () => {
    const first = deferred<ResourceDTO>()
    const second = deferred<ResourceDTO>()
    const calls: string[] = []
    runtimeStub.current = createRuntime({
      updateResourceNote: (resourceId, note) => {
        calls.push(note)
        return calls.length === 1 ? first.promise : second.promise
      }
    })
    const mounted = await mountPage()

    try {
      await openDetailFromMenu(mounted.host)

      const editor = mounted.host.querySelector('web-ui-textarea') as HTMLElement & { value: string }
      if (!editor) throw new Error('备注输入框未渲染')

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
