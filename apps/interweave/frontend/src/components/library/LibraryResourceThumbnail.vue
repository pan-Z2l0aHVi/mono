<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import type { ResourceKind, ResourceSourceView } from '@/stores/library'

import { resourceIcon, resourceKindClass } from './presentation'
import { isBlackFrame, videoFrameCandidates } from './thumbnail'

const props = defineProps<{
  kind: ResourceKind
  source: ResourceSourceView | null
  mediaUrl: string | null
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const thumbnailURL = ref('')
const imageReady = ref(false)
const mediaFailed = ref(false)
let frameTimes: number[] = []
let frameIndex = 0
let mediaVersion = 0

const canRenderMedia = computed(
  () =>
    Boolean(props.mediaUrl) &&
    props.source?.type === 'file' &&
    props.source.available &&
    (props.kind === 'image' || props.kind === 'video')
)

watch(
  () => [props.kind, props.source?.id, props.mediaUrl] as const,
  () => {
    mediaVersion++
    thumbnailURL.value = ''
    imageReady.value = false
    mediaFailed.value = false
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

function handleImageLoad() {
  imageReady.value = true
  mediaFailed.value = false
}

function handleMediaError() {
  mediaFailed.value = true
  imageReady.value = false
  thumbnailURL.value = ''
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
    const scale = Math.min(1, 240 / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (isBlackFrame(context.getImageData(0, 0, canvas.width, canvas.height).data)) {
      frameIndex++
      captureCandidate(video, version)
      return
    }
    thumbnailURL.value = canvas.toDataURL('image/jpeg', 0.82)
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
      v-if="kind === 'video' && canRenderMedia"
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
      v-if="kind === 'image' && canRenderMedia && !mediaFailed"
      :src="mediaUrl ?? undefined"
      class="size-full object-cover"
      alt=""
      @load="handleImageLoad"
      @error="handleMediaError"
    />
    <img v-if="thumbnailURL" :src="thumbnailURL" class="size-full object-cover" alt="" />
    <web-ui-icon
      v-if="!thumbnailURL && (mediaFailed || !imageReady)"
      :icon="resourceIcon(kind)"
      :size="20"
      :class="mediaFailed ? 'opacity-60' : ''"
    />
  </div>
</template>
