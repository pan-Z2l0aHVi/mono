<script setup lang="ts">
import { DEFAULT_DURATION_MS, pointerOffset, renderTilt, resetTilt, tiltEnabled } from '@greypan/doc-demo-kit'
import type { WebUiTheme } from '@greypan/web-ui'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

const props = withDefaults(
  defineProps<{
    path: string
    label: string
    desc: string
    /** 关闭倾斜效果，链接本身仍可点击。 */
    disabled?: boolean
    /** 进入/离开的过渡时长，单位毫秒。 */
    duration?: number
    /** 使用线性缓动；默认走主题的 ease-out 曲线。 */
    linear?: boolean
  }>(),
  { disabled: false, duration: DEFAULT_DURATION_MS, linear: false }
)

const visualRef = ref<HTMLElement | null>(null)
let baseShadow = ''
let startedAt = 0
let tracking = false
let cleanupToken = 0

const visualClass = computed(() =>
  [
    'wui-glass pointer-events-none flex min-h-32 flex-col justify-between rounded-3xl p-5',
    'transition-[transform,box-shadow]',
    props.linear ? 'ease-linear' : 'ease-(--wui-ease-enter)',
    '[--wui-glass-corner-radius:24px]'
  ].join(' ')
)

function getVisual() {
  const visual = visualRef.value
  if (!visual) return null
  if (!baseShadow) {
    baseShadow = getComputedStyle(visual).getPropertyValue('--wui-internal-glass-shadow').trim()
  }
  return visual
}

function handlePointerEnter() {
  // 重新进入时从当前位置接上，第一段移动重新按过渡时长播放。
  startedAt = 0
  tracking = false
}

/**
 * 指针事件挂在没有 transform 的外层链接上，它的盒子是稳定的、命中区域不随倾斜变化；
 * 倾斜只作用于内层视觉元素，包围盒不会随倾斜变大、反过来推动倾斜形成抖动。
 *
 * 过渡交给 CSS：进入和离开各占 duration，进入后这段时间内指针的移动也走同一条过渡，
 * 之后改为 0s 直接跟手，既不截断起始动画、也不会持续拖尾。
 */
function handlePointerMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  const visual = getVisual()
  if (!visual) return
  if (!tiltEnabled(props.disabled, visual.closest<WebUiTheme>('web-ui-theme')?.isReducedMotion())) {
    resetTilt(visual)
    return
  }

  cleanupToken += 1
  const now = performance.now()
  if (!startedAt) startedAt = now
  if (!tracking && now - startedAt >= props.duration) tracking = true
  visual.style.transitionDuration = tracking ? '0s' : props.duration + 'ms'

  const { x, y } = pointerOffset(
    (event.currentTarget as HTMLElement).getBoundingClientRect(),
    event.clientX,
    event.clientY
  )
  renderTilt(visual, x, y, baseShadow)
}

function handlePointerLeave() {
  const visual = getVisual()
  if (!visual || !visual.style.transform) return
  if (!tiltEnabled(props.disabled, visual.closest<WebUiTheme>('web-ui-theme')?.isReducedMotion())) {
    resetTilt(visual)
    return
  }

  tracking = false
  visual.style.transitionDuration = props.duration + 'ms'
  renderTilt(visual, 0, 0, baseShadow)

  // 归位动画播完后再清掉内联样式，让卡片回到与未 hover 完全相同的状态。
  const token = cleanupToken + 1
  cleanupToken = token
  window.setTimeout(() => {
    if (cleanupToken !== token) return
    resetTilt(visual)
  }, props.duration)
}
</script>

<template>
  <RouterLink
    :to="path"
    class="relative block text-left"
    @pointerenter="handlePointerEnter"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <div ref="visualRef" :class="visualClass">
      <div>
        <div class="font-semibold text-(--wui-color-text)">{{ label }}</div>
        <p class="mt-2 text-xs leading-relaxed text-(--wui-color-text-secondary) line-clamp-2">{{ desc }}</p>
      </div>
      <div class="mt-4 flex items-center gap-1 text-xs font-medium text-(--wui-color-accent) opacity-70">
        查看演示 →
      </div>
    </div>
  </RouterLink>
</template>
