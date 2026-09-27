<script setup lang="ts">
import type { WebUiContextMenu, WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import {
  lucideClapperboard,
  lucideCode,
  lucideEye,
  lucideExternalLink,
  lucideFile,
  lucideFileText,
  lucideFilm,
  lucideGlobe,
  lucideHeadphones,
  lucideImage,
  lucideMusic,
  lucidePenLine,
  lucidePlay,
  lucideRefreshCw,
  lucideTags,
  lucideTrash2
} from '@greypan/web-ui/icons'
import { computed, nextTick, onMounted, onScopeDispose, ref } from 'vue'

import type { ResourceKind, ResourceSourceView, ResourceView } from '@/stores/library'

import LibraryResourceRow from './LibraryResourceRow.vue'
import type { NameEditorRef } from './rename'

const props = defineProps<{
  resources: ResourceView[]
  activeResourceId: string | null
  checkedIds: string[]
  selectionMode: boolean
  editingNameKey: string | null
  editorRef: (id: string) => NameEditorRef
  loading: boolean
  runtimeAvailable: boolean
  emptyDescription: string
  mediaUrlFor: (sourceId: string) => string | null
}>()

const emit = defineEmits<{
  select: [resource: ResourceView]
  preview: [resource: ResourceView]
  startRename: [resource: ResourceView]
  editTags: [resource: ResourceView]
  delete: [resource: ResourceView]
  recover: [source: ResourceSourceView]
  toggle: [resourceId: string]
  renameChange: [resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>]
  cancelRename: []
}>()

const contextMenuRef = ref<WebUiContextMenu>()
const contextResource = ref<ResourceView | null>(null)
const hoveredResourceId = ref<string | null>(null)
const emptyTitle = computed(() => (props.runtimeAvailable ? '资源库为空' : '桌面服务未连接'))

/*
 * hover 态按当前可见项解析：行重渲染时指针没动，mouseleave 不会补发，直接读 id 可能
 * 命中已经被过滤掉的行。
 */
const hoveredResource = computed(
  () => props.resources.find(resource => resource.id === hoveredResourceId.value) ?? null
)
// 滚动停下来到用户按下空格之间的静默窗口：惯性尾段里的 keydown 不该被当成预览意图。
const SCROLL_IDLE_MS = 150
let scrolling = false
let scrollIdleTimer: ReturnType<typeof setTimeout> | null = null

function handleHover(resource: ResourceView, hovered: boolean) {
  hoveredResourceId.value = hovered ? resource.id : null
}

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

/*
 * 走 composedPath 而不是 event.target：监听器在 window 上，而输入控件都封在 web-ui 的
 * shadow 里（input 的 <input>、editable-text 的编辑层 <textarea>）。这些 keydown 是
 * composed 的，冒到 window 时 event.target 已被 retarget 成 shadow host，host 上的
 * closest() 又不跨 shadow 边界——判据会漏掉真正的编辑控件，于是搜索框、行内改名里打的
 * 空格被本功能吃掉，冒泡到 window 前没人拦截。composedPath() 给出完整传播链。
 */
function isEditableEventTarget(event: Event) {
  return event
    .composedPath()
    .some(node => node instanceof HTMLElement && (node.isContentEditable || node.matches(EDITABLE_SELECTOR)))
}

function markScrolling() {
  scrolling = true
  if (scrollIdleTimer) clearTimeout(scrollIdleTimer)
  scrollIdleTimer = setTimeout(() => {
    scrolling = false
  }, SCROLL_IDLE_MS)
}

/*
 * hover 行 + 空格预览（#187）。
 *
 * 行的键盘可达性不在本 issue 范围内，这里按已确认的决定做成纯鼠标的隐藏入口，所以拦截
 * 范围收在「本列表当前有 hover 行」这一个条件上：鼠标不在行上时空格照常滚页面，修饰键
 * （含 Shift+Space 这个「向上滚一屏」的常规手势）、编辑控件和列表滚动中都不接管。
 */
function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key !== ' ' || event.repeat) return
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  if (scrolling || isEditableEventTarget(event)) return
  const hovered = hoveredResource.value
  if (!hovered) return
  event.preventDefault()
  handlePreview(hovered)
}

const openWithApps: Partial<Record<ResourceKind, Array<{ label: string; icon: typeof lucideEye }>>> = {
  image: [
    { label: '预览', icon: lucideEye },
    { label: '看图', icon: lucideImage }
  ],
  video: [
    { label: '视频播放器', icon: lucidePlay },
    { label: 'iMovie', icon: lucideClapperboard }
  ],
  audio: [
    { label: '音乐播放器', icon: lucideMusic },
    { label: 'GarageBand', icon: lucideHeadphones }
  ],
  document: [
    { label: '文本编辑', icon: lucideFileText },
    { label: 'Notion', icon: lucidePenLine }
  ],
  json: [{ label: 'VS Code', icon: lucideCode }],
  web: [
    { label: 'Safari', icon: lucideGlobe },
    { label: 'Chrome', icon: lucideGlobe }
  ],
  file: [{ label: '系统文件', icon: lucideFile }]
}

async function openContextMenu(resource: ResourceView, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  // 菜单浮起后指针已经不在行上：hover 态一起作废，否则空格会从菜单背后再开一次预览。
  hoveredResourceId.value = null
  contextResource.value = resource
  await nextTick()
  contextMenuRef.value?.openAt(event.clientX, event.clientY)
}

function closeContextMenu() {
  contextMenuRef.value?.close()
}

function contextUnavailableSource(resource: ResourceView | null) {
  return resource?.sources.find(source => !source.available) ?? null
}

function handleStartRename(resource: ResourceView | null) {
  if (resource) emit('startRename', resource)
  closeContextMenu()
}

function handleTags(resource: ResourceView | null) {
  if (resource) emit('editTags', resource)
  closeContextMenu()
}

function handleDelete(resource: ResourceView | null) {
  if (resource) emit('delete', resource)
  closeContextMenu()
}

function handlePreview(resource: ResourceView | null) {
  if (resource) emit('preview', resource)
  closeContextMenu()
}

function handleRecover(source: ResourceSourceView | null) {
  if (source) emit('recover', source)
  closeContextMenu()
}

function editorRefFor(id: string) {
  return props.editorRef(id)
}

function handleRenameChange(resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>) {
  emit('renameChange', resource, event)
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
  // scroll 不冒泡，只能在 window 上按捕获阶段收：滚的是列表容器还是页面都算数。
  window.addEventListener('scroll', markScrolling, { capture: true, passive: true })
})

onScopeDispose(() => {
  window.removeEventListener('keydown', handleWindowKeydown)
  window.removeEventListener('scroll', markScrolling, { capture: true })
  if (scrollIdleTimer) clearTimeout(scrollIdleTimer)
})
</script>

<template>
  <!--
    disabled 绑在「没有条目」上，而不是绑在右键来源上：context-menu 自己监听宿主的
    contextmenu，列表为空时那块空态区域仍在这个宿主里，右键照样命中。不禁用的话会弹出
    一张 contextResource 为 null 的菜单——只剩一条分隔线加一个空「删除」项。禁用后
    事件在组件内被 return 掉，浏览器原生菜单正常出现。
  -->
  <web-ui-context-menu ref="contextMenuRef" :disabled="resources.length === 0" class="block w-full">
    <div v-if="loading" class="grid min-h-64 place-items-center" aria-live="polite">
      <div class="grid justify-items-center gap-3 text-sm text-(--wui-color-text-secondary)">
        <web-ui-spinner :size="28" />
        <span>正在载入资源库</span>
      </div>
    </div>

    <div v-else-if="resources.length === 0" class="flex flex-col items-center justify-center py-24">
      <web-ui-empty size="large" :title="emptyTitle" :description="emptyDescription" />
    </div>

    <div v-else class="w-full h-full select-none">
      <LibraryResourceRow
        v-for="resource in resources"
        :key="resource.id"
        :resource="resource"
        :media-url="resource.preferred ? mediaUrlFor(resource.preferred.id) : null"
        :active="!selectionMode && activeResourceId === resource.id"
        :checked="checkedIds.includes(resource.id)"
        :selection-mode="selectionMode"
        :editing-name-key="editingNameKey"
        :editor-ref="editorRefFor(resource.id)"
        @select="emit('select', $event)"
        @contextmenu="openContextMenu"
        @hover="handleHover"
        @toggle="emit('toggle', $event)"
        @rename-change="handleRenameChange"
        @cancel-rename="emit('cancelRename')"
      />
    </div>

    <web-ui-dropdown-item v-if="contextResource?.available" @click="handlePreview(contextResource)">
      <web-ui-icon slot="prefix" :icon="lucideEye" :size="14" />
      预览
    </web-ui-dropdown-item>
    <web-ui-dropdown-item v-if="contextResource?.available" submenu>
      <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
      打开方式
      <web-ui-dropdown-item>
        <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
        系统默认应用
      </web-ui-dropdown-item>
      <web-ui-dropdown-item
        v-for="app in contextResource ? (openWithApps[contextResource.kind] ?? []) : []"
        :key="app.label"
      >
        <web-ui-icon slot="prefix" :icon="app.icon" :size="14" />
        {{ app.label }}
      </web-ui-dropdown-item>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item v-if="contextResource" @click="handleStartRename(contextResource)">
      <web-ui-icon slot="prefix" :icon="lucidePenLine" :size="14" />
      重命名
    </web-ui-dropdown-item>
    <web-ui-dropdown-item
      v-if="contextResource && !contextResource.available && contextUnavailableSource(contextResource)"
      @click="handleRecover(contextUnavailableSource(contextResource))"
    >
      <web-ui-icon slot="prefix" :icon="lucideRefreshCw" :size="14" />
      找回资源
    </web-ui-dropdown-item>
    <web-ui-dropdown-item v-if="contextResource?.available" @click="handleTags(contextResource)">
      <web-ui-icon slot="prefix" :icon="lucideTags" :size="14" />
      编辑标签
    </web-ui-dropdown-item>
    <web-ui-dropdown-divider />
    <web-ui-dropdown-item style="color: var(--wui-color-danger, #ef4444)" @click="handleDelete(contextResource)">
      <web-ui-icon slot="prefix" :icon="lucideTrash2" :size="14" class="text-(--wui-color-danger,#ef4444)" />
      删除
    </web-ui-dropdown-item>
  </web-ui-context-menu>
</template>
