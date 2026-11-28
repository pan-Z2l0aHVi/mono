import {
  SAMPLE_CANVAS_EDGE,
  THUMBNAIL_JPEG_QUALITY,
  THUMBNAIL_MAX_EDGE,
  isBlackFrame,
  isCrossOriginMediaUrl,
  videoFrameCandidates
} from './thumbnail'

export type ThumbnailPayload = Blob | string

export type ThumbnailUploader = (thumbnailUrl: string, blob: Blob) => Promise<void>

export interface VideoCaptureRequest {
  /** 业务身份键：主列表传 source.id，添加弹窗传 pendingToken（或队列项 id）。 */
  key: string
  /** 文件位置；与 key 组成版本键，ReplaceSource 换位置后自动失效旧负缓存。 */
  location: string
  /** 可播放的视频媒体地址。 */
  mediaUrl: string
  /** 若提供，捕获成功后同步暂存到 pendingBlobs，供导入落库时交接给主列表复用。 */
  pendingToken?: string | null
  /** 订阅者取消信号（行卸载、弹窗关闭或开始提交）。 */
  signal?: AbortSignal | null
  /** 动态优先级回调（值越小越优先，例如当前视口顶部坐标）；缺省按 FIFO 顺序。 */
  getPriority?: () => number
}

export interface VideoThumbnailCoordinatorOptions {
  createVideo?: () => HTMLVideoElement
  createCanvas?: () => HTMLCanvasElement
  decodeTimeoutMs?: number
  uploadTimeoutMs?: number
  maxDecodeConcurrency?: number
  maxUploadConcurrency?: number
  cooldownMs?: number
  maxTransientAttempts?: number
  maxPendingEntries?: number
  maxPendingBytes?: number
  maxNegativeCacheEntries?: number
  maxCooldownEntries?: number
  now?: () => number
}

interface CaptureSubscriber {
  resolve: (blob: Blob | null) => void
  signal: AbortSignal | null
  getPriority: (() => number) | null
  cleanup: () => void
}

interface CaptureTask {
  versionKey: string
  mediaUrl: string
  seq: number
  pendingTokens: Set<string>
  subscribers: Set<CaptureSubscriber>
}

interface DecodeWorker {
  videoEl: HTMLVideoElement | null
  sampleCanvasEl: HTMLCanvasElement | null
  outputCanvasEl: HTMLCanvasElement | null
  activeTask: CaptureTask | null
  runId: number
  abortActiveDecode: (() => void) | null
}

interface UploadJob {
  sourceId: string
  thumbnailUrl: string
  blob: Blob
  uploader: ThumbnailUploader
  resolve: () => void
}

const DEFAULT_DECODE_TIMEOUT_MS = 5000
const DEFAULT_UPLOAD_TIMEOUT_MS = 10000
const DEFAULT_MAX_DECODE_CONCURRENCY = 2
const DEFAULT_MAX_UPLOAD_CONCURRENCY = 2
const DEFAULT_COOLDOWN_MS = 15000
const DEFAULT_MAX_TRANSIENT_ATTEMPTS = 2
const DEFAULT_MAX_PENDING_ENTRIES = 100
const DEFAULT_MAX_PENDING_BYTES = 15 * 1024 * 1024
const DEFAULT_MAX_NEGATIVE_CACHE_ENTRIES = 500
const DEFAULT_MAX_COOLDOWN_ENTRIES = 500
const MEDIA_ERR_DECODE = 3
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4

export function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = THUMBNAIL_JPEG_QUALITY): Promise<Blob | null> {
  return new Promise(resolve => {
    if (typeof canvas.toBlob === 'function') {
      try {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality)
        return
      } catch {
        resolve(null)
        return
      }
    }
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      const comma = dataUrl.indexOf(',')
      if (comma < 0) {
        resolve(null)
        return
      }
      const binary = atob(dataUrl.slice(comma + 1))
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      resolve(new Blob([bytes], { type: 'image/jpeg' }))
    } catch {
      resolve(null)
    }
  })
}

export function createVideoThumbnailCoordinator(options: VideoThumbnailCoordinatorOptions = {}) {
  const decodeTimeoutMs = options.decodeTimeoutMs ?? DEFAULT_DECODE_TIMEOUT_MS
  const uploadTimeoutMs = options.uploadTimeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS
  const maxDecodeConcurrency = Math.max(1, options.maxDecodeConcurrency ?? DEFAULT_MAX_DECODE_CONCURRENCY)
  const maxUploadConcurrency = Math.max(1, options.maxUploadConcurrency ?? DEFAULT_MAX_UPLOAD_CONCURRENCY)
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS
  const maxTransientAttempts = Math.max(1, options.maxTransientAttempts ?? DEFAULT_MAX_TRANSIENT_ATTEMPTS)
  const maxPendingEntries = Math.max(1, options.maxPendingEntries ?? DEFAULT_MAX_PENDING_ENTRIES)
  const maxPendingBytes = Math.max(1024, options.maxPendingBytes ?? DEFAULT_MAX_PENDING_BYTES)
  const maxNegativeCacheEntries = Math.max(1, options.maxNegativeCacheEntries ?? DEFAULT_MAX_NEGATIVE_CACHE_ENTRIES)
  const maxCooldownEntries = Math.max(1, options.maxCooldownEntries ?? DEFAULT_MAX_COOLDOWN_ENTRIES)
  const now = options.now ?? (() => Date.now())

  // 固定规模的离屏 <video> + <canvas> 解码池（默认 2 路并发），每槽位惰性创建元素并复用。
  const decodeWorkers: DecodeWorker[] = Array.from({ length: maxDecodeConcurrency }, () => ({
    videoEl: null,
    sampleCanvasEl: null,
    outputCanvasEl: null,
    activeTask: null,
    runId: 0,
    abortActiveDecode: null
  }))

  // 视口顶部优先 + FIFO 待解码队列，同一 versionKey 合并订阅者。
  const pendingQueue: CaptureTask[] = []
  const tasksByKey = new Map<string, CaptureTask>()
  let nextSeq = 0

  // 受控负缓存：仅记录确定性不可解码错误，永不记录 AbortError。
  const negativeCache = new Set<string>()
  // 瞬态失败（5s 超时 / 网络错误）的队列级冷却表。
  const cooldownMap = new Map<string, { attempts: number; nextRetryAt: number }>()

  // 正在回填上传中的缩略图 Blob（按 sourceId 索引），供列表行无缝复用。
  const inFlightUploads = new Map<string, { blob: Blob; promise: Promise<void> }>()
  const uploadQueue: UploadJob[] = []
  let activeUploads = 0

  // 添加弹窗已捕获但尚未落库的缩略图 Blob（按 pendingToken 索引），带数量与字节双上限。
  const pendingBlobs = new Map<string, { blob: Blob; bytes: number }>()
  let totalPendingBytes = 0

  function ensureVideo(worker: DecodeWorker): HTMLVideoElement | null {
    if (worker.videoEl) return worker.videoEl
    if (options.createVideo) {
      worker.videoEl = options.createVideo()
    } else if (typeof document !== 'undefined') {
      worker.videoEl = document.createElement('video')
    } else {
      return null
    }
    worker.videoEl.preload = 'metadata'
    worker.videoEl.muted = true
    worker.videoEl.playsInline = true
    return worker.videoEl
  }

  function ensureSampleCanvas(worker: DecodeWorker): HTMLCanvasElement | null {
    if (worker.sampleCanvasEl) return worker.sampleCanvasEl
    if (options.createCanvas) {
      worker.sampleCanvasEl = options.createCanvas()
    } else if (typeof document !== 'undefined') {
      worker.sampleCanvasEl = document.createElement('canvas')
    } else {
      return null
    }
    worker.sampleCanvasEl.width = SAMPLE_CANVAS_EDGE
    worker.sampleCanvasEl.height = SAMPLE_CANVAS_EDGE
    return worker.sampleCanvasEl
  }

  function ensureOutputCanvas(worker: DecodeWorker): HTMLCanvasElement | null {
    if (worker.outputCanvasEl) return worker.outputCanvasEl
    if (options.createCanvas) {
      worker.outputCanvasEl = options.createCanvas()
    } else if (typeof document !== 'undefined') {
      worker.outputCanvasEl = document.createElement('canvas')
    } else {
      return null
    }
    return worker.outputCanvasEl
  }

  function findIdleWorker(): DecodeWorker | null {
    return decodeWorkers.find(worker => worker.activeTask === null) ?? null
  }

  function findWorkerForTask(task: CaptureTask): DecodeWorker | null {
    return decodeWorkers.find(worker => worker.activeTask === task) ?? null
  }

  function recordNegative(versionKey: string) {
    if (negativeCache.has(versionKey)) return
    if (negativeCache.size >= maxNegativeCacheEntries) {
      const oldest = negativeCache.values().next().value
      if (oldest !== undefined) negativeCache.delete(oldest)
    }
    negativeCache.add(versionKey)
  }

  function recordTransientFailure(versionKey: string) {
    const prev = cooldownMap.get(versionKey)
    const attempts = (prev?.attempts ?? 0) + 1
    // 冷却表只增不删：达到 maxTransientAttempts 后 isInCooldown 永远命中，成功路径也不再有机会
    // 删除，长时间浏览大量视频会无界增长。按最早登记顺序淘汰，被淘汰的键回到可重试状态，
    // 与负缓存的有界淘汰同一策略。
    if (!prev && cooldownMap.size >= maxCooldownEntries) {
      const oldest = cooldownMap.keys().next().value
      if (oldest !== undefined) cooldownMap.delete(oldest)
    }
    cooldownMap.set(versionKey, { attempts, nextRetryAt: now() + cooldownMs })
  }

  function isInCooldown(versionKey: string): boolean {
    const entry = cooldownMap.get(versionKey)
    if (!entry) return false
    if (entry.attempts >= maxTransientAttempts) return true
    return now() < entry.nextRetryAt
  }

  function rememberPendingBlob(pendingToken: string, blob: Blob) {
    if (!pendingToken) return
    const existing = pendingBlobs.get(pendingToken)
    if (existing) {
      totalPendingBytes -= existing.bytes
      pendingBlobs.delete(pendingToken)
    }
    const bytes = blob.size || 0
    if (bytes > maxPendingBytes) return
    while (pendingBlobs.size >= maxPendingEntries || totalPendingBytes + bytes > maxPendingBytes) {
      const oldestKey = pendingBlobs.keys().next().value
      if (oldestKey === undefined) break
      const oldest = pendingBlobs.get(oldestKey)
      pendingBlobs.delete(oldestKey)
      if (oldest) totalPendingBytes -= oldest.bytes
    }
    pendingBlobs.set(pendingToken, { blob, bytes })
    totalPendingBytes += bytes
  }

  function getPendingBlob(pendingToken: string | null | undefined): Blob | null {
    if (!pendingToken) return null
    return pendingBlobs.get(pendingToken)?.blob ?? null
  }

  function clearPendingBlobs(tokens?: Iterable<string>) {
    if (!tokens) {
      pendingBlobs.clear()
      totalPendingBytes = 0
      return
    }
    for (const token of tokens) {
      const entry = pendingBlobs.get(token)
      if (entry) {
        totalPendingBytes -= entry.bytes
        pendingBlobs.delete(token)
      }
    }
  }

  function getInFlightBlob(sourceId: string | null | undefined): Blob | null {
    if (!sourceId) return null
    return inFlightUploads.get(sourceId)?.blob ?? null
  }

  function pumpUploads() {
    while (activeUploads < maxUploadConcurrency && uploadQueue.length > 0) {
      const job = uploadQueue.shift()!
      activeUploads++
      void runUploadJob(job).finally(() => {
        activeUploads--
        pumpUploads()
      })
    }
  }

  async function runUploadJob(job: UploadJob) {
    let timer: ReturnType<typeof setTimeout> | null = null
    try {
      await Promise.race([
        job.uploader(job.thumbnailUrl, job.blob),
        new Promise<void>((_, reject) => {
          timer = setTimeout(() => reject(new Error('thumbnail upload timeout')), uploadTimeoutMs)
        })
      ])
    } catch {
      // 缩略图回填属于尽力而为的缓存预热，失败静默吞掉。
    } finally {
      if (timer !== null) clearTimeout(timer)
      inFlightUploads.delete(job.sourceId)
      job.resolve()
    }
  }

  function uploadThumbnail(
    sourceId: string,
    thumbnailUrl: string,
    blob: Blob,
    uploader: ThumbnailUploader
  ): Promise<void> {
    const existing = inFlightUploads.get(sourceId)
    if (existing) return existing.promise
    let resolvePromise!: () => void
    const promise = new Promise<void>(resolve => {
      resolvePromise = resolve
    })
    inFlightUploads.set(sourceId, { blob, promise })
    uploadQueue.push({ sourceId, thumbnailUrl, blob, uploader, resolve: resolvePromise })
    pumpUploads()
    return promise
  }

  /**
   * 导入落库成功后、store.upsertResource 之前同步调用：
   * 若 AddDialog 已为该 pendingToken 捕获了缩略图，立即移交到 inFlightUploads 并启动后台上传，
   * 主列表随后挂载时直接命中本地 Blob，避免第二次解码。
   */
  function handoffPendingThumbnail(
    pendingToken: string | null | undefined,
    sourceId: string | null | undefined,
    thumbnailUrl: string | null | undefined,
    uploader: ThumbnailUploader
  ): boolean {
    if (!pendingToken || !sourceId) return false
    const entry = pendingBlobs.get(pendingToken)
    if (!entry) return false
    pendingBlobs.delete(pendingToken)
    totalPendingBytes -= entry.bytes
    if (thumbnailUrl) {
      void uploadThumbnail(sourceId, thumbnailUrl, entry.blob, uploader)
    }
    return true
  }

  function finishTask(task: CaptureTask, blob: Blob | null) {
    if (blob && task.pendingTokens.size > 0) {
      for (const token of task.pendingTokens) {
        rememberPendingBlob(token, blob)
      }
    }
    tasksByKey.delete(task.versionKey)
    const subscribers = [...task.subscribers]
    task.subscribers.clear()
    for (const sub of subscribers) {
      sub.cleanup()
      sub.resolve(blob)
    }
  }

  function removeQueuedTask(task: CaptureTask) {
    const idx = pendingQueue.indexOf(task)
    if (idx >= 0) pendingQueue.splice(idx, 1)
    tasksByKey.delete(task.versionKey)
  }

  function taskPriority(task: CaptureTask): number {
    let best = Number.POSITIVE_INFINITY
    let hasCustom = false
    for (const sub of task.subscribers) {
      if (!sub.getPriority) continue
      hasCustom = true
      const value = sub.getPriority()
      if (Number.isFinite(value) && value < best) best = value
    }
    return hasCustom && Number.isFinite(best) ? best : 0
  }

  function detachSubscriber(task: CaptureTask, sub: CaptureSubscriber) {
    if (!task.subscribers.delete(sub)) return
    sub.cleanup()
    sub.resolve(null)
    if (task.subscribers.size === 0) {
      const worker = findWorkerForTask(task)
      if (worker) {
        worker.abortActiveDecode?.()
      } else {
        removeQueuedTask(task)
      }
    }
  }

  function pumpDecode() {
    while (pendingQueue.length > 0) {
      const worker = findIdleWorker()
      if (!worker) return
      for (let i = pendingQueue.length - 1; i >= 0; i--) {
        const candidate = pendingQueue[i]!
        if (candidate.subscribers.size === 0) {
          pendingQueue.splice(i, 1)
          tasksByKey.delete(candidate.versionKey)
        }
      }
      if (pendingQueue.length === 0) return
      let bestIdx = -1
      let bestPriority = Number.POSITIVE_INFINITY
      let bestSeq = Number.POSITIVE_INFINITY
      for (let i = 0; i < pendingQueue.length; i++) {
        const candidate = pendingQueue[i]!
        const priority = taskPriority(candidate)
        if (priority < bestPriority || (priority === bestPriority && candidate.seq < bestSeq)) {
          bestPriority = priority
          bestSeq = candidate.seq
          bestIdx = i
        }
      }
      if (bestIdx < 0) return
      const next = pendingQueue.splice(bestIdx, 1)[0]!
      worker.activeTask = next
      void runDecodeTask(worker, next)
    }
  }

  async function runDecodeTask(worker: DecodeWorker, task: CaptureTask) {
    const runId = ++worker.runId
    const video = ensureVideo(worker)
    const sampleCanvas = ensureSampleCanvas(worker)
    const outputCanvas = ensureOutputCanvas(worker)

    if (!video || !sampleCanvas || !outputCanvas) {
      if (worker.activeTask === task) worker.activeTask = null
      finishTask(task, null)
      pumpDecode()
      return
    }

    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true })
    const outputCtx = outputCanvas.getContext('2d')
    if (!sampleCtx || !outputCtx) {
      if (worker.activeTask === task) worker.activeTask = null
      finishTask(task, null)
      pumpDecode()
      return
    }

    const blob = await new Promise<Blob | null>(resolve => {
      let settled = false
      let frameTimes: number[] = []
      let frameIndex = 0
      let hasFallbackFrame = false
      let awaitingLoadedData = false
      let encoding = false
      let timer: ReturnType<typeof setTimeout> | null = null

      const detachListeners = () => {
        if (timer !== null) {
          clearTimeout(timer)
          timer = null
        }
        video.removeEventListener('loadedmetadata', onLoadedMetadata)
        video.removeEventListener('loadeddata', onLoadedData)
        video.removeEventListener('seeked', onSeeked)
        video.removeEventListener('error', onError)
      }

      const resetVideo = () => {
        // 严格顺序：先解绑所有监听器，再 pause / removeAttribute('src') / load()，
        // 避免 removeAttribute('src') 触发虚假 error 污染状态机或负缓存。
        detachListeners()
        try {
          video.pause()
          video.removeAttribute('src')
          video.load()
        } catch {
          // 测试桩或受限环境可能未实现 load/pause。
        }
      }

      const settle = (result: Blob | null) => {
        if (settled) return
        settled = true
        if (worker.runId === runId) {
          worker.abortActiveDecode = null
        }
        resetVideo()
        resolve(result)
      }

      const isStale = () => settled || runId !== worker.runId || task.subscribers.size === 0

      const drawToOutputCanvas = () => {
        const vw = video.videoWidth
        const vh = video.videoHeight
        if (!vw || !vh) return false
        const scale = Math.min(1, THUMBNAIL_MAX_EDGE / Math.max(vw, vh))
        outputCanvas.width = Math.max(1, Math.round(vw * scale))
        outputCanvas.height = Math.max(1, Math.round(vh * scale))
        outputCtx.drawImage(video, 0, 0, outputCanvas.width, outputCanvas.height)
        return true
      }

      const encodeAndSettle = () => {
        if (isStale() || encoding) return
        encoding = true
        detachListeners()
        void canvasToJpegBlob(outputCanvas, THUMBNAIL_JPEG_QUALITY).then(encoded => {
          if (settled || runId !== worker.runId || task.subscribers.size === 0) {
            settle(null)
            return
          }
          if (!encoded) recordTransientFailure(task.versionKey)
          else cooldownMap.delete(task.versionKey)
          settle(encoded)
        })
      }

      const evaluateCurrentFrame = () => {
        if (isStale() || encoding) return
        if (!video.videoWidth || !video.videoHeight) {
          recordNegative(task.versionKey)
          settle(null)
          return
        }
        try {
          sampleCtx.clearRect(0, 0, SAMPLE_CANVAS_EDGE, SAMPLE_CANVAS_EDGE)
          sampleCtx.drawImage(video, 0, 0, SAMPLE_CANVAS_EDGE, SAMPLE_CANVAS_EDGE)
          const black = isBlackFrame(sampleCtx.getImageData(0, 0, SAMPLE_CANVAS_EDGE, SAMPLE_CANVAS_EDGE).data)
          if (!hasFallbackFrame) {
            hasFallbackFrame = drawToOutputCanvas()
          }
          if (!black) {
            if (drawToOutputCanvas()) {
              encodeAndSettle()
              return
            }
          }
          frameIndex++
          seekNextCandidate()
        } catch {
          // 跨域画布污染或绘制异常视为确定性失败。
          recordNegative(task.versionKey)
          settle(null)
        }
      }

      const seekNextCandidate = () => {
        if (isStale() || encoding) return
        if (frameIndex >= frameTimes.length) {
          if (hasFallbackFrame) {
            encodeAndSettle()
          } else {
            recordNegative(task.versionKey)
            settle(null)
          }
          return
        }
        const targetTime = frameTimes[frameIndex]!
        if (Math.abs(targetTime - video.currentTime) < 0.01) {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            evaluateCurrentFrame()
          } else {
            awaitingLoadedData = true
          }
          return
        }
        awaitingLoadedData = false
        try {
          video.currentTime = targetTime
        } catch {
          frameIndex++
          seekNextCandidate()
        }
      }

      const onLoadedMetadata = () => {
        if (isStale() || encoding) return
        frameTimes = videoFrameCandidates(video.duration)
        frameIndex = 0
        seekNextCandidate()
      }

      const onLoadedData = () => {
        if (isStale() || encoding) return
        if (awaitingLoadedData) {
          awaitingLoadedData = false
          evaluateCurrentFrame()
          return
        }
        if (frameTimes.length === 0) {
          frameTimes = videoFrameCandidates(video.duration)
          frameIndex = 0
          seekNextCandidate()
        }
      }

      const onSeeked = () => {
        if (isStale() || encoding) return
        evaluateCurrentFrame()
      }

      const onError = () => {
        if (isStale() || encoding) return
        const code = video.error?.code
        if (code === MEDIA_ERR_DECODE || code === MEDIA_ERR_SRC_NOT_SUPPORTED) {
          recordNegative(task.versionKey)
        } else {
          recordTransientFailure(task.versionKey)
        }
        settle(null)
      }

      worker.abortActiveDecode = () => {
        // 主动取消（订阅者全部退出）绝不写入负缓存或冷却表。
        settle(null)
      }

      timer = setTimeout(() => {
        if (isStale() || encoding) return
        if (hasFallbackFrame) {
          encodeAndSettle()
        } else {
          recordTransientFailure(task.versionKey)
          settle(null)
        }
      }, decodeTimeoutMs)

      video.addEventListener('loadedmetadata', onLoadedMetadata)
      video.addEventListener('loadeddata', onLoadedData)
      video.addEventListener('seeked', onSeeked)
      video.addEventListener('error', onError)

      if (isCrossOriginMediaUrl(task.mediaUrl)) {
        video.crossOrigin = 'anonymous'
      } else {
        video.removeAttribute('crossorigin')
      }
      video.src = task.mediaUrl
      try {
        video.load()
      } catch {
        // 部分测试桩不需要显式调用 load。
      }
    })

    if (worker.activeTask === task) {
      worker.activeTask = null
    }
    finishTask(task, blob)
    pumpDecode()
  }

  function capture(request: VideoCaptureRequest): Promise<Blob | null> {
    if (!request.mediaUrl || request.signal?.aborted) {
      return Promise.resolve(null)
    }
    const versionKey = `${request.key}:${request.location}`
    if (negativeCache.has(versionKey) || isInCooldown(versionKey)) {
      return Promise.resolve(null)
    }

    return new Promise<Blob | null>(resolve => {
      let task = tasksByKey.get(versionKey)
      if (!task) {
        task = {
          versionKey,
          mediaUrl: request.mediaUrl,
          seq: nextSeq++,
          pendingTokens: new Set(),
          subscribers: new Set()
        }
        tasksByKey.set(versionKey, task)
        pendingQueue.push(task)
      }

      if (request.pendingToken) {
        task.pendingTokens.add(request.pendingToken)
      }

      const signal = request.signal ?? null
      const sub: CaptureSubscriber = {
        resolve,
        signal,
        getPriority: request.getPriority ?? null,
        cleanup: () => {}
      }
      if (signal) {
        const onAbort = () => detachSubscriber(task!, sub)
        signal.addEventListener('abort', onAbort, { once: true })
        sub.cleanup = () => signal.removeEventListener('abort', onAbort)
      }
      task.subscribers.add(sub)
      pumpDecode()
    })
  }

  function reset() {
    for (const worker of decodeWorkers) {
      worker.abortActiveDecode?.()
      worker.runId++
      worker.activeTask = null
      worker.abortActiveDecode = null
      worker.videoEl = null
      worker.sampleCanvasEl = null
      worker.outputCanvasEl = null
    }
    for (const task of pendingQueue.splice(0)) {
      finishTask(task, null)
    }
    nextSeq = 0
    tasksByKey.clear()
    negativeCache.clear()
    cooldownMap.clear()
    pendingBlobs.clear()
    totalPendingBytes = 0
    inFlightUploads.clear()
    for (const job of uploadQueue.splice(0)) {
      job.resolve()
    }
    activeUploads = 0
  }

  return {
    capture,
    uploadThumbnail,
    getInFlightBlob,
    rememberPendingBlob,
    getPendingBlob,
    clearPendingBlobs,
    handoffPendingThumbnail,
    reset
  }
}

export type VideoThumbnailCoordinator = ReturnType<typeof createVideoThumbnailCoordinator>

export const videoThumbnailCoordinator = createVideoThumbnailCoordinator()
