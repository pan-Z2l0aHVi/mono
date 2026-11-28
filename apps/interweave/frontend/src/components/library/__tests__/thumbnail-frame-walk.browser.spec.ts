// 视频帧候选与黑帧回退的编排行为：候选表怎么被消费、黑帧怎么触发回退、非黑帧怎么落缩略图。
// ResourceThumbnail 本身不挂载内联 <video> / <canvas>，而是委托全局离屏 videoThumbnailCoordinator；
// 本测试在真实 Chromium 环境下接管离屏 <video> 与采样画布像素，验证整条端到端链路。
import '@greypan/web-ui'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ResourceSourceView } from '../../../stores/library'
import ResourceThumbnail from '../ResourceThumbnail.vue'
import { SAMPLE_CANVAS_EDGE, videoFrameRatio } from '../thumbnail'
import { videoThumbnailCoordinator, type ThumbnailPayload } from '../videoThumbnailQueue'

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
let restoreCreateElement: (() => void) | null = null

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  videoThumbnailCoordinator.reset()
  restoreCreateElement?.()
  restoreCreateElement = null
})

const BLACK_PIXEL = new Uint8ClampedArray([0, 0, 0, 255])
const WHITE_PIXEL = new Uint8ClampedArray([200, 200, 200, 255])

interface Walk {
  video: HTMLVideoElement
  seeks: number[]
}

async function waitFor(condition: () => boolean, label: string, maxFrames = 120): Promise<void> {
  for (let i = 0; i < maxFrames; i++) {
    if (condition()) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error(`条件在 ${maxFrames} 帧内未成立：${label}`)
}

/**
 * 拦截全局协调器创建的离屏 <video> 与 32×32 采样画布：
 * - ResourceThumbnail DOM 中不得存在内联 <video> 或 <canvas>；
 * - 离屏 <video> 的 duration/videoWidth/videoHeight/currentTime 由用例可控；
 * - 32×32 采样画布前 blackFrames 次返回黑像素，之后返回白像素；
 * - 320px 输出画布走真实 Chromium toBlob('image/jpeg')。
 */
async function mountVideoWalk(blackFrames: number, saveThumbnail: (payload: ThumbnailPayload) => void): Promise<Walk> {
  videoThumbnailCoordinator.reset()

  const originalCreateElement = document.createElement.bind(document)
  let offscreenVideo: HTMLVideoElement | null = null
  const seeks: number[] = []
  let sampleReads = 0

  const spy = vi.spyOn(document, 'createElement').mockImplementation(((
    tagName: string,
    options?: ElementCreationOptions
  ) => {
    const el = originalCreateElement(tagName, options)
    if (tagName.toLowerCase() === 'video' && !offscreenVideo) {
      offscreenVideo = el as HTMLVideoElement
      offscreenVideo.load = () => {}
      offscreenVideo.pause = () => {}
      Object.defineProperty(offscreenVideo, 'duration', { configurable: true, value: 8 })
      Object.defineProperty(offscreenVideo, 'videoWidth', { configurable: true, value: 640 })
      Object.defineProperty(offscreenVideo, 'videoHeight', { configurable: true, value: 360 })
      Object.defineProperty(offscreenVideo, 'readyState', {
        configurable: true,
        value: HTMLMediaElement.HAVE_CURRENT_DATA
      })
      let currentTime = 0
      Object.defineProperty(offscreenVideo, 'currentTime', {
        configurable: true,
        get: () => currentTime,
        set: value => {
          currentTime = value
          seeks.push(value)
        }
      })
    } else if (tagName.toLowerCase() === 'canvas') {
      const canvas = el as HTMLCanvasElement
      const originalGetContext = canvas.getContext.bind(canvas)
      canvas.getContext = ((contextId: string, ctxOptions?: CanvasRenderingContext2DSettings) => {
        const ctx = originalGetContext(contextId, ctxOptions) as CanvasRenderingContext2D | null
        if (contextId !== '2d' || !ctx) return ctx
        if (ctxOptions?.willReadFrequently) {
          return {
            clearRect: () => {},
            drawImage: () => {},
            getImageData: (_x: number, _y: number, w: number, h: number) => {
              if (w !== SAMPLE_CANVAS_EDGE || h !== SAMPLE_CANVAS_EDGE) {
                throw new Error(`expected ${SAMPLE_CANVAS_EDGE}x${SAMPLE_CANVAS_EDGE} sample canvas, got ${w}x${h}`)
              }
              return { data: sampleReads++ < blackFrames ? BLACK_PIXEL : WHITE_PIXEL }
            }
          } as unknown as CanvasRenderingContext2D
        }
        // 输出画布保留真实 toBlob，仅将 drawImage(mockVideo) 替换为填充矩形，避免无真实视频流时 drawImage 抛错。
        ctx.drawImage = (() => {
          ctx.fillStyle = '#c8c8c8'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }) as unknown as CanvasRenderingContext2D['drawImage']
        return ctx
      }) as typeof canvas.getContext
    }
    return el
  }) as typeof document.createElement)

  restoreCreateElement = () => spy.mockRestore()

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
          saveThumbnail,
          dwellMs: 0
        })
    }
  })
  apps.push(app)
  app.mount(host)
  await nextTick()

  expect(host.querySelector('video'), '列表项 DOM 内不得挂载内联 <video>').toBeNull()
  expect(host.querySelector('canvas'), '列表项 DOM 内不得挂载内联 <canvas>').toBeNull()
  expect(offscreenVideo, '应由离屏队列创建单一 <video>').not.toBeNull()

  offscreenVideo!.dispatchEvent(new Event('loadedmetadata'))
  await nextTick()
  return { video: offscreenVideo!, seeks }
}

describe('ResourceThumbnail 视频帧候选与黑帧回退（真实浏览器）', () => {
  it('首选候选落在 25% 处；黑帧逐个回退，捕获到非黑帧才落缩略图', async () => {
    const saveThumbnail = vi.fn<(payload: ThumbnailPayload) => void>()
    const { video, seeks } = await mountVideoWalk(3, saveThumbnail)

    expect(seeks[0]).toBe(8 * videoFrameRatio)
    expect(seeks.length, '首选帧捕获前只应 seek 一次').toBe(1)

    for (let i = 0; i < 10 && saveThumbnail.mock.calls.length === 0; i += 1) {
      video.dispatchEvent(new Event('seeked'))
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    await waitFor(() => saveThumbnail.mock.calls.length > 0, '捕获结果已回填')
    expect(saveThumbnail).toHaveBeenCalledTimes(1)
    expect(saveThumbnail).toHaveBeenCalledWith(expect.any(Blob))
    expect((saveThumbnail.mock.calls[0]![0] as Blob).type).toBe('image/jpeg')
    expect(seeks.length, '黑帧之后必须继续 seek 后续候选').toBeGreaterThan(1)
    expect(hosts[0]!.querySelector('img[src^="blob:"]'), '捕获结果应以 objectURL 渲染为缩略图').not.toBeNull()
  })

  it('首选帧非黑时直接落图，不再回退', async () => {
    const saveThumbnail = vi.fn<(payload: ThumbnailPayload) => void>()
    const { video, seeks } = await mountVideoWalk(0, saveThumbnail)

    video.dispatchEvent(new Event('seeked'))
    await waitFor(() => saveThumbnail.mock.calls.length > 0, '首帧捕获完成')

    expect(saveThumbnail).toHaveBeenCalledTimes(1)
    expect(seeks.length, '首选帧非黑：不应有多余的回退 seek').toBe(1)
  })
})
