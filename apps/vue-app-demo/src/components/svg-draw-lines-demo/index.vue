<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import {
  lucideSearch,
  lucideStar,
  lucideHeart,
  lucideBell,
  lucideMail,
  lucideUser,
  lucideDownload,
  lucideCheck,
  lucideSettings,
  lucideInbox
} from '@greypan/web-ui/icons'

const duration = ref(1000)
const easing = ref('ease-in-out')

const svg1 = ref<WebUiSvgDrawLines>()
const svg2 = ref<WebUiSvgDrawLines>()
const svg3 = ref<WebUiSvgDrawLines>()
const multiRef = ref<WebUiSvgDrawLines>()
const nestedRef = ref<WebUiSvgDrawLines>()
const mixedRef = ref<WebUiSvgDrawLines>()
const iconRefs = reactive<Record<string, WebUiSvgDrawLines | undefined>>({})

function getRef(itemId: string): (el: unknown) => void {
  return (el: unknown) => {
    if (el) iconRefs[itemId] = el as WebUiSvgDrawLines
  }
}

function replayAll() {
  svg1.value?.replay()
  svg2.value?.replay()
  svg3.value?.replay()
  multiRef.value?.replay()
  nestedRef.value?.replay()
  mixedRef.value?.replay()
  Object.values(iconRefs).forEach(ref => ref?.replay())
}

function replayBasic(id: 1 | 2 | 3) {
  if (id === 1) svg1.value?.replay()
  else if (id === 2) svg2.value?.replay()
  else svg3.value?.replay()
}

function replayIcon(name: string) {
  iconRefs[name]?.replay()
}

function updateDuration(e: Event) {
  duration.value = (e.currentTarget as EventTarget & { value: number }).value
}

const iconItems = [
  { id: 'search', label: 'Search 搜索', icon: lucideSearch },
  { id: 'star', label: 'Star 星标', icon: lucideStar },
  { id: 'heart', label: 'Heart 收藏', icon: lucideHeart },
  { id: 'bell', label: 'Bell 通知', icon: lucideBell },
  { id: 'mail', label: 'Mail 邮件', icon: lucideMail },
  { id: 'user', label: 'User 用户', icon: lucideUser },
  { id: 'download', label: 'Download 下载', icon: lucideDownload },
  { id: 'check', label: 'Check 确认', icon: lucideCheck },
  { id: 'settings', label: 'Settings 设置', icon: lucideSettings },
  { id: 'inbox', label: 'Inbox 收件箱', icon: lucideInbox }
]
</script>

<template>
  <div>
    <h1>SVG 描边动画</h1>
    <p class="mb-4 text-[var(--wui-color-text-muted)]">
      将 SVG 图形的轮廓线以描边动画逐笔绘制。支持 path、rect、circle、line、polyline、polygon、ellipse 等多种基本图形。
    </p>

    <h2>参数控制</h2>
    <div class="mb-6 flex flex-col gap-4">
      <label class="flex items-center gap-2 text-sm">
        <span class="whitespace-nowrap text-[var(--wui-color-text-muted)]">动画时长:</span>
        <web-ui-slider
          :value="duration"
          :min="200"
          :max="5000"
          :step="100"
          class="max-w-100"
          @input="updateDuration"
        ></web-ui-slider>
        <code class="rounded bg-[var(--wui-color-surface-raised)] px-2 py-0.5 text-xs">{{ duration }}ms</code>
      </label>

      <label class="flex items-center gap-2 text-sm">
        <span class="text-[var(--wui-color-text-muted)]">缓动函数:</span>
        <web-ui-select v-model="easing" class="w-36">
          <web-ui-option value="linear">linear</web-ui-option>
          <web-ui-option value="ease">ease</web-ui-option>
          <web-ui-option value="ease-in">ease-in</web-ui-option>
          <web-ui-option value="ease-out">ease-out</web-ui-option>
          <web-ui-option value="ease-in-out">ease-in-out</web-ui-option>
          <web-ui-option value="cubic-bezier(0.68, -0.55, 0.27, 1.55)">bounce</web-ui-option>
        </web-ui-select>
      </label>

      <web-ui-button @click="replayAll" variant="secondary">全部重播</web-ui-button>
    </div>

    <h2>基础形状（light DOM）</h2>
    <div class="mb-6 flex flex-wrap items-end gap-6">
      <div>
        <p class="mb-1 text-sm text-[var(--wui-color-text-muted)]">简单线条</p>
        <div class="flex items-center gap-2">
          <web-ui-svg-draw-lines ref="svg1" :duration="duration" :easing="easing">
            <svg
              viewBox="0 0 100 40"
              width="100"
              height="40"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 20 L50 5 L95 20" />
              <path d="M50 5 L50 35" />
            </svg>
          </web-ui-svg-draw-lines>
          <web-ui-button @click="replayBasic(1)" variant="ghost">重播</web-ui-button>
        </div>
      </div>
      <div>
        <p class="mb-1 text-sm text-[var(--wui-color-text-muted)]">几何图形</p>
        <div class="flex items-center gap-2">
          <web-ui-svg-draw-lines ref="svg2" :duration="duration" :easing="easing">
            <svg
              viewBox="0 0 100 80"
              width="100"
              height="80"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            >
              <rect x="20" y="40" width="40" height="35" />
              <polygon points="10,40 40,10 70,40" />
              <circle cx="75" cy="15" r="10" />
            </svg>
          </web-ui-svg-draw-lines>
          <web-ui-button @click="replayBasic(2)" variant="ghost">重播</web-ui-button>
        </div>
      </div>
      <div>
        <p class="mb-1 text-sm text-[var(--wui-color-text-muted)]">波浪曲线</p>
        <div class="flex items-center gap-2">
          <web-ui-svg-draw-lines ref="svg3" :duration="duration" :easing="easing">
            <svg
              viewBox="0 0 200 60"
              width="200"
              height="60"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 30 Q25 0 50 30 T100 30 T150 30 T195 30" />
            </svg>
          </web-ui-svg-draw-lines>
          <web-ui-button @click="replayBasic(3)" variant="ghost">重播</web-ui-button>
        </div>
      </div>
    </div>

    <h2>复杂场景</h2>
    <div class="mb-6 flex flex-wrap items-end gap-8">
      <div>
        <p class="mb-1 text-sm text-[var(--wui-color-text-muted)]">多个同级 SVG</p>
        <div class="flex items-center gap-2">
          <web-ui-svg-draw-lines ref="multiRef" :duration="duration" :easing="easing">
            <svg viewBox="0 0 50 50" width="50" height="50" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="25" cy="25" r="20" />
            </svg>
            <svg viewBox="0 0 50 50" width="50" height="50" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="10" y="10" width="30" height="30" />
            </svg>
          </web-ui-svg-draw-lines>
          <web-ui-button @click="multiRef?.replay()" variant="ghost">重播</web-ui-button>
        </div>
      </div>

      <div>
        <p class="mb-1 text-sm text-[var(--wui-color-text-muted)]">深层嵌套 &lt;g&gt;</p>
        <div class="flex items-center gap-2">
          <web-ui-svg-draw-lines ref="nestedRef" :duration="duration" :easing="easing">
            <svg viewBox="0 0 100 100" width="100" height="100" fill="none" stroke="currentColor" stroke-width="2">
              <g>
                <g>
                  <path d="M10 10 L90 90" />
                  <circle cx="50" cy="50" r="30" />
                </g>
              </g>
            </svg>
          </web-ui-svg-draw-lines>
          <web-ui-button @click="nestedRef?.replay()" variant="ghost">重播</web-ui-button>
        </div>
      </div>

      <div>
        <p class="mb-1 text-sm text-[var(--wui-color-text-muted)]">light DOM + Shadow DOM 混合</p>
        <div class="flex items-center gap-2">
          <web-ui-svg-draw-lines ref="mixedRef" :duration="duration" :easing="easing">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <web-ui-icon :icon="lucideStar" :size="24"></web-ui-icon>
          </web-ui-svg-draw-lines>
          <web-ui-button @click="mixedRef?.replay()" variant="ghost">重播</web-ui-button>
        </div>
      </div>
    </div>

    <h2>图标示例（Shadow DOM — web-ui-icon）</h2>
    <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <div
        v-for="item in iconItems"
        :key="item.id"
        class="flex flex-col items-center gap-2 rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-surface)] p-4"
      >
        <div class="flex items-center gap-1.5 text-sm text-[var(--wui-color-text-muted)]">
          <web-ui-icon :icon="item.icon" :size="16"></web-ui-icon>
          <span>{{ item.label }}</span>
        </div>
        <web-ui-svg-draw-lines :ref="getRef(item.id)" :duration="duration" :easing="easing">
          <web-ui-icon :icon="item.icon" :size="32"></web-ui-icon>
        </web-ui-svg-draw-lines>
        <web-ui-button @click="replayIcon(item.id)" full variant="ghost">重播</web-ui-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
web-ui-slider:not([vertical]) {
  width: 100%;
}
</style>
