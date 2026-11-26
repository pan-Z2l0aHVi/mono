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
          openExternal: async () => {},
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

async function flush(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve))
  await nextTick()
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn<() => Promise<Response>>(async () => new Response('内容', { status: 200 }))
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
    expect(image.style.transform).toMatch(/translate\(75px(?:, 0px)?\)/)
  })

  it('图片、视频、音频、文本与 URL 预览正确接线并响应失败空态', async () => {
    const img = await mountDrawer(resourceOf(fileSource(), ResourceKind.ResourceKindImage))
    expect(img.host.querySelector('img')?.getAttribute('src')).toBe('/resource-media/source-1')
    img.host.querySelector('img')?.dispatchEvent(new Event('error'))
    await nextTick()
    expect(img.host.querySelector('web-ui-empty')?.getAttribute('title')).toBe('无法显示这张图片')

    const video = await mountDrawer(resourceOf(fileSource({ location: '/tmp/a.mp4' }), ResourceKind.ResourceKindVideo))
    expect(video.host.querySelector('video')?.hasAttribute('controls')).toBe(true)

    const audio = await mountDrawer(resourceOf(fileSource({ location: '/tmp/a.mp3' }), ResourceKind.ResourceKindAudio))
    audio.host.querySelector('audio')?.dispatchEvent(new Event('error'))
    await nextTick()
    expect(audio.host.querySelector('web-ui-empty')?.getAttribute('title')).toBe('无法播放这个音频')

    const text = await mountDrawer(
      resourceOf(fileSource({ location: '/tmp/a.txt' }), ResourceKind.ResourceKindDocument)
    )
    await flush()
    expect(text.host.querySelector('pre')?.textContent).toBe('内容')

    const url = await mountDrawer(
      resourceOf(
        fileSource({ id: 'source-url', type: 'url', location: 'https://example.com/x', mediaUrl: null }),
        ResourceKind.ResourceKindWeb
      )
    )
    const frame = url.host.querySelector('iframe')
    expect(frame?.getAttribute('src')).toBe('https://example.com/x')
    expect(frame?.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
    )
  })

  it('预览未打开时不挂载媒体节点与 iframe', async () => {
    const video = await mountDrawer(
      resourceOf(fileSource({ location: '/tmp/a.mp4' }), ResourceKind.ResourceKindVideo),
      { open: false }
    )
    expect(video.host.querySelector('video')).toBeNull()

    const url = await mountDrawer(
      resourceOf(
        fileSource({ id: 'source-url', type: 'url', location: 'https://example.com/x', mediaUrl: null }),
        ResourceKind.ResourceKindWeb
      ),
      { open: false }
    )
    expect(url.host.querySelector('iframe')).toBeNull()
  })
})
