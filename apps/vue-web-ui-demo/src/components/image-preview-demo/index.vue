<script setup lang="ts">
import { imagePreview, type ImagePreviewHandle, type ImagePreviewItem } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

/*
 * 内联 SVG 生成示例图：不引入二进制素材，同时能精确控制宽高比，
 * 便于验证缩放与平移的边界。
 */
function createImage(label: string, width: number, height: number, from: string, to: string): string {
  const fontSize = Math.round(Math.min(width, height) / 10)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    '<defs><linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">' +
    `<stop offset="0" stop-color="${from}" /><stop offset="1" stop-color="${to}" />` +
    '</linearGradient></defs>' +
    `<rect width="${width}" height="${height}" fill="url(#gradient)" />` +
    `<text x="50%" y="50%" fill="#ffffff" font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="600" text-anchor="middle" dominant-baseline="middle">${label}</text>` +
    '</svg>'
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const IMAGES: ImagePreviewItem[] = [
  { src: createImage('图 A · 1200 × 800', 1200, 800, '#0a84ff', '#5e5ce6'), alt: '图 A：蓝色渐变横版示例图' },
  { src: createImage('图 B · 900 × 1200', 900, 1200, '#ff375f', '#ff9f0a'), alt: '图 B：橙红渐变竖版示例图' },
  { src: createImage('图 C · 1600 × 600', 1600, 600, '#30d158', '#0a84ff'), alt: '图 C：绿蓝渐变宽幅示例图' }
]

const SINGLE_IMAGE: ImagePreviewItem[] = [
  { src: createImage('单图预览', 1200, 900, '#5e5ce6', '#ff375f'), alt: '单图预览示例' }
]

const LARGE_IMAGE: ImagePreviewItem[] = [
  { src: createImage('滚轮缩放 · 拖拽平移', 2400, 1600, '#1d1d1f', '#0a84ff'), alt: '用于验证缩放与平移的大尺寸示例图' }
]

const handleCommands: { label: string; run: (handle: ImagePreviewHandle) => void }[] = [
  { label: '上一张', run: handle => handle.prev() },
  { label: '下一张', run: handle => handle.next() },
  { label: '跳到第 3 张', run: handle => handle.goTo(2) },
  { label: '放大', run: handle => handle.zoomIn() },
  { label: '缩小', run: handle => handle.zoomOut() },
  { label: '重置缩放', run: handle => handle.resetZoom() },
  { label: '关闭', run: handle => handle.close() }
]

// 句柄是唯一的控制入口；保持引用后既可以驱动它，也能读取 index / scale。
const activeHandle = ref<ImagePreviewHandle>()
const statusText = ref('未打开')
let statusTimer: ReturnType<typeof setInterval> | undefined

function syncStatus() {
  const handle = activeHandle.value
  if (!handle) return
  const position = `${handle.index + 1} / ${handle.images.length}`
  statusText.value = `已打开 · 当前 ${position} · 缩放 ${Math.round(handle.scale * 100)}%`
}

function stopTracking() {
  if (statusTimer === undefined) return
  clearInterval(statusTimer)
  statusTimer = undefined
}

// 预览内部的滚轮 / 双击缩放不会回调外部，因此轮询句柄让面板保持同步。
function trackHandle(handle: ImagePreviewHandle) {
  stopTracking()
  activeHandle.value = handle
  syncStatus()
  statusTimer = setInterval(syncStatus, 150)
  void handle.closed.then(() => {
    stopTracking()
    if (activeHandle.value !== handle) return
    activeHandle.value = undefined
    statusText.value = '未打开'
  })
}

function runHandleCommand(run: (handle: ImagePreviewHandle) => void) {
  const handle = activeHandle.value
  if (!handle) return
  run(handle)
  syncStatus()
}

function openBasic(index = 0) {
  imagePreview({ images: IMAGES, index })
}

function openSingle() {
  imagePreview({ images: SINGLE_IMAGE })
}

function openWithoutLoop() {
  imagePreview({ images: IMAGES, loop: false })
}

function openLarge() {
  imagePreview({ images: LARGE_IMAGE })
}

function openHandleDemo() {
  trackHandle(imagePreview({ images: IMAGES, index: 1 }))
}

// container 优先级高于主题作用域，用来演示自定义挂载点与 CSS 变量覆盖。
const styledContainer = ref<HTMLElement>()

function openWithContainer() {
  const container = styledContainer.value
  if (!container) return
  imagePreview({ images: IMAGES, container })
}

onBeforeUnmount(() => {
  stopTracking()
  activeHandle.value?.close()
})
</script>

<template>
  <div>
    <h1>ImagePreview 图片预览</h1>
    <p class="mb-6 text-sm text-gray-500">
      命令式浮层组件，没有声明式标签契约：只能通过 <code>imagePreview()</code> 打开，并用返回的句柄控制。默认挂载到最近
      <code>web-ui-theme</code> 的 overlay 容器。
    </p>

    <h2>基础用法</h2>
    <p class="mb-3 text-sm text-gray-500">
      三张图默认可首尾循环；方向键或左右按钮切换，滚轮与 <code>+</code> / <code>-</code> 缩放，<code>0</code>
      重置，双击图片在 1x 与 2x 之间切换，Escape 或点击图片外空白处关闭。
    </p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openBasic()">打开预览</web-ui-button>
      <web-ui-button variant="secondary" @click="openBasic(2)">从第 3 张打开</web-ui-button>
    </div>

    <h2>单图预览</h2>
    <p class="mb-3 text-sm text-gray-500">只有一张图时不渲染上/下一张按钮，计数器为 <code>1 / 1</code>。</p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openSingle">打开单图预览</web-ui-button>
    </div>

    <h2>关闭循环</h2>
    <p class="mb-3 text-sm text-gray-500"><code>loop: false</code> 时索引在首尾钳制，越界方向的按钮禁用。</p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openWithoutLoop">loop = false</web-ui-button>
    </div>

    <h2>缩放与平移</h2>
    <p class="mb-3 text-sm text-gray-500">大尺寸图片放大后可拖拽平移，倍率限制在 1x–4x。</p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openLarge">打开大图</web-ui-button>
    </div>

    <h2>句柄控制</h2>
    <p class="mb-3 text-sm text-gray-500">
      句柄暴露 <code>index</code> / <code>scale</code> / <code>images</code> /
      <code>closed</code> 与全部控制方法，可以据此实现自己的触发器和状态面板。
    </p>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button @click="openHandleDemo">打开</web-ui-button>
    </div>
    <div v-if="activeHandle" class="mb-3 flex flex-wrap gap-2">
      <web-ui-button
        v-for="command in handleCommands"
        :key="command.label"
        variant="secondary"
        @click="runHandleCommand(command.run)"
      >
        {{ command.label }}
      </web-ui-button>
    </div>
    <div class="mb-6 rounded-lg bg-[var(--wui-color-surface-raised)] px-3 py-2 text-sm">{{ statusText }}</div>

    <h2>自定义容器与样式</h2>
    <p class="mb-3 text-sm text-gray-500">
      传 <code>container</code> 可把预览挂到自己的容器上（优先级高于主题作用域）。CSS 自定义属性沿 DOM
      继承，所以在容器上就能覆盖 <code>--wui-image-preview-overlay-bg</code> 与
      <code>--wui-image-preview-edge-gap</code>。
    </p>
    <div
      ref="styledContainer"
      class="mb-3 rounded-lg border border-dashed border-[var(--wui-color-border)] p-3 [--wui-image-preview-edge-gap:48px] [--wui-image-preview-overlay-bg:#0a2850e0]"
    >
      <span class="text-sm text-[var(--wui-color-text-secondary)]">预览宿主挂载在这里</span>
    </div>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openWithContainer">用自定义容器打开</web-ui-button>
    </div>
  </div>
</template>
