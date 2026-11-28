<script setup lang="ts">
import { lucideTriangleAlert } from '@greypan/web-ui/icons'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import type { ResourceKind, ResourceSourceView } from '@/stores/library'

import { resourceIcon, resourceKindClass, unavailableResourceIcon } from './presentation'
import { THUMBNAIL_JPEG_QUALITY, THUMBNAIL_MAX_EDGE, isCrossOriginMediaUrl } from './thumbnail'
import { canvasToJpegBlob, videoThumbnailCoordinator, type ThumbnailPayload } from './videoThumbnailQueue'

const DEFAULT_VIDEO_DWELL_MS = 120

const props = defineProps<{
  kind: ResourceKind
  detail?: boolean
  unavailable?: boolean
  source: ResourceSourceView | null
  mediaUrl: string | null
  /**
   * 服务端派生缩略图的地址。有值时优先展示它：列表不再加载原图/视频本体。
   * 404（格式 Go 侧解不了或尚未生成）走 error 回退到原图/视频捕获路径，并由
   * saveThumbnail 把捕获结果回填，后续挂载即可命中缩略图。
   */
  thumbnailUrl?: string | null
  /** 捕获成功后的回填回调；缺省表示本表面不回填（添加 dialog 的队列项还没有 Source 身份）。 */
  saveThumbnail?: ((payload: ThumbnailPayload) => void) | null
  /** 添加弹窗的待导入预览令牌；有值时捕获结果会同步写入 pendingBlobs 供导入落库交接。 */
  pendingToken?: string | null
  /** 外层作用域取消信号（如弹窗关闭或开始提交时批量中断未完成的视频捕获）。 */
  captureScope?: AbortSignal | null
  /** 视频捕获前的视口停留防抖时长（毫秒），默认 120ms。 */
  dwellMs?: number
}>()

const rootRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const thumbnailURL = ref('')
const faviconReady = ref(false)
const faviconFailed = ref(false)
const favicon = computed(() => (props.source?.type === 'url' ? props.source.metadata?.faviconUrl || '' : ''))
watch(favicon, () => {
  faviconReady.value = false
  faviconFailed.value = false
})
const imageReady = ref(false)
const mediaFailed = ref(false)
const serverThumbFailed = ref(false)
const serverThumbReady = ref(false)
const mediaKey = ref(0)

let mediaVersion = 0
let unmounted = false
// 每个 media 身份只回填一次：行被虚拟列表回收重挂是常态，不设防会反复上传同一帧。
let thumbnailSavedFor = ''
let activeObjectUrl: string | null = null
let dwellTimer: ReturnType<typeof setTimeout> | null = null
let captureAbortController: AbortController | null = null
let detachScopeAbort: (() => void) | null = null

const canRenderMedia = computed(() => {
  if (!displayMediaUrl.value) return false
  if (props.source?.type === 'url') {
    // 直链图片/视频 URL：展示层分别归为 image / video，缩略图直接尝试读取原始链接。
    // 探测失败也尝试：available 只反映上次抓取，不代表链接此刻不可达；加载失败走 error 回退。
    return props.kind === 'image' || props.kind === 'video'
  }
  return props.source?.type === 'file' && props.source.available && (props.kind === 'image' || props.kind === 'video')
})
// URL 图片的 mediaUrl prop 为空（后端 media_url 只服务 file 来源），兜底用原始链接。
const displayMediaUrl = computed(() => {
  if (props.mediaUrl) return props.mediaUrl
  return props.source?.type === 'url' && (props.kind === 'image' || props.kind === 'video') && props.source.location
    ? props.source.location
    : null
})
// 失效来源仍可读取已有缩略图缓存；原文件只能在来源可用时读取。
// 若已有本地捕获/在途上传的 thumbnailURL，优先展示本地 Blob，避免重复请求服务端缩略图。
const serverThumbActive = computed(
  () =>
    !thumbnailURL.value &&
    Boolean(props.thumbnailUrl) &&
    !serverThumbFailed.value &&
    props.source?.type === 'file' &&
    (props.kind === 'image' || props.kind === 'video')
)
const serverThumbCrossOrigin = computed(() => (isCrossOriginMediaUrl(props.thumbnailUrl) ? 'anonymous' : undefined))
const imageCrossOrigin = computed(() => (isCrossOriginMediaUrl(displayMediaUrl.value) ? 'anonymous' : undefined))

const showFallback = computed(() => {
  if (favicon.value && faviconReady.value && !faviconFailed.value) return false
  if (serverThumbActive.value && serverThumbReady.value) return false
  if (thumbnailURL.value) return false
  if (!canRenderMedia.value) return true
  const imageMatchesSource = imageRef.value?.getAttribute('src') === displayMediaUrl.value
  // reset 清空 imageReady 后，src 未变且已 complete 的 img 不会再触发 load，需保留此逃生通道避免 fallback 叠加。
  return mediaFailed.value || (!imageReady.value && !(imageMatchesSource && imageRef.value?.complete))
})

function revokeObjectUrl() {
  if (!activeObjectUrl) return
  try {
    URL.revokeObjectURL(activeObjectUrl)
  } catch {
    // 忽略受限测试环境下的异常。
  }
  activeObjectUrl = null
}

function setBlobThumbnail(blob: Blob) {
  revokeObjectUrl()
  activeObjectUrl = URL.createObjectURL(blob)
  thumbnailURL.value = activeObjectUrl
}

function cancelPendingCapture() {
  if (dwellTimer !== null) {
    clearTimeout(dwellTimer)
    dwellTimer = null
  }
  if (detachScopeAbort) {
    detachScopeAbort()
    detachScopeAbort = null
  }
  if (captureAbortController) {
    captureAbortController.abort()
    captureAbortController = null
  }
}

function computeViewportPriority(): number {
  if (typeof window === 'undefined' || !rootRef.value) return 0
  const rect = rootRef.value.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.bottom === 0) return 0
  const scrollport = rootRef.value.closest<HTMLElement>('[data-overlayscrollbars-viewport], [data-virtual-scrollport]')
  const containerRect = scrollport?.getBoundingClientRect()
  const topBound = containerRect && containerRect.height > 0 ? containerRect.top : 0
  const bottomBound = containerRect && containerRect.height > 0 ? containerRect.bottom : window.innerHeight || 0
  if (bottomBound > topBound && rect.bottom > topBound && rect.top < bottomBound) {
    return Math.max(0, rect.top - topBound)
  }
  const distance = rect.top >= bottomBound ? rect.top - bottomBound : Math.max(0, topBound - rect.bottom)
  return 1_000_000 + distance
}

function lookupCachedVideoBlob(): Blob | null {
  if (props.kind !== 'video') return null
  return (
    videoThumbnailCoordinator.getInFlightBlob(props.source?.id) ??
    videoThumbnailCoordinator.getPendingBlob(props.pendingToken)
  )
}

function startVideoCapture(version: number) {
  if (unmounted || version !== mediaVersion) return
  if (props.kind !== 'video' || !canRenderMedia.value || !displayMediaUrl.value) return
  if (props.captureScope?.aborted) return

  const cached = lookupCachedVideoBlob()
  if (cached) {
    setBlobThumbnail(cached)
    mediaFailed.value = false
    return
  }

  const controller = new AbortController()
  captureAbortController = controller
  if (props.captureScope) {
    const scope = props.captureScope
    const onScopeAbort = () => controller.abort()
    scope.addEventListener('abort', onScopeAbort, { once: true })
    detachScopeAbort = () => scope.removeEventListener('abort', onScopeAbort)
  }

  const mediaUrl = displayMediaUrl.value
  const key = props.pendingToken || props.source?.id || mediaUrl
  const location = props.source?.location ?? mediaUrl

  void videoThumbnailCoordinator
    .capture({
      key,
      location,
      mediaUrl,
      pendingToken: props.pendingToken,
      signal: controller.signal,
      getPriority: computeViewportPriority
    })
    .then(blob => {
      if (unmounted || version !== mediaVersion || controller.signal.aborted) return
      if (blob) {
        setBlobThumbnail(blob)
        mediaFailed.value = false
        maybeSaveThumbnail(blob)
      } else {
        mediaFailed.value = true
      }
    })
}

function scheduleVideoCapture(version: number) {
  cancelPendingCapture()
  if (unmounted || version !== mediaVersion) return
  if (props.kind !== 'video' || !canRenderMedia.value || !displayMediaUrl.value) return
  if (props.captureScope?.aborted) return

  const cached = lookupCachedVideoBlob()
  if (cached) {
    setBlobThumbnail(cached)
    mediaFailed.value = false
    return
  }

  const delay = props.dwellMs ?? DEFAULT_VIDEO_DWELL_MS
  if (delay <= 0) {
    startVideoCapture(version)
    return
  }
  dwellTimer = setTimeout(() => {
    dwellTimer = null
    startVideoCapture(version)
  }, delay)
}

watch(
  () =>
    [
      props.kind,
      props.source?.id,
      props.source?.location,
      props.mediaUrl,
      props.source?.available,
      props.thumbnailUrl,
      props.pendingToken
    ] as const,
  (next, previous) => {
    /*
     * 调用方可能在每次父组件渲染时新建 source 对象（AddDialog 的 queueSource），props.source
     * 的身份变化会触发本 watch，但关键字段都没变。这种「仅身份变化」不能走重置：重置会清掉
     * 已捕获的视频帧并重建媒体元素，缩略图会闪回 fallback。
     *
     * location 也参与判定：ReplaceSource 会保留 source id，只换 location；mediaUrl 不变，
     * 但旧元素不会自行重新拉取，必须靠 mediaKey 重建才能显示替换后的文件。
     */
    if (
      previous &&
      next[0] === previous[0] &&
      next[1] === previous[1] &&
      next[2] === previous[2] &&
      next[3] === previous[3] &&
      next[4] === previous[4] &&
      next[5] === previous[5] &&
      next[6] === previous[6]
    ) {
      return
    }
    mediaVersion++
    cancelPendingCapture()
    revokeObjectUrl()
    // 只有 location / available / thumbnailUrl 变化需要强制重建 <img>。
    if (!previous || next[2] !== previous[2] || next[4] !== previous[4] || next[5] !== previous[5]) mediaKey.value++
    thumbnailURL.value = ''
    imageReady.value = false
    mediaFailed.value = false
    serverThumbFailed.value = false
    serverThumbReady.value = false
    thumbnailSavedFor = ''

    const cached = lookupCachedVideoBlob()
    if (cached) {
      setBlobThumbnail(cached)
      return
    }
    if (props.kind === 'video' && canRenderMedia.value && !serverThumbActive.value) {
      scheduleVideoCapture(mediaVersion)
    }
  },
  { immediate: true }
)

watch(
  () => props.captureScope,
  scope => {
    if (scope?.aborted) {
      cancelPendingCapture()
    }
  }
)

onBeforeUnmount(() => {
  unmounted = true
  mediaVersion++
  cancelPendingCapture()
  revokeObjectUrl()
})

function handleServerThumbLoad() {
  serverThumbReady.value = true
}

function handleServerThumbError() {
  // 缩略图缺席（未生成 / Go 解不了的格式 / 文件暂不可读）不是错误状态：
  // 回退到原图或视频捕获路径，捕获成功后由 saveThumbnail 回填补上缓存。
  serverThumbFailed.value = true
  serverThumbReady.value = false
  if (props.kind === 'video' && canRenderMedia.value) {
    scheduleVideoCapture(mediaVersion)
  }
}

function handleImageLoad() {
  imageReady.value = true
  mediaFailed.value = false
  captureAndSave(imageRef.value)
}

function handleMediaError() {
  mediaFailed.value = true
  imageReady.value = false
  revokeObjectUrl()
  thumbnailURL.value = ''
}

/**
 * 把已展示的媒体截成缩略图并交给回填回调。画布缺席（jsdom）或绘制被安全策略拦截时
 * 静默放弃：展示不受影响，回填本来就是尽力而为。
 */
function captureAndSave(element: HTMLImageElement | null) {
  if (!props.saveThumbnail || !element || !element.naturalWidth || !element.naturalHeight) return
  if (typeof document === 'undefined') return
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return
  const version = mediaVersion
  try {
    const scale = Math.min(1, THUMBNAIL_MAX_EDGE / Math.max(element.naturalWidth, element.naturalHeight))
    canvas.width = Math.max(1, Math.round(element.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(element.naturalHeight * scale))
    context.drawImage(element, 0, 0, canvas.width, canvas.height)
    void canvasToJpegBlob(canvas, THUMBNAIL_JPEG_QUALITY).then(blob => {
      if (unmounted || version !== mediaVersion || !blob) return
      maybeSaveThumbnail(blob)
    })
  } catch {
    // 画布污染（跨域媒体）只影响回填，不影响显示。
  }
}

function maybeSaveThumbnail(payload: ThumbnailPayload) {
  if (!props.saveThumbnail) return
  const identity = `${props.kind}:${props.source?.id ?? ''}:${props.source?.location ?? ''}:${props.mediaUrl ?? ''}`
  if (thumbnailSavedFor === identity) return
  thumbnailSavedFor = identity
  props.saveThumbnail(payload)
}
</script>

<template>
  <div ref="rootRef" class="relative size-10 shrink-0 rounded-[10px]">
    <div
      class="grid size-full place-items-center overflow-hidden rounded-[inherit]"
      :class="[resourceKindClass(kind), unavailable && !detail ? 'opacity-60' : '']"
    >
      <img
        v-if="favicon && !faviconFailed"
        :src="favicon"
        referrerpolicy="no-referrer"
        class="absolute size-5 object-contain [-webkit-user-drag:none]"
        alt=""
        draggable="false"
        @load="faviconReady = true"
        @error="faviconFailed = true"
      />
      <img
        v-if="serverThumbActive"
        v-show="serverThumbReady"
        :key="`server-thumb-${mediaKey}`"
        :src="thumbnailUrl ?? undefined"
        :crossorigin="serverThumbCrossOrigin"
        class="size-full object-cover [-webkit-user-drag:none]"
        alt=""
        draggable="false"
        @load="handleServerThumbLoad"
        @error="handleServerThumbError"
      />
      <img
        v-if="kind === 'image' && !serverThumbActive && canRenderMedia && !mediaFailed"
        :key="`image-${mediaKey}`"
        ref="imageRef"
        :src="displayMediaUrl ?? undefined"
        :crossorigin="imageCrossOrigin"
        referrerpolicy="no-referrer"
        class="size-full object-cover [-webkit-user-drag:none]"
        alt=""
        draggable="false"
        loading="lazy"
        decoding="async"
        @load="handleImageLoad"
        @error="handleMediaError"
      />
      <img
        v-if="thumbnailURL"
        :src="thumbnailURL"
        class="size-full object-cover [-webkit-user-drag:none]"
        alt=""
        draggable="false"
      />
      <web-ui-icon
        v-if="showFallback"
        :icon="detail && unavailable ? unavailableResourceIcon(kind, source) : resourceIcon(kind)"
        :size="detail ? 32 : 20"
        :class="mediaFailed ? 'opacity-60' : ''"
      />
    </div>
    <span
      v-if="unavailable"
      data-unavailable-badge
      class="pointer-events-none absolute flex items-center justify-center rounded-full bg-orange-100/95 text-orange-600 shadow-[0_1px_3px_rgb(0_0_0/0.14)] backdrop-blur-xs dark:bg-orange-950/90 dark:text-orange-400"
      :class="detail ? 'bottom-1.5 left-1.5 size-6' : 'bottom-[3px] left-[3px] size-4'"
    >
      <web-ui-icon :icon="lucideTriangleAlert" :size="detail ? 14 : 11" class="block" />
    </span>
  </div>
</template>
