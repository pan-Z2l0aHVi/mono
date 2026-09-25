<script setup lang="ts">
import type { WebUiDrawer, WebUiEvent } from '@greypan/web-ui'
import { lucideExternalLink } from '@greypan/web-ui/icons'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import type { ResourceView } from '@/stores/library'

import { resourceIcon } from './presentation'
import { readTextPreview, resolvePreviewTarget, type PreviewEmptyReason } from './preview'

const props = defineProps<{
  open: boolean
  resource: ResourceView | null
  mobile: boolean
  mediaUrlFor: (sourceId: string) => string | null
  openExternal: (target: string) => Promise<void>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'open-failed': [error: unknown]
}>()

type TextState = 'idle' | 'loading' | 'ready' | 'failed'

const placement = computed(() => (props.mobile ? 'bottom' : 'right'))
const target = computed(() => resolvePreviewTarget(props.resource, props.mediaUrlFor))
const imageFailed = ref(false)
const videoFailed = ref(false)
const textState = ref<TextState>('idle')
const textPreview = ref<{ text: string; truncated: boolean } | null>(null)
const textError = ref('')
const externalBusy = ref(false)
let textRequest = 0
let textAbort: AbortController | null = null

const emptyCopy: Record<PreviewEmptyReason, { title: string; description: string }> = {
  'no-source': { title: '没有可预览的入口', description: '这个资源没有可用的来源。' },
  'empty-location': { title: '链接地址为空', description: '刷新这个链接来源后才能预览。' },
  'source-unavailable': { title: '文件已失效', description: '原路径已经不存在，找回文件后即可预览。' },
  'media-unavailable': { title: '桌面服务未连接', description: '预览需要桌面应用提供文件内容。' },
  'unsupported-kind': { title: '暂不支持预览', description: '可以在系统默认应用中打开这个文件。' }
}

const emptyState = computed(() => {
  const reason = target.value.emptyReason
  if (target.value.mode !== 'empty' || !reason) return null
  return emptyCopy[reason]
})

// 编码不做嗅探（超出本 task 范围），所以乱码提示对所有文本预览常驻；超限时再补一句截断说明。
const textNotice = computed(() =>
  textPreview.value?.truncated
    ? '文件过大，仅显示开头部分。非 UTF-8 编码的文件可能显示为乱码。'
    : '非 UTF-8 编码的文件可能显示为乱码。'
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
    textError.value = cause instanceof Error && cause.message.trim() ? cause.message : '读取失败，请稍后重试'
    textState.value = 'failed'
  }
}

function handleOpenChange(event: WebUiEvent<WebUiDrawer, 'open-change'>) {
  emit('update:open', event.detail.open)
}

async function handleOpenExternal() {
  const externalTarget = target.value.externalTarget
  if (!externalTarget || externalBusy.value) return
  externalBusy.value = true
  try {
    await props.openExternal(externalTarget)
  } catch (cause) {
    emit('open-failed', cause)
  } finally {
    externalBusy.value = false
  }
}
</script>

<template>
  <web-ui-drawer
    :open="open"
    :placement="placement"
    dialog-label="资源预览"
    draggable
    controlled
    class="max-[640px]:[--wui-drawer-height:80vh] max-[640px]:[--wui-drawer-inset:0px] max-[640px]:[--wui-drawer-radius:28px_28px_0_0] max-[640px]:[--wui-drawer-header-padding:0px] [--wui-drawer-content-padding:0px] [--wui-drawer-width:max(60vw,320px)]"
    @open-change="handleOpenChange"
  >
    <div v-if="resource" slot="header" class="flex w-full min-w-0 items-center gap-2 px-4 max-[640px]:h-14">
      <h2
        class="m-0 min-w-0 flex-1 truncate text-center text-[17px] font-semibold leading-snug text-[#22212a] dark:text-(--wui-color-text)"
      >
        {{ resource.title }}
      </h2>
      <web-ui-tooltip content="在系统浏览器打开" placement="bottom">
        <web-ui-button
          v-if="target.externalTarget"
          class="shrink-0"
          icon
          variant="ghost"
          size="28"
          aria-label="在系统浏览器打开"
          :loading="externalBusy"
          @click="handleOpenExternal"
        >
          <web-ui-icon :icon="lucideExternalLink" :size="14" />
        </web-ui-button>
      </web-ui-tooltip>
    </div>

    <!--
      bottom placement 的 dialog 是 height: auto，--wui-drawer-height 只声明在 host 上不会生效，
      需要像 LibraryDetailDrawer 那样把高度落在内容层；减去移动端 header 的 h-14。

      open && resource 双重守卫：selectedResource 由行点击即赋值，而 previewOpen 仍是 false，
      此时 dialog 是 display:none。只按 resource 守卫会让 img/video/iframe 挂在隐藏 dialog 里
      后台加载（外站、Range 媒体、文本 fetch），视频关闭后还会继续出声；加上 open 让媒体元素
      随关闭一并卸载。
    -->
    <div
      v-if="open && resource"
      class="grid h-full min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden max-[640px]:h-[calc(var(--wui-drawer-height)-56px)]"
    >
      <div v-if="emptyState" class="grid min-h-0 place-items-center overflow-y-auto p-5">
        <web-ui-empty size="large" :title="emptyState.title" :description="emptyState.description">
          <web-ui-icon slot="icon" :icon="resourceIcon(resource.kind)" :size="40" />
        </web-ui-empty>
      </div>

      <div
        v-else-if="target.mode === 'image'"
        class="grid min-h-0 grid-rows-[minmax(0,1fr)] place-items-center overflow-auto p-3"
      >
        <web-ui-empty v-if="imageFailed" size="large" title="无法显示这张图片" description="文件可能已被移动或删除。">
          <web-ui-icon slot="icon" :icon="resourceIcon(resource.kind)" :size="40" />
        </web-ui-empty>
        <img
          v-else
          :key="mediaKey"
          :src="target.mediaUrl ?? undefined"
          class="max-h-full max-w-full object-contain"
          :alt="resource.title"
          @error="imageFailed = true"
        />
      </div>

      <div
        v-else-if="target.mode === 'video'"
        class="grid min-h-0 grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden p-3"
      >
        <web-ui-empty
          v-if="videoFailed"
          size="large"
          title="无法播放这个视频"
          description="文件可能已被移动，或编码不受支持。"
        >
          <web-ui-icon slot="icon" :icon="resourceIcon(resource.kind)" :size="40" />
        </web-ui-empty>
        <video
          v-else
          :key="mediaKey"
          :src="target.mediaUrl ?? undefined"
          class="max-h-full max-w-full bg-black object-contain"
          controls
          playsinline
          preload="metadata"
          @error="videoFailed = true"
        ></video>
      </div>

      <div v-else-if="target.mode === 'text'" class="grid min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden">
        <div v-if="textState === 'loading'" class="grid min-h-0 place-items-center" role="status">
          <web-ui-spinner :size="28" />
        </div>
        <web-ui-empty v-else-if="textState === 'failed'" size="large" title="无法读取这个文件" :description="textError">
          <web-ui-icon slot="icon" :icon="resourceIcon(resource.kind)" :size="40" />
        </web-ui-empty>
        <div v-else-if="textPreview" class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <p
            class="m-0 border-b border-black/6 px-4 py-2 text-xs text-(--wui-color-text-secondary) dark:border-white/8"
          >
            {{ textNotice }}
          </p>
          <pre class="m-0 overflow-auto p-4 font-mono text-xs leading-5 whitespace-pre-wrap wrap-break-word">{{
            textPreview.text
          }}</pre>
        </div>
      </div>

      <!--
        allow-same-origin 是刻意保留的：去掉后 iframe 落在 opaque origin 上，大量真实站点
        （读自身 cookie/localStorage、按同源规则发请求）会直接失效，与「预览网页」的目的相悖。
        已知残余风险：与 app 同源的已存 URL 会在同源权限下运行，行为与跨源页面不同；
        本仓无 CSP/frame 限制，被 X-Frame-Options 拦截的站点由常驻外跳按钮兜底。
        该取舍经 Manager checkpoint 批准后留档于此。
      -->
      <iframe
        v-else-if="target.mode === 'url'"
        :key="mediaKey"
        class="size-full border-0 bg-white"
        :src="target.source?.location ?? undefined"
        :title="`${resource.title} 网页预览`"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerpolicy="no-referrer"
      ></iframe>
    </div>
  </web-ui-drawer>
</template>
