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
})
