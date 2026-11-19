// 视频帧候选与黑帧回退的编排行为：候选表怎么被消费、黑帧怎么触发回退、非黑帧怎么落缩略图。
// 像素与解码只在真实浏览器成立（jsdom 的 getContext 返回 null），但真实视频编码的帧内容与
// 时长不可控，所以媒体属性与画布像素按用例脚本给定、事件链路（loadedmetadata / seeked）逐个
// 真实派发——被测的是 ResourceThumbnail 的回退编排，不是解码器本身。
import '@greypan/web-ui'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ResourceSourceView } from '../../../stores/library'
import ResourceThumbnail from '../ResourceThumbnail.vue'
import { videoFrameRatio } from '../thumbnail'

function fileSource(): ResourceSourceView {
  return {
    id: 'source-1',
    type: 'file',
    location: '/tmp/movie.mp4',
    available: true,
    isPreferred: true,
    orderIndex: 0,
    mediaUrl: null,
    thumbnailUrl: null,
    metadata: null
  }
}

const hosts: HTMLElement[] = []
const apps: { unmount: () => void }[] = []
let originalLoad: typeof HTMLMediaElement.prototype.load | undefined

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  if (originalLoad) {
    HTMLMediaElement.prototype.load = originalLoad
    originalLoad = undefined
  }
})

/** 黑帧按 isBlackFrame 的口径必须判黑；非黑帧给足亮度。 */
const BLACK_PIXEL = new Uint8ClampedArray([0, 0, 0, 255])
const WHITE_PIXEL = new Uint8ClampedArray([200, 200, 200, 255])

interface Walk {
  seeks: number[]
}

/**
 * 挂载一个 video 缩略图并接管媒体属性与画布像素：
 * - `load` 换成 noop：src 不真的拉流，loadedmetadata / seeked 由用例手动派发；
 * - duration / videoWidth / videoHeight / currentTime 在实例上覆写；
 * - `getImageData` 第 `blackFrames` 次读取前回黑像素、之后回白像素。
 */
async function mountVideoWalk(blackFrames: number, saveThumbnail: (dataUrl: string) => void): Promise<Walk> {
  originalLoad = HTMLMediaElement.prototype.load
  HTMLMediaElement.prototype.load = () => {}

  const host = document.createElement('div')
  document.body.append(host)
  hosts.push(host)
  const app = createApp({
    setup() {
      return () =>
        h(ResourceThumbnail, {
          kind: ResourceKind.ResourceKindVideo,
          source: fileSource(),
          mediaUrl: '/resource-media/thumbnail-frame-walk',
          saveThumbnail
        })
    }
  })
  apps.push(app)
  app.mount(host)
  await nextTick()

  const video = host.querySelector('video')!
  Object.defineProperty(video, 'duration', { configurable: true, value: 8 })
  Object.defineProperty(video, 'videoWidth', { configurable: true, value: 640 })
  Object.defineProperty(video, 'videoHeight', { configurable: true, value: 360 })
  Object.defineProperty(video, 'readyState', { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA })
  let currentTime = 0
  const seeks: number[] = []
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => currentTime,
    set: value => {
      currentTime = value
      seeks.push(value)
    }
  })

  const canvas = host.querySelector('canvas')!
  let reads = 0
  canvas.getContext = (() => ({
    drawImage: () => {},
    getImageData: () => ({
      data: reads++ < blackFrames ? BLACK_PIXEL : WHITE_PIXEL
    })
  })) as unknown as typeof canvas.getContext

  video.dispatchEvent(new Event('loadedmetadata'))
  await nextTick()
  return { seeks }
}

describe('ResourceThumbnail 视频帧候选与黑帧回退（真实浏览器）', () => {
  it('首选候选落在 25% 处；黑帧逐个回退，捕获到非黑帧才落缩略图', async () => {
    const saveThumbnail = vi.fn<(dataUrl: string) => void>()
    const { seeks } = await mountVideoWalk(3, saveThumbnail)

    // 首选候选的接线由行为承接（原 thumbnail.spec 的 ratio 字面量钉死改派生关系）：
    // 第一次 seek 就是 duration × videoFrameRatio。
    expect(seeks[0]).toBe(8 * videoFrameRatio)
    expect(seeks.length, '首选帧捕获前只应 seek 一次').toBe(1)

    // 逐步喂 seeked：前 3 次读黑 → 回退，第 4 次读到非黑 → 落图并回填一次。
    for (let i = 0; i < 32 && saveThumbnail.mock.calls.length === 0; i += 1) {
      document.querySelector('video')!.dispatchEvent(new Event('seeked'))
      await nextTick()
    }

    expect(saveThumbnail).toHaveBeenCalledTimes(1)
    expect(saveThumbnail).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/jpeg;/))
    expect(seeks.length, '黑帧之后必须继续 seek 后续候选').toBeGreaterThan(1)
    expect(hosts[0]!.querySelector('img[src^="data:image/jpeg"]'), '捕获结果应渲染为缩略图').not.toBeNull()
  })

  it('首选帧非黑时直接落图，不再回退', async () => {
    const saveThumbnail = vi.fn<(dataUrl: string) => void>()
    const { seeks } = await mountVideoWalk(0, saveThumbnail)

    document.querySelector('video')!.dispatchEvent(new Event('seeked'))
    await nextTick()

    expect(saveThumbnail).toHaveBeenCalledTimes(1)
    expect(seeks.length, '首选帧非黑：不应有多余的回退 seek').toBe(1)
  })
})
