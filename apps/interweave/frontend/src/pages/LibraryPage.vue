<script setup lang="ts">
import { lucideFolder, lucideGlobe, lucidePlus } from '@greypan/web-ui/icons'
import { Events } from '@wailsio/runtime'
import { computed, onMounted, ref } from 'vue'

import DetailPanel from '@/components/DetailPanel.vue'
import ItemCard from '@/components/ItemCard.vue'
import { extractFilePaths, useLibraryStore } from '@/stores/library'
import { useSettingsStore } from '@/stores/settings'

const library = useLibraryStore()
const settings = useSettingsStore()

const urlOpen = ref(false)
const urlInput = ref('')
const dragOver = ref(false)

const mediaUrl = computed(() => settings.settings?.mediaUrl ?? '')

async function submitUrl() {
  await library.addUrl(urlInput.value)
  urlInput.value = ''
  urlOpen.value = false
}

function onKindChange(e: Event) {
  library.kind = (e.target as HTMLElement & { value: string }).value
  void library.load()
}

function onStatusChange(e: Event) {
  library.status = (e.target as HTMLElement & { value: string }).value
  void library.load()
}

function onUrlInput(e: Event) {
  urlInput.value = (e.target as HTMLElement & { value: string }).value
}

function onDrop(data: unknown) {
  const paths = extractFilePaths(data)
  if (paths.length) void library.addFiles(paths)
}

function onDrawerOpenChange(e: CustomEvent<{ open: boolean }>) {
  if (!e.detail.open) library.selectedId = ''
}

onMounted(() => {
  void settings.load()
  Events.On('common:WindowFilesDropped', ev => onDrop(ev.data))
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- 工具栏 -->
    <div class="flex shrink-0 items-center gap-2 border-b border-[var(--wui-color-border)] px-3 py-2">
      <web-ui-button variant="primary" :loading="library.addBusy" @click="library.pickAndAddFiles()">
        <web-ui-icon :icon="lucidePlus" :size="14" slot="prefix" />
        添加文件
      </web-ui-button>
      <web-ui-button :loading="library.addBusy" @click="library.pickAndAddFolder()">
        <web-ui-icon :icon="lucideFolder" :size="14" slot="prefix" />
        添加文件夹
      </web-ui-button>
      <web-ui-button @click="urlOpen = !urlOpen">
        <web-ui-icon :icon="lucideGlobe" :size="14" slot="prefix" />
        添加链接
      </web-ui-button>
      <div v-if="urlOpen" class="flex items-center gap-1">
        <web-ui-input
          :value="urlInput"
          type="url"
          placeholder="https://…"
          @input="onUrlInput"
          @keyup.enter="submitUrl"
        />
        <web-ui-button variant="primary" @click="submitUrl">确定</web-ui-button>
      </div>
      <div class="flex-1" />
      <web-ui-select :value="library.kind" aria-label="类型过滤" @change="onKindChange">
        <web-ui-option value="">全部类型</web-ui-option>
        <web-ui-option value="file">文件</web-ui-option>
        <web-ui-option value="url">链接</web-ui-option>
      </web-ui-select>
      <web-ui-select :value="library.status" aria-label="状态过滤" @change="onStatusChange">
        <web-ui-option value="">全部状态</web-ui-option>
        <web-ui-option value="ok">正常</web-ui-option>
        <web-ui-option value="broken">断链</web-ui-option>
      </web-ui-select>
    </div>

    <!-- 条目区（含拖放目标） -->
    <section
      class="relative flex min-h-0 flex-1 flex-col"
      data-file-drop-target
      @dragenter.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="dragOver = false"
    >
      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <div v-if="library.loading" class="flex justify-center py-10 text-sm text-[var(--wui-color-text-muted)]">
          加载中…
        </div>
        <div
          v-else-if="!library.items.length"
          class="flex justify-center py-16 text-sm text-[var(--wui-color-text-muted)]"
        >
          <p>没有条目。点击「添加文件 / 添加文件夹」或直接把文件拖入窗口。</p>
        </div>
        <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          <ItemCard
            v-for="item in library.items"
            :key="item.id"
            :item="item"
            :media-url="mediaUrl"
            :selected="item.id === library.selectedId"
            @select="library.select"
          />
        </div>
      </div>

      <!-- 拖放遮罩 -->
      <div
        v-if="dragOver"
        class="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--wui-color-primary)] bg-[var(--wui-color-surface)]/80 text-[var(--wui-color-primary)]"
      >
        松开以添加文件
      </div>
    </section>

    <!-- 详情抽屉：仅选中条目时打开 -->
    <web-ui-drawer
      :open="!!library.selected"
      placement="right"
      heading="条目详情"
      closable
      @open-change="onDrawerOpenChange"
    >
      <DetailPanel v-if="library.selected" :item="library.selected" :media-url="mediaUrl" />
    </web-ui-drawer>
  </div>
</template>
