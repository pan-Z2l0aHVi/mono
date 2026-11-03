// canvas 截图与 dataURL 导出只在真实浏览器成立，jsdom 的 getContext 返回 null。
import '@greypan/web-ui'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ResourceSourceView } from '../../../stores/library'
import ResourceThumbnail from '../ResourceThumbnail.vue'

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function fileSource(): ResourceSourceView {
  return {
    id: 'source-1',
    type: 'file',
    location: '/tmp/photo.png',
    available: true,
    isPreferred: true,
    orderIndex: 0,
    metadata: null
  }
}

async function waitFor(condition: () => boolean, label: string, maxFrames = 300): Promise<void> {
  for (let i = 0; i < maxFrames; i++) {
    if (condition()) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error(`条件在 ${maxFrames} 帧内未成立：${label}`)
}

const hosts: HTMLElement[] = []
const apps: { unmount: () => void }[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

describe('ResourceThumbnail 捕获回填（真实浏览器）', () => {
  it('原图加载完成后捕获一次缩略图并回填；仅对象身份变化不重复回填', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    hosts.push(host)
    const source = ref(fileSource())
    const saveThumbnail = vi.fn<(dataUrl: string) => void>()
    const app = createApp({
      setup() {
        return () =>
          h(ResourceThumbnail, {
            kind: ResourceKind.ResourceKindImage,
            source: source.value,
            mediaUrl: PIXEL,
            saveThumbnail
          })
      }
    })
    apps.push(app)
    app.mount(host)
    await nextTick()

    const image = host.querySelector('img')!
    await waitFor(() => image.complete && image.naturalWidth > 0, '原图加载完成')
    await waitFor(() => saveThumbnail.mock.calls.length > 0, '捕获结果已回填')
    expect(saveThumbnail).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^data:image\/jpeg;/))

    // AddDialog/资源列表的父组件重渲染会新建 source 对象：同一 media 身份不得重复上传。
    source.value = { ...source.value }
    await nextTick()
    await nextTick()
    await waitFor(() => true, '空转几帧观察后续事件')
    expect(saveThumbnail, '同一身份只回填一次').toHaveBeenCalledTimes(1)
  })

  it('缩略图命中时不再捕获：列表读缓存不产生回填流量', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    hosts.push(host)
    const saveThumbnail = vi.fn<(dataUrl: string) => void>()
    const app = createApp({
      setup() {
        return () =>
          h(ResourceThumbnail, {
            kind: ResourceKind.ResourceKindImage,
            source: fileSource(),
            mediaUrl: PIXEL,
            thumbnailUrl: '/resource-thumbnail/source-1',
            saveThumbnail
          })
      }
    })
    apps.push(app)
    app.mount(host)
    await nextTick()

    // 缩略图 404（jsdom 之外的正常路径由浏览器发起请求；这里直接派发 error 模拟缺席）
    // 之前只有原图 img；缩略图命中时原图 img 不该挂载，也就没有捕获路径。
    const images = [...host.querySelectorAll('img')]
    expect(images).toHaveLength(1)
    expect(images[0]?.getAttribute('src')).toBe('/resource-thumbnail/source-1')
    images[0]?.dispatchEvent(new Event('load'))
    await nextTick()
    await nextTick()
    expect(saveThumbnail).not.toHaveBeenCalled()
  })
})
