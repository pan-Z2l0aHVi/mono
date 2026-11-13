<script setup lang="ts">
import type { WebUiDrawer, WebUiEvent } from '@greypan/web-ui'
import { lucideArrowRight } from '@greypan/web-ui/icons'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { resourceIcon } from './presentation'
import { readTextPreview, resolvePreviewTarget, type PreviewEmptyReason } from './preview'
import PreviewImage from './PreviewImage.vue'

const props = defineProps<{
  open: boolean
  resource: ResourceView | null
  mobile: boolean
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; recover: [source: ResourceSourceView] }>()

type TextState = 'idle' | 'loading' | 'ready' | 'failed'

const placement = computed(() => (props.mobile ? 'bottom' : 'right'))
const target = computed(() => resolvePreviewTarget(props.resource))
const imageFailed = ref(false)
const videoFailed = ref(false)
const videoPortrait = ref(false)
const mediaLoading = ref(false)
const textState = ref<TextState>('idle')
const textPreview = ref<{ text: string; truncated: boolean } | null>(null)
const textError = ref('')
let textRequest = 0
let textAbort: AbortController | null = null

const emptyCopy: Record<PreviewEmptyReason, { title: string; description: string }> = {
  'no-source': { title: '没有可预览的入口', description: '这个资源没有可用的来源。' },
  'empty-location': { title: '链接地址为空', description: '刷新这个链接来源后才能预览。' },
  'source-unavailable': { title: '文件已失效', description: '原路径已经不存在，找回文件后即可预览。' },
  'media-unavailable': { title: '暂时无法预览', description: '请稍后重试，或用其他应用打开文件。' },
  'unsupported-kind': { title: '暂不支持预览', description: '可以在系统默认应用中打开这个文件。' }
}

const emptyState = computed(() => {
  const reason = target.value.emptyReason
  if (target.value.mode !== 'empty' || !reason) return null
  return emptyCopy[reason]
})

// 编码不做嗅探，所以乱码提示对所有文本预览常驻；超限时再补一句截断说明。
const textNotice = computed(() =>
  textPreview.value?.truncated
    ? '文件过大，仅显示开头部分。部分文件的文字可能无法正常显示。'
    : '部分文件的文字可能无法正常显示。'
)

// 同 URL 再次挂载不会重新触发 load/error，key 让资源切换一定重建媒体元素。
const mediaKey = computed(() => `${target.value.source?.id ?? ''}|${target.value.mediaUrl ?? ''}`)

function cancelTextRequest() {
  textRequest++
  textAbort?.abort()
  textAbort = null
}

watch(
  () => [props.open, props.resource?.id, target.value.mode, target.value.mediaUrl] as const,
  ([open]) => {
    imageFailed.value = false
    videoFailed.value = false
    videoPortrait.value = false
    mediaLoading.value = open && ['image', 'video', 'url'].includes(target.value.mode)
    cancelTextRequest()
    textPreview.value = null
    textError.value = ''
    // 关闭时内容区不渲染媒体元素（见模板的 open && resource 守卫），此时不读取文本，
    // 避免仅因选中资源（行点击 / 编辑标签）就在后台发起一次无人可见的 fetch。
    if (!open) {
      textState.value = 'idle'
      return
    }
    textState.value = target.value.mode === 'text' ? 'loading' : 'idle'
    if (target.value.mode === 'text') void loadText()
  },
  { immediate: true }
)

onBeforeUnmount(cancelTextRequest)

async function loadText() {
  const mediaUrl = target.value.mediaUrl
  if (!mediaUrl) return
  const request = ++textRequest
  const controller = new AbortController()
  textAbort = controller
  try {
    const response = await fetch(mediaUrl, { signal: controller.signal })
    if (!response.ok) throw new Error(`读取失败（HTTP ${response.status}）`)
    const preview = await readTextPreview(response)
    if (request !== textRequest) return
    textPreview.value = { text: preview.text, truncated: preview.truncated }
    textState.value = 'ready'
  } catch (cause) {
    if (request !== textRequest) return
    console.error('读取文件预览失败', cause)
    textError.value = '无法读取文件，请检查文件是否还在原处'
    textState.value = 'failed'
  }
}

function handleOpenChange(event: WebUiEvent<WebUiDrawer, 'open-change'>) {
  emit('update:open', event.detail.open)
}

function handleMediaError(kind: 'image' | 'video') {
  if (kind === 'image') imageFailed.value = true
  else videoFailed.value = true
  mediaLoading.value = false
}
</script>

<template>
  <!--
    drag zone 取 32px（drawer 自己的默认值是 20px，见 CHANGELOG：曾从 32px 收窄并留了
    「consumer 可覆回 32px+」的口子）。20px 在 720px 宽的 panel 边缘上太窄，拖拽命中率低。

  -->
  <web-ui-drawer
    page-shift
    :open="open"
    :placement="placement"
    aria-dialog-label="资源预览"
    draggable
    controlled
    class="mobile:[--wui-drawer-height:80vh] mobile:[--wui-drawer-inset:0px] mobile:[--wui-drawer-radius:28px_28px_0_0] [--wui-drawer-width:max(60vw,320px)] [--wui-drawer-content-padding:20px] [--wui-empty-padding:0px] [--wui-drawer-drag-zone-size:32px]"
    @open-change="handleOpenChange"
  >
    <!--
      抽屉的 padding 同时用于定位拖拽手柄，内容向外延伸覆盖该空间，再按抽屉圆角裁切。

      open && resource 双重守卫：selectedResource 由行点击即赋值，而 previewOpen 仍是 false，
      此时 dialog 是 display:none。只按 resource 守卫会让 img/video/iframe 挂在隐藏 dialog 里
      后台加载（外站、Range 媒体、文本 fetch），视频关闭后还会继续出声；加上 open 让媒体元素
      随关闭一并卸载。
    -->
    <div
      v-if="open && resource"
      class="-m-5 w-[calc(100%+40px)] min-h-0 rounded-[var(--wui-drawer-radius,28px)]"
      :class="
        target.mode === 'text'
          ? 'min-h-full'
          : 'grid h-[calc(100%+40px)] grid-rows-[minmax(0,1fr)] overflow-hidden mobile:h-(--wui-drawer-height)'
      "
    >
      <div v-if="emptyState" class="min-h-0 overflow-y-auto">
        <div class="grid min-h-full place-items-center">
          <web-ui-empty :size="72" :title="emptyState.title" :description="emptyState.description">
            <web-ui-icon slot="icon" :icon="resourceIcon(resource.kind)" :size="40" />
            <web-ui-button
              v-if="target.emptyReason === 'source-unavailable' && target.source"
              slot="action"
              class="group"
              variant="primary"
              @click="emit('recover', target.source)"
            >
              <span
                class="inline-block transition-transform duration-150 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
                >找回资源</span
              >
              <web-ui-icon
                slot="suffix"
                :icon="lucideArrowRight"
                :size="16"
                class="transition-transform duration-150 motion-safe:group-hover:-translate-x-0.5 motion-reduce:transition-none"
              />
            </web-ui-button>
          </web-ui-empty>
        </div>
      </div>

      <div v-else-if="target.mode === 'image'" class="relative min-h-0 overflow-hidden">
        <web-ui-empty v-if="imageFailed" :size="72" title="无法显示这张图片" description="文件可能已被移动或删除。">
          <web-ui-icon slot="icon" :icon="resourceIcon(resource.kind)" :size="40" />
        </web-ui-empty>
        <PreviewImage
          v-else
          :key="mediaKey"
          :src="target.mediaUrl ?? ''"
          :alt="resource.title"
          :class="{ invisible: mediaLoading }"
          @load="mediaLoading = false"
          @error="handleMediaError('image')"
        />
        <div
          v-if="mediaLoading"
          class="absolute inset-0 grid place-items-center"
          role="status"
          aria-label="正在加载预览"
        >
          <web-ui-spinner :size="28" />
        </div>
      </div>

      <div v-else-if="target.mode === 'video'" class="relative min-h-0 overflow-hidden">
        <div class="relative grid size-full place-items-center overflow-hidden">
          <web-ui-empty
            v-if="videoFailed"
            :size="72"
            title="无法播放这个视频"
            description="文件可能已被移动，或暂时无法显示。"
          >
            <web-ui-icon slot="icon" :icon="resourceIcon(resource.kind)" :size="40" />
          </web-ui-empty>
          <video
            v-else
            :key="mediaKey"
            :src="target.mediaUrl ?? undefined"
            :class="[videoPortrait ? 'h-full w-auto' : 'h-auto w-full', { invisible: mediaLoading }]"
            class="absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 bg-black"
            controls
            playsinline
            preload="auto"
            @loadedmetadata="
              videoPortrait =
                ($event.target as HTMLVideoElement).videoHeight > ($event.target as HTMLVideoElement).videoWidth
            "
            @loadeddata="mediaLoading = false"
            @error="handleMediaError('video')"
          ></video>
          <div
            v-if="mediaLoading"
            class="absolute inset-0 grid place-items-center"
            role="status"
            aria-label="正在加载预览"
          >
            <web-ui-spinner :size="28" />
          </div>
        </div>
      </div>

      <div v-else-if="target.mode === 'text'" class="min-h-full">
        <div
          v-if="textState === 'loading'"
          class="grid min-h-[calc(100vh-40px)] place-items-center mobile:min-h-(--wui-drawer-height)"
          role="status"
          aria-label="正在加载预览"
        >
          <web-ui-spinner :size="28" />
        </div>
        <web-ui-empty v-else-if="textState === 'failed'" :size="72" title="无法读取这个文件" :description="textError">
          <web-ui-icon slot="icon" :icon="resourceIcon(resource.kind)" :size="40" />
        </web-ui-empty>
        <div v-else-if="textPreview">
          <p class="m-0 border-b border-black/6 text-xs text-(--wui-color-text-secondary) dark:border-white/8">
            {{ textNotice }}
          </p>
          <pre class="m-0 font-mono text-xs leading-5 whitespace-pre-wrap wrap-break-word">{{ textPreview.text }}</pre>
        </div>
      </div>

      <!--
        allow-same-origin 是刻意保留的：去掉后 iframe 落在 opaque origin 上，大量真实站点
        （读自身 cookie/localStorage、按同源规则发请求）会直接失效，与「预览网页」的目的相悖。
        已知残余风险：与 app 同源的已存 URL 会在同源权限下运行，行为与跨源页面不同；
        本仓无 CSP/frame 限制，被 X-Frame-Options 拦截的站点只能由用户在浏览器里另开地址。
        该取舍经 Manager checkpoint 批准后留档于此。
      -->
      <div v-else-if="target.mode === 'url'" class="relative size-full">
        <iframe
          :key="mediaKey"
          class="size-full border-0 bg-white"
          :class="{ invisible: mediaLoading }"
          :src="target.source?.location ?? undefined"
          :title="`${resource.title} 网页预览`"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerpolicy="no-referrer"
          @load="mediaLoading = false"
        ></iframe>
        <div
          v-if="mediaLoading"
          class="absolute inset-0 grid place-items-center"
          role="status"
          aria-label="正在加载预览"
        >
          <web-ui-spinner :size="28" />
        </div>
      </div>
    </div>
  </web-ui-drawer>
</template>
