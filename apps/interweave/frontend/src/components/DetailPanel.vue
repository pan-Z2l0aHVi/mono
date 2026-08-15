<script setup lang="ts">
import type { Item } from '@api/models'
import { lucideExternalLink, lucideFolderOpen, lucidePencil, lucideTrash2, lucideX } from '@greypan/web-ui/icons'
import { computed, ref } from 'vue'

import { useLibraryStore } from '@/stores/library'

const props = defineProps<{
  item: Item
  mediaUrl: string
}>()

const library = useLibraryStore()
const tagInput = ref('')
const nameEditing = ref(false)
const nameDraft = ref('')

const isImage = computed(() => props.item.mime.startsWith('image/'))
const isVideo = computed(() => props.item.mime.startsWith('video/'))
const isAudio = computed(() => props.item.mime.startsWith('audio/'))
const isText = computed(
  () =>
    props.item.mime.startsWith('text/') ||
    props.item.mime === 'application/json' ||
    props.item.mime === 'application/xml'
)
const canPreview = computed(
  () =>
    (isImage.value || isVideo.value || isAudio.value || isText.value) &&
    props.item.status === 'ok' &&
    props.item.kind === 'file'
)

const sizeLabel = computed(() => {
  const s = props.item.size
  if (s >= 1024 * 1024 * 1024) return `${(s / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (s >= 1024 * 1024) return `${(s / (1024 * 1024)).toFixed(1)} MB`
  if (s >= 1024) return `${(s / 1024).toFixed(1)} KB`
  return `${s} B`
})

const durationLabel = computed(() => {
  const ms = props.item.durationMs
  if (!ms) return ''
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
})

function addTags() {
  const paths = tagInput.value
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
  if (!paths.length) return
  void library.setTags(props.item.id, [...props.item.tags.map(t => t.path), ...paths])
  tagInput.value = ''
}

function removeTag(path: string) {
  void library.setTags(
    props.item.id,
    props.item.tags.filter(t => t.path !== path).map(t => t.path)
  )
}

function startRename() {
  nameDraft.value = props.item.name
  nameEditing.value = true
}

function commitRename() {
  if (nameDraft.value.trim() && nameDraft.value.trim() !== props.item.name) {
    void library.rename(props.item.id, nameDraft.value.trim())
  }
  nameEditing.value = false
}

function onTagInput(e: Event) {
  tagInput.value = (e.target as HTMLElement & { value: string }).value
}

function onNameDraftInput(e: Event) {
  nameDraft.value = (e.target as HTMLElement & { value: string }).value
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString()
}
</script>

<template>
  <div class="flex min-h-0 flex-col gap-3 overflow-y-auto p-4">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <div v-if="!nameEditing" class="flex items-center gap-1">
          <span class="truncate text-sm font-semibold" :title="item.name">{{ item.name }}</span>
          <web-ui-button icon variant="ghost" aria-label="重命名" @click="startRename">
            <web-ui-icon :icon="lucidePencil" :size="14" />
          </web-ui-button>
        </div>
        <web-ui-input
          v-else
          :value="nameDraft"
          placeholder="新名称"
          full
          @input="onNameDraftInput"
          @change="commitRename"
          @keyup.enter="commitRename"
        />
        <span class="text-xs text-[var(--wui-color-text-muted)]">{{ item.kind === 'url' ? '链接' : '文件' }}</span>
        <span v-if="item.status === 'broken'" class="ml-1 text-xs text-[var(--wui-color-danger)]">断链</span>
      </div>
      <div class="flex shrink-0 gap-1">
        <web-ui-button variant="ghost" @click="library.reveal(item.id)">
          <web-ui-icon :icon="lucideFolderOpen" :size="14" slot="prefix" />
          定位
        </web-ui-button>
        <web-ui-button variant="ghost" @click="library.open(item.id)">
          <web-ui-icon :icon="lucideExternalLink" :size="14" slot="prefix" />
          打开
        </web-ui-button>
        <web-ui-button variant="danger" @click="library.remove([item.id])">
          <web-ui-icon :icon="lucideTrash2" :size="14" slot="prefix" />
          移除
        </web-ui-button>
      </div>
    </div>

    <div
      v-if="canPreview"
      class="flex max-h-56 items-center justify-center overflow-hidden rounded-lg border border-[var(--wui-color-border)] bg-black/10"
    >
      <img v-if="isImage" :src="mediaUrl + item.id" class="max-h-56 object-contain" :alt="item.name" />
      <video v-else-if="isVideo" :src="mediaUrl + item.id" controls class="max-h-56 w-full" />
      <audio v-else-if="isAudio" :src="mediaUrl + item.id" controls class="w-full px-2 py-4" />
      <iframe v-else-if="isText" :src="mediaUrl + item.id" class="h-48 w-full bg-white text-black" />
    </div>

    <dl class="flex flex-col gap-1 text-xs">
      <div class="flex justify-between gap-2">
        <dt class="text-[var(--wui-color-text-muted)]">路径</dt>
        <dd class="truncate text-right" :title="item.locator">{{ item.locator }}</dd>
      </div>
      <div v-if="item.size" class="flex justify-between gap-2">
        <dt class="text-[var(--wui-color-text-muted)]">大小</dt>
        <dd>{{ sizeLabel }}</dd>
      </div>
      <div v-if="item.mime" class="flex justify-between gap-2">
        <dt class="text-[var(--wui-color-text-muted)]">类型</dt>
        <dd>{{ item.mime }}</dd>
      </div>
      <div v-if="item.width && item.height" class="flex justify-between gap-2">
        <dt class="text-[var(--wui-color-text-muted)]">尺寸</dt>
        <dd>{{ item.width }} × {{ item.height }}</dd>
      </div>
      <div v-if="durationLabel" class="flex justify-between gap-2">
        <dt class="text-[var(--wui-color-text-muted)]">时长</dt>
        <dd>{{ durationLabel }}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt class="text-[var(--wui-color-text-muted)]">入库时间</dt>
        <dd>{{ formatTime(item.createdAt) }}</dd>
      </div>
    </dl>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium text-[var(--wui-color-text-muted)]">标签</span>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="tag in item.tags"
          :key="tag.id"
          class="flex items-center gap-0.5 rounded bg-[var(--wui-color-primary)]/10 px-1.5 py-0.5 text-xs text-[var(--wui-color-primary)]"
        >
          {{ tag.path }}
          <web-ui-button icon variant="ghost" aria-label="移除标签" @click="removeTag(tag.path)">
            <web-ui-icon :icon="lucideX" :size="12" />
          </web-ui-button>
        </span>
        <span v-if="!item.tags.length" class="text-xs text-[var(--wui-color-text-muted)]">无标签</span>
      </div>
      <div class="flex items-center gap-1">
        <web-ui-input
          :value="tagInput"
          placeholder="输入标签路径，逗号分隔"
          full
          @input="onTagInput"
          @keyup.enter="addTags"
        />
        <web-ui-button @click="addTags">添加</web-ui-button>
      </div>
    </div>
  </div>
</template>
