<script setup lang="ts">
import type { Item } from '@api/models'
import { lucideFileText, lucideFilm, lucideGlobe, lucideImage, lucideMusic, lucidePackage } from '@greypan/web-ui/icons'
import { computed } from 'vue'

const props = defineProps<{
  item: Item
  mediaUrl: string
  selected: boolean
}>()

const emit = defineEmits<{ select: [id: string] }>()

const isImage = computed(() => props.item.mime.startsWith('image/'))
const isVideo = computed(() => props.item.mime.startsWith('video/'))
const isAudio = computed(() => props.item.mime.startsWith('audio/'))
const isText = computed(
  () =>
    props.item.mime.startsWith('text/') ||
    props.item.mime === 'application/json' ||
    props.item.mime === 'application/xml'
)

const kindIcon = computed(() => {
  if (props.item.kind === 'url') return lucideGlobe
  if (isImage.value) return lucideImage
  if (isVideo.value) return lucideFilm
  if (isAudio.value) return lucideMusic
  if (isText.value) return lucideFileText
  return lucidePackage
})
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-[var(--wui-color-surface)] text-left transition-colors hover:border-[var(--wui-color-primary)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wui-color-primary)]"
    :class="selected ? 'border-[var(--wui-color-primary)]' : 'border-[var(--wui-color-border)]'"
    @click="emit('select', item.id)"
    @keydown.enter="emit('select', item.id)"
    @keydown.space.prevent="emit('select', item.id)"
  >
    <div class="flex h-28 items-center justify-center overflow-hidden bg-black/10">
      <img
        v-if="isImage && item.status === 'ok'"
        :src="mediaUrl + item.id"
        class="h-full w-full object-contain"
        :alt="item.name"
      />
      <video
        v-else-if="isVideo && item.status === 'ok'"
        :src="mediaUrl + item.id"
        class="h-full w-full object-contain"
        muted
        preload="metadata"
      />
      <web-ui-icon v-else :icon="kindIcon" :size="32" class="opacity-70" />
    </div>
    <div class="flex flex-col gap-0.5 p-2">
      <span class="truncate text-xs font-medium" :title="item.name">{{ item.name }}</span>
      <span class="flex flex-wrap gap-1">
        <span
          v-for="tag in item.tags.slice(0, 3)"
          :key="tag.id"
          class="rounded bg-[var(--wui-color-primary)]/10 px-1 text-[10px] text-[var(--wui-color-primary)]"
        >
          {{ tag.path }}
        </span>
      </span>
      <span v-if="item.status === 'broken'" class="text-[10px] text-[var(--wui-color-danger)]">断链</span>
    </div>
  </div>
</template>
