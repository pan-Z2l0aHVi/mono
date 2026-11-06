<script setup lang="ts">
import { computed, ref } from 'vue'

defineProps<{ src: string; alt: string }>()
const emit = defineEmits<{ error: [] }>()
const stage = ref<HTMLElement | null>(null)
const image = ref<HTMLImageElement | null>(null)
const portrait = ref(false)
const scale = ref(1)
const x = ref(0)
const y = ref(0)
const pointers = new Map<number, { x: number; y: number }>()
let gesture: { x: number; y: number; distance: number; scale: number; offsetX: number; offsetY: number } | null = null
const transform = computed(() => `translate(-50%, -50%) translate(${x.value}px, ${y.value}px) scale(${scale.value})`)

function setOffset(nextX: number, nextY: number, nextScale: number) {
  if (!stage.value || !image.value) return
  const maxX = Math.max(0, (image.value.offsetWidth * nextScale - stage.value.clientWidth) / 2)
  const maxY = Math.max(0, (image.value.offsetHeight * nextScale - stage.value.clientHeight) / 2)
  x.value = Math.max(-maxX, Math.min(maxX, nextX))
  y.value = Math.max(-maxY, Math.min(maxY, nextY))
}

function point(event: PointerEvent) {
  return { x: event.clientX, y: event.clientY }
}
function origin() {
  const rect = stage.value!.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}
function zoomAt(next: number, anchorX: number, anchorY: number) {
  const value = Math.max(1, Math.min(5, next))
  const ratio = value / scale.value
  setOffset(
    value === 1 ? 0 : anchorX - (anchorX - x.value) * ratio,
    value === 1 ? 0 : anchorY - (anchorY - y.value) * ratio,
    value
  )
  scale.value = value
}
function startGesture() {
  const points = [...pointers.values()]
  if (!points.length) {
    gesture = null
    return
  }
  const a = points[0]!
  const b = points[1]
  gesture = {
    x: b ? (a.x + b.x) / 2 : a.x,
    y: b ? (a.y + b.y) / 2 : a.y,
    distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
    scale: scale.value,
    offsetX: x.value,
    offsetY: y.value
  }
}
function down(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  pointers.set(event.pointerId, point(event))
  stage.value?.setPointerCapture(event.pointerId)
  startGesture()
}
function move(event: PointerEvent) {
  if (!pointers.has(event.pointerId) || !gesture) return
  pointers.set(event.pointerId, point(event))
  const points = [...pointers.values()]
  const a = points[0]!
  const b = points[1]
  if (b && gesture.distance) {
    const centerX = (a.x + b.x) / 2
    const centerY = (a.y + b.y) / 2
    const value = Math.max(1, Math.min(5, (gesture.scale * Math.hypot(a.x - b.x, a.y - b.y)) / gesture.distance))
    const center = origin()
    const ratio = value / gesture.scale
    setOffset(
      value === 1 ? 0 : centerX - center.x - (gesture.x - center.x - gesture.offsetX) * ratio,
      value === 1 ? 0 : centerY - center.y - (gesture.y - center.y - gesture.offsetY) * ratio,
      value
    )
    scale.value = value
  } else {
    setOffset(gesture.offsetX + a.x - gesture.x, gesture.offsetY + a.y - gesture.y, scale.value)
  }
}
function up(event: PointerEvent) {
  pointers.delete(event.pointerId)
  startGesture()
}
function wheel(event: WheelEvent) {
  const center = origin()
  const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
  zoomAt(scale.value * Math.exp(-delta * 0.002), event.clientX - center.x, event.clientY - center.y)
}
function loaded(event: Event) {
  const image = event.target as HTMLImageElement
  portrait.value = image.naturalHeight > image.naturalWidth
}
</script>

<template>
  <div
    ref="stage"
    class="relative size-full min-h-0 min-w-0 touch-none overflow-hidden"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="up"
    @lostpointercapture="up"
    @wheel.prevent="wheel"
    @dblclick="zoomAt(scale > 1 ? 1 : 2.5, 0, 0)"
  >
    <img
      ref="image"
      :src="src"
      :alt="alt"
      draggable="false"
      class="absolute top-1/2 left-1/2 max-w-none"
      :class="portrait ? 'h-full w-auto' : 'h-auto w-full'"
      :style="{ transform }"
      @load="loaded"
      @error="emit('error')"
    />
  </div>
</template>
