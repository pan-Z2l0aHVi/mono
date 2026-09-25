// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, ref, type App } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import LibraryPreviewDrawer from './LibraryPreviewDrawer.vue'

interface MountOptions {
  open?: boolean
  openExternal?: (target: string) => Promise<void>
  mediaUrlFor?: (sourceId: string) => string | null
  onOpenFailed?: (error: unknown) => void
}

interface Mounted {
  host: HTMLElement
  app: App
  setResource: (value: ResourceView | null) => Promise<void>
  setOpen: (value: boolean) => Promise<void>
}

const mounted: Mounted[] = []

function fileSource(overrides: Partial<ResourceSourceView> = {}): ResourceSourceView {
  return {
    id: 'source-1',
    type: 'file',
    location: '/tmp/a.png',
    available: true,
    isPreferred: true,
    orderIndex: 0,
    metadata: null,
    ...overrides
  }
}

function resourceOf(preferred: ResourceSourceView, kind: ResourceKind): ResourceView {
  return {
    id: 'resource-1',
    title: '预览目标',
    note: '',
    createdAt: 0,
    updatedAt: 0,
    sources: [preferred],
    preferred,
    tagNames: [],
    available: preferred.available,
    kind,
    sizeBytes: 2048
  }
}

async function mountDrawer(initial: ResourceView | null, options: MountOptions = {}): Promise<Mounted> {
  const host = document.createElement('div')
  document.body.append(host)
  const current = ref<ResourceView | null>(initial)
  const open = ref(options.open ?? true)
  const app = createApp({
    setup() {
      return () =>
        h(LibraryPreviewDrawer, {
          open: open.value,
          resource: current.value,
          mobile: false,
          mediaUrlFor: options.mediaUrlFor ?? ((sourceId: string) => `/resource-media/${sourceId}`),
          openExternal: options.openExternal ?? (async () => {}),
          onOpenFailed: options.onOpenFailed
        })
    }
  })
  app.mount(host)
  await nextTick()
  const entry: Mounted = {
    host,
    app,
    setResource: async value => {
      current.value = value
      await nextTick()
      await nextTick()
    },
    setOpen: async value => {
      open.value = value
      await nextTick()
      await nextTick()
    }
  }
  mounted.push(entry)
  return entry
}

async function flush(times = 8): Promise<void> {
  for (let index = 0; index < times; index++) await Promise.resolve()
  await nextTick()
}

function openExternalButton(host: HTMLElement) {
  return host.querySelector<HTMLElement>('web-ui-button[aria-label="在系统浏览器打开"]')
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('内容', { status: 200 }))
  )
})

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.app.unmount()
    entry.host.remove()
  }
  vi.unstubAllGlobals()
})

describe('LibraryPreviewDrawer', () => {
  it('图片铺满内容区渲染 img，加载失败回落到空态', async () => {
    const { host } = await mountDrawer(resourceOf(fileSource(), ResourceKind.ResourceKindImage))
    const image = host.querySelector('img')
    expect(image?.getAttribute('src')).toBe('/resource-media/source-1')
    expect(image?.className).toContain('object-contain')
    expect(host.querySelector('iframe')).toBeNull()
    image?.dispatchEvent(new Event('error'))
    await nextTick()
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('web-ui-empty')?.getAttribute('title')).toBe('无法显示这张图片')
  })

  it('视频渲染原生 controls，Range 拖动由媒体端点负责', async () => {
    const { host } = await mountDrawer(
      resourceOf(fileSource({ location: '/tmp/a.mp4' }), ResourceKind.ResourceKindVideo)
    )
    const video = host.querySelector('video')
    expect(video?.getAttribute('src')).toBe('/resource-media/source-1')
    expect(video?.hasAttribute('controls')).toBe(true)
  })

  it('文本来源读取内容并以 pre 展示', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode('第一行\n第二行'))
                controller.close()
              }
            }),
            { status: 200 }
          )
      )
    )
    const { host } = await mountDrawer(
      resourceOf(fileSource({ location: '/tmp/a.md' }), ResourceKind.ResourceKindDocument)
    )
    await flush()
    expect(host.querySelector('pre')?.textContent).toBe('第一行\n第二行')
    expect(host.textContent).not.toContain('仅显示开头部分')
  })

  it('文本读取失败时展示可观察原因而不是空白', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 }))
    )
    const { host } = await mountDrawer(
      resourceOf(fileSource({ location: '/tmp/a.md' }), ResourceKind.ResourceKindDocument)
    )
    await flush()
    expect(host.querySelector('pre')).toBeNull()
    expect(host.querySelector('web-ui-empty')?.getAttribute('description')).toContain('HTTP 404')
  })

  it('切换资源时取消在途文本请求，旧结果不再写回', async () => {
    const signals: AbortSignal[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            if (!init?.signal) return
            signals.push(init.signal)
            init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
          })
      )
    )
    const { host, setResource } = await mountDrawer(
      resourceOf(fileSource({ location: '/tmp/a.md' }), ResourceKind.ResourceKindDocument)
    )
    await nextTick()
    expect(signals[0]?.aborted).toBe(false)
    await setResource(resourceOf(fileSource({ location: '/tmp/a.png' }), ResourceKind.ResourceKindImage))
    expect(signals[0]?.aborted).toBe(true)
    expect(host.querySelector('pre')).toBeNull()
    expect(host.querySelector('img')).not.toBeNull()
  })

  it('URL 来源渲染 sandbox 化的 iframe 并常驻系统浏览器外跳按钮', async () => {
    const openExternal = vi.fn<(target: string) => Promise<void>>(async () => {})
    const { host } = await mountDrawer(
      resourceOf(
        fileSource({ id: 'source-url', type: 'url', location: 'https://example.com/x' }),
        ResourceKind.ResourceKindWeb
      ),
      { openExternal }
    )
    const frame = host.querySelector('iframe')
    expect(frame?.getAttribute('src')).toBe('https://example.com/x')
    expect(frame?.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
    )
    expect(frame?.getAttribute('title')).toBe('预览目标 网页预览')
    expect(host.querySelector('img')).toBeNull()
    openExternalButton(host)?.click()
    await flush()
    expect(openExternal).toHaveBeenCalledWith('https://example.com/x')
  })

  it('外跳失败时把原因交给调用方而不是静默', async () => {
    const onOpenFailed = vi.fn<(error: unknown) => void>()
    const { host } = await mountDrawer(resourceOf(fileSource(), ResourceKind.ResourceKindImage), {
      onOpenFailed,
      openExternal: async () => {
        throw new Error('没有可用的默认应用')
      }
    })
    openExternalButton(host)?.click()
    await flush()
    expect(onOpenFailed).toHaveBeenCalledOnce()
    const [failure] = onOpenFailed.mock.calls[0] as [Error]
    expect(failure.message).toBe('没有可用的默认应用')
  })

  it('失效来源不渲染媒体并说明原因', async () => {
    const { host } = await mountDrawer(resourceOf(fileSource({ available: false }), ResourceKind.ResourceKindImage))
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('web-ui-empty')?.getAttribute('title')).toBe('文件已失效')
    expect(openExternalButton(host)).toBeNull()
  })

  it('缺 runtime 时说明预览依赖桌面服务', async () => {
    const { host } = await mountDrawer(resourceOf(fileSource(), ResourceKind.ResourceKindImage), {
      mediaUrlFor: () => null
    })
    expect(host.querySelector('web-ui-empty')?.getAttribute('title')).toBe('桌面服务未连接')
  })

  it('预览未打开时不挂载媒体节点，也不发起文本读取', async () => {
    const fetchMock = vi.fn<() => Promise<Response>>(async () => new Response('内容', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    // 资源已选中（行点击/编辑标签路径）但预览未打开：媒体不能挂在隐藏 dialog 里后台加载。
    const video = await mountDrawer(
      resourceOf(fileSource({ location: '/tmp/a.mp4' }), ResourceKind.ResourceKindVideo),
      { open: false }
    )
    await flush()
    expect(video.host.querySelector('video')).toBeNull()
    expect(video.host.querySelector('img')).toBeNull()
    expect(video.host.querySelector('iframe')).toBeNull()

    const text = await mountDrawer(
      resourceOf(fileSource({ location: '/tmp/a.md' }), ResourceKind.ResourceKindDocument),
      { open: false }
    )
    await flush()
    expect(text.host.querySelector('pre')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()

    // 打开后才渲染并读取。
    await text.setOpen(true)
    await flush()
    expect(text.host.querySelector('pre')?.textContent).toBe('内容')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('URL 预览未打开时不渲染 iframe', async () => {
    const { host } = await mountDrawer(
      resourceOf(
        fileSource({ id: 'source-url', type: 'url', location: 'https://example.com/x' }),
        ResourceKind.ResourceKindWeb
      ),
      { open: false }
    )
    await flush()
    expect(host.querySelector('iframe')).toBeNull()
  })
})
