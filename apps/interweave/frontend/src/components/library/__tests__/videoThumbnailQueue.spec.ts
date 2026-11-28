import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { createVideoThumbnailCoordinator } from '../videoThumbnailQueue'

interface MockVideoHandle {
  video: HTMLVideoElement
  srcs: string[]
  seeks: number[]
  setDuration: (d: number) => void
  setDimensions: (w: number, h: number) => void
  setReadyState: (state: number) => void
  setErrorCode: (code: number | null) => void
  dispatch: (type: string) => void
}

function createMockVideo(): MockVideoHandle {
  const target = new EventTarget()
  const srcs: string[] = []
  const seeks: number[] = []
  let src = ''
  let currentTime = 0
  let duration = 10
  let videoWidth = 640
  let videoHeight = 360
  let readyState = 4 // HAVE_ENOUGH_DATA
  let errorCode: number | null = null
  let crossOrigin: string | null = null

  const video = {
    preload: '',
    muted: false,
    playsInline: false,
    get crossOrigin() {
      return crossOrigin
    },
    set crossOrigin(val: string | null) {
      crossOrigin = val
    },
    removeAttribute(name: string) {
      if (name === 'src') src = ''
      if (name === 'crossorigin') crossOrigin = null
    },
    get src() {
      return src
    },
    set src(val: string) {
      src = val
      if (val) srcs.push(val)
    },
    get currentTime() {
      return currentTime
    },
    set currentTime(val: number) {
      currentTime = val
      seeks.push(val)
    },
    get duration() {
      return duration
    },
    get videoWidth() {
      return videoWidth
    },
    get videoHeight() {
      return videoHeight
    },
    get readyState() {
      return readyState
    },
    get error() {
      return errorCode === null ? null : ({ code: errorCode } as MediaError)
    },
    pause: vi.fn<() => void>(),
    load: vi.fn<() => void>(),
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target)
  } as unknown as HTMLVideoElement

  return {
    video,
    srcs,
    seeks,
    setDuration: d => {
      duration = d
    },
    setDimensions: (w, h) => {
      videoWidth = w
      videoHeight = h
    },
    setReadyState: s => {
      readyState = s
    },
    setErrorCode: code => {
      errorCode = code
    },
    dispatch: type => {
      target.dispatchEvent(new Event(type))
    }
  }
}

function createMockCanvasFactory(pixelSequence: Uint8ClampedArray[]) {
  let sampleIdx = 0
  return () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: (_type: string, opts?: { willReadFrequently?: boolean }) => {
        if (opts?.willReadFrequently) {
          return {
            clearRect: () => {},
            drawImage: () => {},
            getImageData: () => ({
              data:
                pixelSequence[Math.min(sampleIdx++, pixelSequence.length - 1)] ??
                new Uint8ClampedArray([200, 200, 200, 255])
            })
          }
        }
        return {
          drawImage: () => {}
        }
      },
      toBlob: (cb: BlobCallback, type?: string) => {
        cb(new Blob(['jpeg-bytes'], { type: type ?? 'image/jpeg' }))
      }
    }
    return canvas as unknown as HTMLCanvasElement
  }
}

const WHITE = new Uint8ClampedArray([200, 200, 200, 255])
const BLACK = new Uint8ClampedArray([0, 0, 0, 255])

describe('videoThumbnailCoordinator', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('严格维持全局并发 = 1，优先解码当前视口顶部项，同优先级按 FIFO 从上到下', async () => {
    const mock = createMockVideo()
    const coordinator = createVideoThumbnailCoordinator({
      createVideo: () => mock.video,
      createCanvas: createMockCanvasFactory([WHITE])
    })

    // s1 立即占用唯一通道；随后入队视口外底部项 s2、视口中下部 s3、视口顶部 s4。
    const p1 = coordinator.capture({ key: 's1', location: '/a.mp4', mediaUrl: '/media/s1', getPriority: () => 0 })
    const p2 = coordinator.capture({
      key: 's2',
      location: '/b.mp4',
      mediaUrl: '/media/s2',
      getPriority: () => 1_000_200
    })
    const p3 = coordinator.capture({ key: 's3', location: '/c.mp4', mediaUrl: '/media/s3', getPriority: () => 300 })
    const p4 = coordinator.capture({ key: 's4', location: '/d.mp4', mediaUrl: '/media/s4', getPriority: () => 64 })

    expect(mock.srcs).toEqual(['/media/s1'])

    // 完成 s1 → 优先跑视口最顶部的 s4，再跑视口内的 s3，最后跑视口外 buffer 的 s2。
    mock.dispatch('loadedmetadata')
    mock.dispatch('seeked')
    expect(await p1).toBeInstanceOf(Blob)
    expect(mock.srcs).toEqual(['/media/s1', '/media/s4'])

    mock.dispatch('loadedmetadata')
    mock.dispatch('seeked')
    expect(await p4).toBeInstanceOf(Blob)
    expect(mock.srcs).toEqual(['/media/s1', '/media/s4', '/media/s3'])

    mock.dispatch('loadedmetadata')
    mock.dispatch('seeked')
    expect(await p3).toBeInstanceOf(Blob)
    expect(mock.srcs).toEqual(['/media/s1', '/media/s4', '/media/s3', '/media/s2'])

    mock.dispatch('loadedmetadata')
    mock.dispatch('seeked')
    expect(await p2).toBeInstanceOf(Blob)
  })

  it('订阅者引用计数去重：单方取消不误杀其余订阅者，全部取消才中断且不写负缓存', async () => {
    const mock = createMockVideo()
    const coordinator = createVideoThumbnailCoordinator({
      createVideo: () => mock.video,
      createCanvas: createMockCanvasFactory([WHITE])
    })

    const ac1 = new AbortController()
    const ac2 = new AbortController()
    const p1 = coordinator.capture({ key: 's1', location: '/a.mp4', mediaUrl: '/media/s1', signal: ac1.signal })
    const p2 = coordinator.capture({ key: 's1', location: '/a.mp4', mediaUrl: '/media/s1', signal: ac2.signal })

    expect(mock.srcs).toEqual(['/media/s1'])

    // 取消第一个订阅者：任务仍在运行，不触发 pause。
    ac1.abort()
    expect(await p1).toBeNull()
    expect(mock.video.pause).not.toHaveBeenCalled()

    // 第二个订阅者正常拿到结果。
    mock.dispatch('loadedmetadata')
    mock.dispatch('seeked')
    expect(await p2).toBeInstanceOf(Blob)

    // 另一任务全部订阅者取消后立即中断，但重新请求仍可正常解码（不进入负缓存）。
    const ac3 = new AbortController()
    const p3 = coordinator.capture({ key: 's2', location: '/b.mp4', mediaUrl: '/media/s2', signal: ac3.signal })
    ac3.abort()
    expect(await p3).toBeNull()
    expect(mock.video.pause).toHaveBeenCalled()

    const p4 = coordinator.capture({ key: 's2', location: '/b.mp4', mediaUrl: '/media/s2' })
    expect(mock.srcs.at(-1)).toBe('/media/s2')
    mock.dispatch('loadedmetadata')
    mock.dispatch('seeked')
    expect(await p4).toBeInstanceOf(Blob)
  })

  it('duration = 0 / NaN 时命中 t=0 保护，无需等待 seeked 即可直接出图', async () => {
    const mock = createMockVideo()
    mock.setDuration(Number.NaN)
    mock.setReadyState(4)
    const coordinator = createVideoThumbnailCoordinator({
      createVideo: () => mock.video,
      createCanvas: createMockCanvasFactory([WHITE])
    })

    const p = coordinator.capture({ key: 's0', location: '/zero.mp4', mediaUrl: '/media/s0' })
    mock.dispatch('loadedmetadata')

    expect(mock.seeks).toEqual([])
    expect(await p).toBeInstanceOf(Blob)
  })

  it('5 秒超时时若有首帧兜底则返回兜底帧；无兜底帧时进入冷却而非负缓存', async () => {
    vi.useFakeTimers()
    let now = 1000
    const mock = createMockVideo()
    // 全部采样判黑，但首帧已经画入输出画布作为兜底。
    const coordinator = createVideoThumbnailCoordinator({
      createVideo: () => mock.video,
      createCanvas: createMockCanvasFactory([BLACK, BLACK, BLACK, BLACK, BLACK]),
      decodeTimeoutMs: 5000,
      cooldownMs: 10000,
      now: () => now
    })

    const p1 = coordinator.capture({ key: 's-fallback', location: '/dark.mp4', mediaUrl: '/media/dark' })
    mock.dispatch('loadedmetadata')
    // 触发一次 seeked，使首帧写入兜底画布，但后续候选一直未返回 seeked 直至超时。
    mock.dispatch('seeked')
    vi.advanceTimersByTime(5000)
    expect(await p1).toBeInstanceOf(Blob)

    // 无任何有效帧时超时 → 返回 null 并进入冷却，冷却期内不重复触发，冷却结束后允许重试。
    const p2 = coordinator.capture({ key: 's-hang', location: '/hang.mp4', mediaUrl: '/media/hang' })
    vi.advanceTimersByTime(5000)
    expect(await p2).toBeNull()

    const beforeCount = mock.srcs.length
    expect(await coordinator.capture({ key: 's-hang', location: '/hang.mp4', mediaUrl: '/media/hang' })).toBeNull()
    expect(mock.srcs.length).toBe(beforeCount)

    now += 10001
    const pRetry = coordinator.capture({ key: 's-hang', location: '/hang.mp4', mediaUrl: '/media/hang' })
    expect(mock.srcs.length).toBe(beforeCount + 1)
    vi.advanceTimersByTime(5000)
    expect(await pRetry).toBeNull()
  })

  it('确定性解码错误写入负缓存，但 ReplaceSource 更换 location 后自动绕过旧负缓存', async () => {
    const mock = createMockVideo()
    const coordinator = createVideoThumbnailCoordinator({
      createVideo: () => mock.video,
      createCanvas: createMockCanvasFactory([WHITE])
    })

    const p1 = coordinator.capture({ key: 's1', location: '/bad.mp4', mediaUrl: '/media/s1' })
    mock.setErrorCode(4) // MEDIA_ERR_SRC_NOT_SUPPORTED
    mock.dispatch('error')
    expect(await p1).toBeNull()

    const countAfterFail = mock.srcs.length
    // 同一 key + location 命中负缓存，不再触发解码。
    expect(await coordinator.capture({ key: 's1', location: '/bad.mp4', mediaUrl: '/media/s1' })).toBeNull()
    expect(mock.srcs.length).toBe(countAfterFail)

    // location 变化（ReplaceSource）绕过负缓存，正常解码。
    mock.setErrorCode(null)
    const p2 = coordinator.capture({ key: 's1', location: '/fixed.mp4', mediaUrl: '/media/s1' })
    expect(mock.srcs.length).toBe(countAfterFail + 1)
    mock.dispatch('loadedmetadata')
    mock.dispatch('seeked')
    expect(await p2).toBeInstanceOf(Blob)
  })

  it('pendingBlobs 交接给 inFlightUploads 并限制回填上传并发 <= 2 且异常后释放', async () => {
    const mock = createMockVideo()
    const coordinator = createVideoThumbnailCoordinator({
      createVideo: () => mock.video,
      createCanvas: createMockCanvasFactory([WHITE]),
      maxUploadConcurrency: 2
    })

    const p = coordinator.capture({
      key: 'tok-1',
      location: '/movie.mp4',
      mediaUrl: '/pending-resource-media/tok-1',
      pendingToken: 'tok-1'
    })
    mock.dispatch('loadedmetadata')
    mock.dispatch('seeked')
    const blob = await p
    expect(blob).toBeInstanceOf(Blob)
    expect(coordinator.getPendingBlob('tok-1')).toBe(blob)

    let active = 0
    let maxObserved = 0
    const resolvers: (() => void)[] = []
    const uploader = vi.fn<() => Promise<void>>(async () => {
      active++
      maxObserved = Math.max(maxObserved, active)
      await new Promise<void>(resolve => resolvers.push(resolve))
      active--
    })

    // 交接 tok-1 → 立即出现在 inFlightUploads，pendingBlobs 被消费。
    expect(coordinator.handoffPendingThumbnail('tok-1', 'src-1', '/resource-thumbnail/src-1', uploader)).toBe(true)
    expect(coordinator.getPendingBlob('tok-1')).toBeNull()
    expect(coordinator.getInFlightBlob('src-1')).toBe(blob)

    // 再提交 2 个上传任务，验证并发上限为 2。
    const u2 = coordinator.uploadThumbnail('src-2', '/resource-thumbnail/src-2', blob!, uploader)
    const u3 = coordinator.uploadThumbnail('src-3', '/resource-thumbnail/src-3', blob!, uploader)
    expect(maxObserved).toBe(2)
    expect(resolvers).toHaveLength(2)

    resolvers.shift()!()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(resolvers).toHaveLength(2)
    resolvers.shift()!()
    resolvers.shift()!()
    await Promise.all([u2, u3])

    expect(coordinator.getInFlightBlob('src-1')).toBeNull()
    expect(coordinator.getInFlightBlob('src-2')).toBeNull()
    expect(coordinator.getInFlightBlob('src-3')).toBeNull()
  })
})
