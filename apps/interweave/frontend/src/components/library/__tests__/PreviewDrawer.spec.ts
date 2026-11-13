// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, ref, type App } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import PreviewDrawer from '../PreviewDrawer.vue'

interface MountOptions {
  open?: boolean
  onRecover?: (source: ResourceSourceView) => void
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
    mediaUrl: '/resource-media/source-1',
    thumbnailUrl: null,
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
    tags: [],
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
        h(PreviewDrawer, {
          open: open.value,
          resource: current.value,
          mobile: false,
          onRecover: options.onRecover
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

// fixture 的 fetch/Response 链只派生 microtask；跨 task 后再等 Vue 提交。
async function flush(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve))
  await nextTick()
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

describe('PreviewDrawer', () => {
  it('失效文件可从预览进入当前来源的找回流程', async () => {
    const source = fileSource({ available: false })
    const onRecover = vi.fn<(source: ResourceSourceView) => void>()
    const { host, setResource } = await mountDrawer(resourceOf(source, ResourceKind.ResourceKindImage), { onRecover })
    const button = host.querySelector<HTMLElement>('web-ui-button[slot="action"]')
    expect(button?.textContent).toContain('找回资源')
    button?.click()
    expect(onRecover).toHaveBeenCalledWith(source)
    await setResource(resourceOf(fileSource(), ResourceKind.ResourceKindImage))
    expect(host.querySelector('web-ui-button[slot="action"]')).toBeNull()
  })

  it('图片支持滚轮缩放，关闭再打开后恢复初始缩放', async () => {
    const { host, setOpen } = await mountDrawer(resourceOf(fileSource(), ResourceKind.ResourceKindImage))
    const image = host.querySelector('img')!
    const stage = image.parentElement!
    stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, bubbles: true, cancelable: true }))
    await nextTick()
    expect(image.style.transform).not.toContain('scale(1)')
    await setOpen(false)
    await setOpen(true)
    expect(host.querySelector('img')?.style.transform).toContain('scale(1)')
  })

  it('双指张开时放大图片，松开一指后仍可拖动', async () => {
    const { host } = await mountDrawer(resourceOf(fileSource(), ResourceKind.ResourceKindImage))
    const image = host.querySelector('img')!
    const stage = image.parentElement!
    stage.setPointerCapture = () => {}
    Object.defineProperties(stage, { clientWidth: { value: 100 }, clientHeight: { value: 100 } })
    Object.defineProperties(image, { offsetWidth: { value: 100 }, offsetHeight: { value: 100 } })
    const pointer = (type: string, id: number, clientX: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX })
      Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: 'touch' } })
      stage.dispatchEvent(event)
    }
    pointer('pointerdown', 1, 25)
    pointer('pointerdown', 2, 75)
    pointer('pointermove', 2, 125)
    await nextTick()
    expect(image.style.transform).toContain('scale(2)')
    pointer('pointerup', 2, 125)
    pointer('pointermove', 1, 35)
    await nextTick()
    // jsdom 31 的 CSSOM 序列化会把 translate(0px, 0px) 规范化成 translate(0px)
    expect(image.style.transform).not.toMatch(/translate\(0px(?:, 0px)?\)/)
  })

  it('放大图片后拖动受图片边界限制', async () => {
    const { host } = await mountDrawer(resourceOf(fileSource(), ResourceKind.ResourceKindImage))
    const image = host.querySelector('img')!
    const stage = image.parentElement!
    stage.setPointerCapture = () => {}
    Object.defineProperties(stage, { clientWidth: { value: 100 }, clientHeight: { value: 100 } })
    Object.defineProperties(image, { offsetWidth: { value: 100 }, offsetHeight: { value: 100 } })
    stage.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await nextTick()
    const pointer = (type: string, clientX: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX })
      Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } })
      stage.dispatchEvent(event)
    }
    pointer('pointerdown', 0)
    pointer('pointermove', 1000)
    await nextTick()
    // jsdom 31 的 CSSOM 序列化会把 translate(75px, 0px) 规范化成 translate(75px)
    expect(image.style.transform).toMatch(/translate\(75px(?:, 0px)?\)/)
  })

  it('图片铺满内容区渲染 img，加载失败回落到空态', async () => {
    const { host } = await mountDrawer(resourceOf(fileSource(), ResourceKind.ResourceKindImage))
    const image = host.querySelector('img')
    expect(image?.getAttribute('src')).toBe('/resource-media/source-1')
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
    expect(host.querySelector('web-ui-empty')?.getAttribute('description')).toContain(
      '无法读取文件，请检查文件是否还在原处'
    )
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

  it('URL 来源渲染 sandbox 化的 iframe', async () => {
    const { host } = await mountDrawer(
      resourceOf(
        fileSource({ id: 'source-url', type: 'url', location: 'https://example.com/x' }),
        ResourceKind.ResourceKindWeb
      )
    )
    const frame = host.querySelector('iframe')
    expect(frame?.getAttribute('src')).toBe('https://example.com/x')
    expect(frame?.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
    )
    expect(frame?.getAttribute('title')).toBe('预览目标 网页预览')
    expect(host.querySelector('img')).toBeNull()
  })

  it('失效来源不渲染媒体并说明原因', async () => {
    const { host } = await mountDrawer(resourceOf(fileSource({ available: false }), ResourceKind.ResourceKindImage))
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('web-ui-empty')?.getAttribute('title')).toBe('文件已失效')
  })

  it('缺 runtime 时说明预览依赖桌面服务', async () => {
    const { host } = await mountDrawer(resourceOf(fileSource({ mediaUrl: null }), ResourceKind.ResourceKindImage))
    expect(host.querySelector('web-ui-empty')?.getAttribute('title')).toBe('暂时无法预览')
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
