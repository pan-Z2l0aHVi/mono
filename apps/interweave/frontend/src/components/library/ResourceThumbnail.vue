<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import type { ResourceKind, ResourceSourceView } from '@/stores/library'

import { resourceIcon, resourceKindClass } from './presentation'
import { THUMBNAIL_JPEG_QUALITY, THUMBNAIL_MAX_EDGE, isBlackFrame, videoFrameCandidates } from './thumbnail'

const props = defineProps<{
  kind: ResourceKind
  source: ResourceSourceView | null
  mediaUrl: string | null
  /**
   * 服务端派生缩略图的地址。有值时优先展示它：列表不再加载原图/视频本体。
   * 404（格式 Go 侧解不了或尚未生成）走 error 回退到原图/视频捕获路径，并由
   * saveThumbnail 把捕获结果回填，后续挂载即可命中缩略图。
   */
  thumbnailUrl?: string | null
  /** 捕获成功后的回填回调；缺省表示本表面不回填（添加 dialog 的队列项还没有 Source 身份）。 */
  saveThumbnail?: ((dataUrl: string) => void) | null
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const thumbnailURL = ref('')
const imageReady = ref(false)
const mediaFailed = ref(false)
const serverThumbFailed = ref(false)
const serverThumbReady = ref(false)
let frameTimes: number[] = []
let frameIndex = 0
let mediaVersion = 0
// 每个 media 身份只回填一次：行被虚拟列表回收重挂是常态，不设防会反复上传同一帧。
let thumbnailSavedFor = ''

const canRenderMedia = computed(
  () =>
    Boolean(props.mediaUrl) &&
    props.source?.type === 'file' &&
    props.source.available &&
    (props.kind === 'image' || props.kind === 'video')
)
// 缩略图与原图共用可用性语义；视频命中缩略图时连 <video> 都不再加载，这是列表滚动的最大收益。
const serverThumbActive = computed(
  () =>
    Boolean(props.thumbnailUrl) &&
    !serverThumbFailed.value &&
    props.source?.type === 'file' &&
    props.source.available &&
    (props.kind === 'image' || props.kind === 'video')
)
const showFallback = computed(() => {
  if (serverThumbReady.value) return false
  const imageMatchesSource = imageRef.value?.getAttribute('src') === props.mediaUrl
  // reset 清空 imageReady 后，src 未变且已 complete 的 img 不会再触发 load，需保留此逃生通道避免 fallback 叠加。
  return (
    !thumbnailURL.value &&
    (mediaFailed.value || (!imageReady.value && !(imageMatchesSource && imageRef.value?.complete)))
  )
})

watch(
  () => [props.kind, props.source?.id, props.mediaUrl] as const,
  (next, previous) => {
    /*
     * 调用方可能在每次父组件渲染时新建 source 对象（AddDialog 的 queueSource），props.source
     * 的身份变化会触发本 watch，但三个字段都没变。这种「仅身份变化」不能走重置：重置会清掉
     * 已捕获的视频帧，并卸掉 video 的 src——mediaUrl 没变时 Vue 不会把属性写回，随后的
     * load() 只会对空 src 报错，缩略图从此停在 fallback 上（表现即「编辑名称后图片消失」）。
     */
    if (previous && next[0] === previous[0] && next[1] === previous[1] && next[2] === previous[2]) return
    mediaVersion++
    thumbnailURL.value = ''
    imageReady.value = false
    mediaFailed.value = false
    serverThumbFailed.value = false
    serverThumbReady.value = false
    thumbnailSavedFor = ''
    frameTimes = []
    frameIndex = 0
    const video = videoRef.value
    if (video) {
      video.pause()
      video.removeAttribute('src')
    }
    void nextTick(() => {
      if (props.kind === 'video' && canRenderMedia.value) {
        videoRef.value?.load()
      }
    })
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  mediaVersion++
  videoRef.value?.pause()
})

function handleServerThumbLoad() {
  serverThumbReady.value = true
}

function handleServerThumbError() {
  // 缩略图缺席（未生成 / Go 解不了的格式 / 文件暂不可读）不是错误状态：
  // 回退到原图或视频捕获路径，捕获成功后由 saveThumbnail 回填补上缓存。
  serverThumbFailed.value = true
  serverThumbReady.value = false
}

function handleImageLoad() {
  imageReady.value = true
  mediaFailed.value = false
  captureAndSave(imageRef.value)
}

function handleMediaError() {
  mediaFailed.value = true
  imageReady.value = false
  thumbnailURL.value = ''
}

/**
 * 把已展示的媒体截成缩略图并交给回填回调。画布缺席（jsdom）或绘制被安全策略拦截时
 * 静默放弃：展示不受影响，回填本来就是尽力而为。
 */
function captureAndSave(element: HTMLImageElement | null) {
  if (!props.saveThumbnail || !element || !element.naturalWidth || !element.naturalHeight) return
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return
  try {
    const scale = Math.min(1, THUMBNAIL_MAX_EDGE / Math.max(element.naturalWidth, element.naturalHeight))
    canvas.width = Math.max(1, Math.round(element.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(element.naturalHeight * scale))
    context.drawImage(element, 0, 0, canvas.width, canvas.height)
    maybeSaveThumbnail(canvas.toDataURL('image/jpeg', THUMBNAIL_JPEG_QUALITY))
  } catch {
    // 画布污染（跨域媒体）只影响回填，不影响显示。
  }
}

function maybeSaveThumbnail(dataUrl: string) {
  if (!props.saveThumbnail) return
  const identity = `${props.kind}:${props.source?.id ?? ''}:${props.mediaUrl ?? ''}`
  if (thumbnailSavedFor === identity) return
  thumbnailSavedFor = identity
  props.saveThumbnail(dataUrl)
}

function handleLoadedMetadata(event: Event) {
  const video = event.currentTarget as HTMLVideoElement
  frameTimes = videoFrameCandidates(video.duration)
  frameIndex = 0
  captureCandidate(video, mediaVersion)
}

function handleLoadedData(event: Event) {
  const video = event.currentTarget as HTMLVideoElement
  if (!frameTimes.length) return
  captureCandidate(video, mediaVersion)
}

function captureCandidate(video: HTMLVideoElement, version: number) {
  if (version !== mediaVersion || frameIndex >= frameTimes.length) {
    if (version === mediaVersion) handleMediaError()
    return
  }
  const targetTime = frameTimes[frameIndex]
  if (Math.abs(video.currentTime - targetTime) < 0.001 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    captureCurrentFrame(video, version)
    return
  }
  video.currentTime = targetTime
}

function handleSeeked(event: Event) {
  const video = event.currentTarget as HTMLVideoElement
  captureCurrentFrame(video, mediaVersion)
}

function captureCurrentFrame(video: HTMLVideoElement, version: number) {
  if (version !== mediaVersion || !video.videoWidth || !video.videoHeight) {
    handleMediaError()
    return
  }
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d', { willReadFrequently: true })
  if (!canvas || !context) {
    handleMediaError()
    return
  }

  try {
    const scale = Math.min(1, THUMBNAIL_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (isBlackFrame(context.getImageData(0, 0, canvas.width, canvas.height).data)) {
      frameIndex++
      captureCandidate(video, version)
      return
    }
    thumbnailURL.value = canvas.toDataURL('image/jpeg', THUMBNAIL_JPEG_QUALITY)
    // 帧已捕获：顺手回填给后端持久化，后续列表滚动直接读缩略图，不再加载视频本体。
    maybeSaveThumbnail(thumbnailURL.value)
  } catch {
    handleMediaError()
  }
}
</script>

<template>
  <div
    class="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg"
    :class="resourceKindClass(kind)"
  >
    <video
      v-if="kind === 'video' && !serverThumbActive && canRenderMedia"
      ref="videoRef"
      :src="mediaUrl ?? undefined"
      class="pointer-events-none absolute size-px opacity-0"
      preload="metadata"
      muted
      aria-hidden="true"
      @loadedmetadata="handleLoadedMetadata"
      @loadeddata="handleLoadedData"
      @seeked="handleSeeked"
      @error="handleMediaError"
    ></video>
    <canvas ref="canvasRef" class="pointer-events-none absolute size-px opacity-0" aria-hidden="true"></canvas>
    <img
      v-if="serverThumbActive"
      :src="thumbnailUrl ?? undefined"
      class="size-full object-cover"
      alt=""
      @load="handleServerThumbLoad"
      @error="handleServerThumbError"
    />
    <img
      v-if="kind === 'image' && !serverThumbActive && canRenderMedia && !mediaFailed"
      ref="imageRef"
      :src="mediaUrl ?? undefined"
      class="size-full object-cover"
      alt=""
      @load="handleImageLoad"
      @error="handleMediaError"
    />
    <img v-if="thumbnailURL" :src="thumbnailURL" class="size-full object-cover" alt="" />
    <web-ui-icon v-if="showFallback" :icon="resourceIcon(kind)" :size="20" :class="mediaFailed ? 'opacity-60' : ''" />
  </div>
</template>
