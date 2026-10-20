<script setup lang="ts">
import { imagePreview, type ImagePreviewHandle, type ImagePreviewItem, type ImagePreviewOptions } from '@greypan/web-ui'
import { computed, onBeforeUnmount, ref } from 'vue'

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
  {
    src: createImage('Image A · 1200 × 800', 1200, 800, '#0a84ff', '#5e5ce6'),
    alt: 'Image A: blue gradient landscape sample'
  },
  {
    src: createImage('Image B · 900 × 1200', 900, 1200, '#ff375f', '#ff9f0a'),
    alt: 'Image B: orange-red gradient portrait sample'
  },
  {
    src: createImage('Image C · 1600 × 600', 1600, 600, '#30d158', '#0a84ff'),
    alt: 'Image C: teal-blue gradient wide sample'
  }
]

const SINGLE_IMAGE: ImagePreviewItem[] = [
  { src: createImage('Single image preview', 1200, 900, '#5e5ce6', '#ff375f'), alt: 'Single image preview sample' }
]

const LARGE_IMAGE: ImagePreviewItem[] = [
  {
    src: createImage('Wheel to zoom · Drag to pan', 2400, 1600, '#1d1d1f', '#0a84ff'),
    alt: 'A large sample image that verifies zoom and pan'
  }
]

// 展示类 option 默认全关，多数示例用这份「全部开启」预设把控件带出来。
const FULL_UI = { nav: true, toolbar: true, closable: true, indicator: true }

const handleCommands: { label: string; run: (handle: ImagePreviewHandle) => void }[] = [
  { label: 'Previous image', run: handle => handle.prev() },
  { label: 'Next image', run: handle => handle.next() },
  { label: 'Go to image 3', run: handle => handle.goTo(2) },
  { label: 'Zoom in', run: handle => handle.zoomIn() },
  { label: 'Zoom out', run: handle => handle.zoomOut() },
  { label: 'Reset zoom', run: handle => handle.resetZoom() },
  { label: 'Close', run: handle => handle.close() }
]

// handle 是唯一的控制入口；保持引用后既可以驱动它，也能读取 index / scale。
const activeHandle = ref<ImagePreviewHandle>()
const statusText = ref('Not open')
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

// 预览内部的滚轮 / 双击缩放不会回调外部，因此轮询 handle 让 panel 保持同步。
function trackHandle(handle: ImagePreviewHandle) {
  stopTracking()
  activeHandle.value = handle
  syncStatus()
  statusTimer = setInterval(syncStatus, 150)
  void handle.closed.then(() => {
    stopTracking()
    if (activeHandle.value !== handle) return
    activeHandle.value = undefined
    statusText.value = 'Not open'
  })
}

function runHandleCommand(run: (handle: ImagePreviewHandle) => void) {
  const handle = activeHandle.value
  if (!handle) return
  run(handle)
  syncStatus()
}

function openFull(index = 0) {
  imagePreview({ images: IMAGES, index, ...FULL_UI })
}

// 不传任何展示类 option：只有图片本身，空白点击与 Escape 仍可关闭。
function openMinimal() {
  imagePreview({ images: IMAGES })
}

function openSingle() {
  imagePreview({ images: SINGLE_IMAGE, ...FULL_UI })
}

function openWithoutLoop() {
  imagePreview({ images: IMAGES, loop: false, ...FULL_UI })
}

function openLarge() {
  imagePreview({ images: LARGE_IMAGE, ...FULL_UI })
}

function openSwipe() {
  imagePreview({ images: IMAGES, swipe: true, ...FULL_UI })
}

function openSwipeBounded() {
  imagePreview({ images: IMAGES, swipe: true, loop: false, ...FULL_UI })
}

function openNoBackdropClose() {
  imagePreview({ images: IMAGES, noBackdropClose: true, ...FULL_UI })
}

function openNoScrollLock() {
  imagePreview({ images: IMAGES, noScrollLock: true, ...FULL_UI })
}

function openHandleDemo() {
  trackHandle(imagePreview({ images: IMAGES, index: 1, ...FULL_UI }))
}

// container 优先级高于主题作用域，用来演示自定义挂载点与 CSS 变量覆盖。
const styledContainer = ref<HTMLElement>()

function openWithContainer() {
  const container = styledContainer.value
  if (!container) return
  imagePreview({ images: IMAGES, container, ...FULL_UI })
}

// 四个展示类 option 彼此独立、默认全关；拆开控制，便于逐个对照哪块 UI 由哪个 option 负责。
const partNav = ref(false)
const partToolbar = ref(false)
const partClosable = ref(false)
const partIndicator = ref(false)

// 实时回显当前组合，让读者看到勾选与 options 字段的对应关系。
const partsCode = computed(
  () =>
    `imagePreview({ images, nav: ${partNav.value}, toolbar: ${partToolbar.value}, ` +
    `closable: ${partClosable.value}, indicator: ${partIndicator.value} })`
)

function openParts() {
  imagePreview({
    images: IMAGES,
    nav: partNav.value,
    toolbar: partToolbar.value,
    closable: partClosable.value,
    indicator: partIndicator.value
  })
}

// 单项预设：每次只开启一个 option，用来确认每个 option 负责哪块 UI。
const partPresets: { label: string; options: Partial<ImagePreviewOptions> }[] = [
  { label: 'nav only', options: { nav: true } },
  { label: 'toolbar only', options: { toolbar: true } },
  { label: 'closable only', options: { closable: true } },
  { label: 'indicator only', options: { indicator: true } }
]

function openPartPreset(options: Partial<ImagePreviewOptions>) {
  imagePreview({ images: IMAGES, ...options })
}

onBeforeUnmount(() => {
  stopTracking()
  activeHandle.value?.close()
})
</script>

<template>
  <div>
    <h1>ImagePreview image preview</h1>
    <p class="mb-6 text-sm text-gray-500">
      命令式 overlay 组件，没有声明式 tag 契约：只能通过
      <code>imagePreview()</code>and control it through the returned handle. It mounts into the nearest<code
        >web-ui-theme</code
      >
      的 overlay 容器。
    </p>

    <h2>Basic usage</h2>
    <p class="mb-3 text-sm text-gray-500">
      展示类 option 默认全关，只渲染图片本身；下面第一个 button 显式开启导航、工具条、关闭 button 与
      indicator。方向键始终可切图， 滚轮与 <code>+</code> / <code>-</code>Zoom,<code>0</code> 重置，双击图片在 1x 与 2x
      之间切换，Escape 或点击图片外空白处关闭。各 option 各自的效果见下方「各部分显隐」。
    </p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openFull()">Open the preview (everything on)</web-ui-button>
      <web-ui-button variant="secondary" @click="openMinimal">Default options</web-ui-button>
      <web-ui-button variant="secondary" @click="openFull(2)">Open from image 3</web-ui-button>
    </div>

    <h2>Toggle each part</h2>
    <p class="mb-3 text-sm text-gray-500">
      四个展示类 option 彼此独立、默认全关。勾选后打开预览即可看到对应控件出现；下方四项预设每次只开启一个 option，
      便于对照每个 option 负责哪块 UI。除「仅 closable」外，其余预设都没有可见的关闭 button，此时点击图片外空白处或按
      <code>Escape</code> 仍可关闭。
    </p>
    <div class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <web-ui-checkbox :checked="partNav" @change="partNav = $event.target.checked">
        <code>nav</code>（上/下一张）
      </web-ui-checkbox>
      <web-ui-checkbox :checked="partToolbar" @change="partToolbar = $event.target.checked">
        <code>toolbar</code>（缩放工具条）
      </web-ui-checkbox>
      <web-ui-checkbox :checked="partClosable" @change="partClosable = $event.target.checked">
        <code>closable</code>（关闭 button）
      </web-ui-checkbox>
      <web-ui-checkbox :checked="partIndicator" @change="partIndicator = $event.target.checked">
        <code>indicator</code>（indicator）
      </web-ui-checkbox>
    </div>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button @click="openParts">Opens with the current selection</web-ui-button>
    </div>
    <div class="mb-3 rounded-lg bg-(--wui-color-surface-raised) px-3 py-2 text-sm">
      <code>{{ partsCode }}</code>
    </div>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button
        v-for="preset in partPresets"
        :key="preset.label"
        variant="secondary"
        @click="openPartPreset(preset.options)"
      >
        {{ preset.label }}
      </web-ui-button>
    </div>

    <h2>Single image preview</h2>
    <p class="mb-3 text-sm text-gray-500">
      即使开启 <code>nav</code>; with a single image it renders no previous/next button and the indicator is<code
        >1 / 1</code
      >。
    </p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openSingle">Open the single-image preview</web-ui-button>
    </div>

    <h2>Loop off</h2>
    <p class="mb-3 text-sm text-gray-500">
      <code>loop: false</code>clamps the index at both ends and disables the button in the out-of-range direction.
    </p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openWithoutLoop">loop = false</web-ui-button>
    </div>

    <h2>Zoom and pan</h2>
    <p class="mb-3 text-sm text-gray-500">
      大尺寸图片可按住拖拽平移，方向不限且与倍率无关：放大后查看被裁切的边缘，1x 时在视口内移动图片；倍率限制在
      1x–4x，边界是图片与舞台尺寸差的一半，因此图片始终不会被拖出视口。
    </p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openLarge">Open the large image</web-ui-button>
    </div>

    <h2>Swipe to switch</h2>
    <p class="mb-3 text-sm text-gray-500">
      <code>swipe: true</code> 且图片多于一张时，1x 下横向拖拽越过阈值即切换图片，跟手位移松手后回弹；
      <code>loop: false</code> 时在边界回弹。该手势生效期间横向轴归它，因此 1x 下纵向拖拽仍用于平移；
      放大后拖拽一律平移。该手势复用 shared 的 <code>attachDragGesture</code>。
    </p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openSwipe">swipe = true</web-ui-button>
      <web-ui-button variant="secondary" @click="openSwipeBounded">swipe = true + loop = false</web-ui-button>
    </div>

    <h2>Backdrop and scroll</h2>
    <p class="mb-3 text-sm text-gray-500">
      <code>noBackdropClose</code>and<code>noScrollLock</code>aligns its semantics with<code>web-ui-dialog</code>
      的同名属性：前者让空白点击不再关闭（下方示例仍保留关闭 button），后者跳过打开期间的页面滚动锁定。
    </p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openNoBackdropClose">noBackdropClose = true</web-ui-button>
      <web-ui-button variant="secondary" @click="openNoScrollLock">noScrollLock = true</web-ui-button>
    </div>

    <h2>Handle control</h2>
    <p class="mb-3 text-sm text-gray-500">
      handle 暴露 <code>index</code> / <code>scale</code> / <code>images</code> /
      <code>closed</code> 与全部控制方法，可以据此实现自己的 trigger 和状态 panel。
    </p>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button @click="openHandleDemo">Open</web-ui-button>
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
    <div class="mb-6 rounded-lg bg-(--wui-color-surface-raised) px-3 py-2 text-sm">{{ statusText }}</div>

    <h2>Custom container and styles</h2>
    <p class="mb-3 text-sm text-gray-500">
      传 <code>container</code> 可把预览挂到自己的容器上（优先级高于主题作用域）。CSS 自定义属性沿 DOM
      继承，所以在容器上就能覆盖
      <code>--wui-image-preview-overlay-bg</code>and<code>--wui-image-preview-edge-gap</code>。
    </p>
    <div
      ref="styledContainer"
      class="mb-3 rounded-lg border border-dashed border-(--wui-color-border) p-3 [--wui-image-preview-edge-gap:48px] [--wui-image-preview-overlay-bg:#0a2850e0]"
    >
      <span class="text-sm text-(--wui-color-text-secondary)">The preview host mounts here</span>
    </div>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="openWithContainer">Open with a custom container</web-ui-button>
    </div>
  </div>
</template>
