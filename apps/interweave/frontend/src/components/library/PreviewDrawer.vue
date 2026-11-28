<script setup lang="ts">
import type { WebUiDrawer, WebUiEvent } from '@greypan/web-ui'
import { lucideArrowRight, lucideExternalLink, lucideInfo } from '@greypan/web-ui/icons'
import { computed, onBeforeUnmount } from 'vue'

import ConvergeButton from '@/components/ConvergeButton.vue'
import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { resourceIcon, unavailableResourceIcon } from './presentation'
import PreviewCode from './PreviewCode.vue'
import PreviewImage from './PreviewImage.vue'
import PreviewMarkdown from './PreviewMarkdown.vue'
import { createPreviewSession } from './previewSession'

const props = defineProps<{
  open: boolean
  resource: ResourceView | null
  mobile: boolean
  /** markdown 链接点击的出口：交系统浏览器打开（WebView 不自行导航）。 */
  openExternal: (target: string) => Promise<void>
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; recover: [source: ResourceSourceView] }>()

const placement = computed(() => (props.mobile ? 'bottom' : 'right'))
const session = createPreviewSession(
  {
    open: () => props.open,
    resource: () => props.resource
  },
  {
    openExternal: target => props.openExternal(target)
  }
)
const state = session.state
const isDocumentMode = computed(
  () => state.value.kind === 'text' || state.value.kind === 'markdown' || state.value.kind === 'code'
)

onBeforeUnmount(() => session.dispose())

function handleOpenChange(event: WebUiEvent<WebUiDrawer, 'open-change'>) {
  emit('update:open', event.detail.open)
}

function handleMediaLoaded(mediaKey: string, event: Event) {
  session.onMediaLoaded(mediaKey)
  const element = event.target
  if (element instanceof HTMLMediaElement && element.paused) {
    void element.play?.().catch(() => {})
  }
}

function handleVideoMetadata(mediaKey: string, event: Event) {
  const video = event.target as HTMLVideoElement
  session.onVideoMetadata(mediaKey, video.videoWidth, video.videoHeight)
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
    :drag-handle-only="!mobile"
    fullable
    controlled
    class="mobile:[--wui-drawer-height:80vh] mobile:[--wui-drawer-inset:0px] mobile:[--wui-drawer-radius:28px_28px_0_0] [--wui-drawer-width:max(60vw,320px)] [--wui-drawer-content-padding:0px] [--wui-empty-padding:0px] [--wui-drawer-drag-zone-size:32px]"
    @open-change="handleOpenChange"
  >
    <!--
      open && resource 双重守卫：selectedResource 由行点击即赋值，而 previewOpen 仍是 false，
      此时 dialog 是 display:none。加上 state.kind !== 'closed' && resource 让媒体元素随关闭一并卸载。
    -->
    <div
      v-if="state.kind !== 'closed' && resource"
      class="min-h-0 rounded-[var(--wui-drawer-radius,28px)]"
      :class="
        isDocumentMode
          ? 'min-h-full w-full'
          : 'grid h-full w-full grid-rows-[minmax(0,1fr)] overflow-hidden mobile:h-(--wui-drawer-height)'
      "
    >
      <div v-if="state.kind === 'empty'" class="min-h-0 overflow-y-auto">
        <div class="grid min-h-full place-items-center">
          <web-ui-empty :size="72" :title="state.title" :description="state.description">
            <web-ui-icon
              slot="icon"
              :icon="
                !resource.available || state.reason === 'source-unavailable'
                  ? unavailableResourceIcon(resource.kind, state.source)
                  : resourceIcon(resource.kind)
              "
              :size="40"
            />
            <ConvergeButton
              v-if="state.canRecover && state.source"
              slot="action"
              variant="primary"
              @click="emit('recover', state.source)"
            >
              <template #suffix>
                <web-ui-icon :icon="lucideArrowRight" :size="16" />
              </template>
              找回资源
            </ConvergeButton>
            <ConvergeButton
              v-else-if="state.canOpenExternal && state.externalTarget"
              slot="action"
              variant="primary"
              @click="openExternal(state.externalTarget)"
            >
              <template #suffix>
                <web-ui-icon :icon="lucideArrowRight" :size="16" />
              </template>
              在浏览器中打开
            </ConvergeButton>
          </web-ui-empty>
        </div>
      </div>

      <div v-else-if="state.kind === 'image'" class="relative min-h-0 overflow-hidden">
        <web-ui-empty
          v-if="state.status === 'failed'"
          :size="72"
          title="无法显示这张图片"
          description="文件可能已被移动或删除。"
        >
          <web-ui-icon slot="icon" :icon="unavailableResourceIcon(resource.kind, session.source.value)" :size="40" />
        </web-ui-empty>
        <PreviewImage
          v-else
          :key="state.mediaKey"
          :src="state.src"
          :alt="resource.title"
          :class="{ invisible: state.status === 'loading' }"
          @load="session.onMediaLoaded(state.mediaKey)"
          @error="session.onMediaError(state.mediaKey)"
        />
        <div
          v-if="state.status === 'loading'"
          class="absolute inset-0 grid place-items-center"
          role="status"
          aria-label="正在加载预览"
        >
          <web-ui-spinner :size="28" />
        </div>
      </div>

      <div v-else-if="state.kind === 'video'" class="relative min-h-0 overflow-hidden">
        <div class="relative grid size-full place-items-center overflow-hidden">
          <web-ui-empty
            v-if="state.status === 'failed'"
            :size="72"
            title="无法播放这个视频"
            description="文件可能已被移动，或暂时无法显示。"
          >
            <web-ui-icon slot="icon" :icon="unavailableResourceIcon(resource.kind, session.source.value)" :size="40" />
          </web-ui-empty>
          <video
            v-else
            :key="state.mediaKey"
            :src="state.src || undefined"
            :class="[state.portrait ? 'h-full w-auto' : 'h-auto w-full', { invisible: state.status === 'loading' }]"
            class="absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 bg-black"
            controls
            autoplay
            playsinline
            preload="auto"
            @loadedmetadata="handleVideoMetadata(state.mediaKey, $event)"
            @loadeddata="handleMediaLoaded(state.mediaKey, $event)"
            @error="session.onMediaError(state.mediaKey)"
          ></video>
          <div
            v-if="state.status === 'loading'"
            class="absolute inset-0 grid place-items-center"
            role="status"
            aria-label="正在加载预览"
          >
            <web-ui-spinner :size="28" />
          </div>
        </div>
      </div>

      <div v-else-if="state.kind === 'audio'" class="relative grid min-h-0 place-items-center overflow-hidden p-6">
        <web-ui-empty
          v-if="state.status === 'failed'"
          :size="72"
          title="无法播放这个音频"
          description="文件可能已被移动，或暂时无法显示。"
        >
          <web-ui-icon slot="icon" :icon="unavailableResourceIcon(resource.kind, session.source.value)" :size="40" />
        </web-ui-empty>
        <div v-else class="grid w-full max-w-md justify-items-center gap-5">
          <div
            class="grid size-24 place-items-center rounded-3xl bg-[#1b1b20]/5 text-(--wui-color-text-secondary) dark:bg-white/8"
            aria-hidden="true"
          >
            <web-ui-icon :icon="resourceIcon(resource.kind)" :size="40" />
          </div>
          <p class="m-0 max-w-full truncate text-base font-medium text-(--wui-color-text)">
            {{ resource.title }}
          </p>
          <audio
            :key="state.mediaKey"
            :src="state.src || undefined"
            class="w-full"
            :class="{ invisible: state.status === 'loading' }"
            controls
            autoplay
            preload="auto"
            @loadeddata="handleMediaLoaded(state.mediaKey, $event)"
            @error="session.onMediaError(state.mediaKey)"
          ></audio>
        </div>
        <div
          v-if="state.status === 'loading'"
          class="absolute inset-0 grid place-items-center"
          role="status"
          aria-label="正在加载预览"
        >
          <web-ui-spinner :size="28" />
        </div>
      </div>

      <div v-else-if="state.kind === 'text' || state.kind === 'markdown' || state.kind === 'code'" class="min-h-full">
        <div
          v-if="state.status === 'loading'"
          class="grid min-h-[calc(100vh-40px)] place-items-center mobile:min-h-(--wui-drawer-height)"
          role="status"
          aria-label="正在加载预览"
        >
          <web-ui-spinner :size="28" />
        </div>
        <div
          v-else-if="state.kind === 'markdown' && state.status === 'failed' && state.fallbackText !== undefined"
          class="p-4 text-sm text-(--wui-color-text-secondary)"
        >
          {{ state.error }}
        </div>
        <web-ui-empty
          v-else-if="state.status === 'failed'"
          :size="72"
          title="无法读取这个文件"
          :description="state.error"
        >
          <web-ui-icon slot="icon" :icon="resourceIcon(resource.kind)" :size="40" />
        </web-ui-empty>
        <template v-else>
          <div
            v-if="state.notice"
            role="status"
            class="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-black/6 bg-[#1b1b20]/[0.035] px-3.5 py-2.5 text-xs leading-5 text-(--wui-color-text-secondary) dark:border-white/8 dark:bg-white/[0.06]"
          >
            <web-ui-icon :icon="lucideInfo" :size="15" class="shrink-0 text-(--wui-color-text-tertiary)" />
            <span class="min-w-0">{{ state.notice }}</span>
          </div>
          <pre
            v-if="state.kind === 'text'"
            class="m-0 p-4 font-mono text-xs leading-5 whitespace-pre-wrap wrap-break-word"
            >{{ state.text }}</pre>
          <PreviewMarkdown
            v-else-if="state.kind === 'markdown'"
            :nodes="state.nodes"
            :open-link="session.openMarkdownLink"
          />
          <PreviewCode
            v-else
            :code="state.code"
            :highlighted-html="state.highlightedHtml"
            :over-highlight-limit="state.overHighlightLimit"
          />
        </template>
      </div>

      <!--
        allow-same-origin 是刻意保留的：去掉后 iframe 落在 opaque origin 上，大量真实站点
        （读自身 cookie/localStorage、按同源规则发请求）会直接失效，与「预览网页」的目的相悖。
        已知残余风险：与 app 同源的已存 URL 会在同源权限下运行，行为与跨源页面不同；
        本仓无 CSP/frame 限制，被 X-Frame-Options 拦截的站点只能由用户在浏览器里另开地址。
        该取舍经 Manager checkpoint 批准后留档于此。
      -->
      <div v-else-if="state.kind === 'url'" class="relative size-full">
        <div class="pointer-events-none absolute top-3 right-3 z-10 flex justify-end">
          <web-ui-button
            class="pointer-events-auto shadow-sm"
            size="28"
            variant="secondary"
            @click="openExternal(state.src)"
          >
            <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
            在浏览器中打开
          </web-ui-button>
        </div>
        <iframe
          :key="state.mediaKey"
          class="size-full border-0 bg-white"
          :class="{ invisible: state.status === 'loading' }"
          :src="state.src || undefined"
          :title="`${resource.title} 网页预览`"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerpolicy="no-referrer"
          @load="session.onMediaLoaded(state.mediaKey)"
        ></iframe>
        <div
          v-if="state.status === 'loading'"
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
