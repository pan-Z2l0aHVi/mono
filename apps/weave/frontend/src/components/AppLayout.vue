<script setup lang="ts">
import {
  lucideInbox,
  lucideLayoutGrid,
  lucideSearch,
  lucideSettings,
  lucideTags,
  lucideWrench
} from '@greypan/web-ui/icons'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

import TagTreeNode from '@/components/TagTreeNode.vue'
import { subscribeWeaveEvents } from '@/stores'
import { useLibraryStore } from '@/stores/library'
import { useRepairStore } from '@/stores/repair'
import { useTagsStore } from '@/stores/tags'

const library = useLibraryStore()
const tags = useTagsStore()
const repair = useRepairStore()

const syncing = computed(() => library.loading || tags.loading || repair.loading)

const expanded = ref(new Set<string>())

function toggleExpand(path: string) {
  const next = new Set(expanded.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  expanded.value = next
}

function selectTag(path: string) {
  tags.selectedPath = path
  library.tagPath = path
  void library.load()
}

function clearTag() {
  tags.selectedPath = ''
  library.tagPath = ''
  void library.load()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
function onSearchInput(e: Event) {
  library.search = (e.target as HTMLElement & { value: string }).value
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void library.load(), 250)
}

onMounted(() => {
  subscribeWeaveEvents()
  void tags.load()
  void repair.load()
  void library.load()
})
</script>

<template>
  <web-ui-layout>
    <div slot="sidebar" class="flex h-full flex-col gap-3 p-3">
      <div class="flex items-center gap-2 px-2 py-1">
        <web-ui-icon :icon="lucideInbox" :size="20" />
        <span class="text-base font-semibold tracking-wide">Weave</span>
      </div>

      <nav class="flex flex-col gap-1">
        <RouterLink
          to="/library"
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-sm text-[var(--wui-color-text-muted)] hover:bg-[var(--wui-color-hover)] hover:text-[var(--wui-color-text)]"
          active-class="bg-[var(--wui-color-primary)]/10 !text-[var(--wui-color-primary)]"
        >
          <web-ui-icon :icon="lucideLayoutGrid" :size="16" />
          <span>库</span>
        </RouterLink>
        <RouterLink
          to="/tags"
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-sm text-[var(--wui-color-text-muted)] hover:bg-[var(--wui-color-hover)] hover:text-[var(--wui-color-text)]"
          active-class="bg-[var(--wui-color-primary)]/10 !text-[var(--wui-color-primary)]"
        >
          <web-ui-icon :icon="lucideTags" :size="16" />
          <span>标签</span>
        </RouterLink>
        <RouterLink
          to="/repair"
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-sm text-[var(--wui-color-text-muted)] hover:bg-[var(--wui-color-hover)] hover:text-[var(--wui-color-text)]"
          active-class="bg-[var(--wui-color-primary)]/10 !text-[var(--wui-color-primary)]"
        >
          <web-ui-icon :icon="lucideWrench" :size="16" />
          <span>修复中心</span>
          <span
            v-if="repair.openCount > 0"
            class="ml-auto inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--wui-color-danger)] px-1 text-[10px] leading-4 text-white"
          >
            {{ repair.openCount }}
          </span>
        </RouterLink>
        <RouterLink
          to="/settings"
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-sm text-[var(--wui-color-text-muted)] hover:bg-[var(--wui-color-hover)] hover:text-[var(--wui-color-text)]"
          active-class="bg-[var(--wui-color-primary)]/10 !text-[var(--wui-color-primary)]"
        >
          <web-ui-icon :icon="lucideSettings" :size="16" />
          <span>设置</span>
        </RouterLink>
      </nav>

      <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pt-1">
        <web-ui-input :value="library.search" placeholder="搜索名称…" clearable full @input="onSearchInput">
          <web-ui-icon slot="prefix" :icon="lucideSearch" :size="14" />
        </web-ui-input>
        <web-ui-button variant="ghost" full @click="clearTag">
          <web-ui-icon :icon="lucideInbox" :size="14" slot="prefix" />
          全部条目
        </web-ui-button>
        <TagTreeNode
          v-for="tag in tags.tree"
          :key="tag.id"
          :tag="tag"
          :depth="0"
          :selected-path="library.tagPath"
          :expanded="expanded"
          @select="selectTag"
          @toggle="toggleExpand"
        />
      </div>
    </div>

    <div slot="header" class="flex h-full items-center justify-end gap-3 px-4">
      <span v-if="syncing" class="text-xs text-[var(--wui-color-text-muted)]">同步中…</span>
    </div>

    <RouterView />
  </web-ui-layout>
</template>
