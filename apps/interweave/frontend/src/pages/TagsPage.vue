<script setup lang="ts">
import { lucidePlus, lucidePencil, lucideArrowUpToLine, lucideTrash2 } from '@greypan/web-ui/icons'
import { onMounted, ref } from 'vue'

import { useTagsStore } from '@/stores/tags'

const tags = useTagsStore()

const newName = ref('')
const newParent = ref('')
const renamePath = ref('')
const renameTo = ref('')
const movePath = ref('')
const moveTo = ref('')

function onNewNameInput(e: Event) {
  newName.value = (e.target as HTMLElement & { value: string }).value
}
function onNewParentInput(e: Event) {
  newParent.value = (e.target as HTMLElement & { value: string }).value
}
function onRenamePathInput(e: Event) {
  renamePath.value = (e.target as HTMLElement & { value: string }).value
}
function onRenameToInput(e: Event) {
  renameTo.value = (e.target as HTMLElement & { value: string }).value
}
function onMovePathInput(e: Event) {
  movePath.value = (e.target as HTMLElement & { value: string }).value
}
function onMoveToInput(e: Event) {
  moveTo.value = (e.target as HTMLElement & { value: string }).value
}

async function create() {
  await tags.create(newName.value, newParent.value)
  newName.value = ''
  newParent.value = ''
}

async function rename() {
  if (!renamePath.value || !renameTo.value) return
  await tags.rename(renamePath.value, renameTo.value)
  renamePath.value = ''
  renameTo.value = ''
}

async function move() {
  if (!movePath.value) return
  await tags.move(movePath.value, moveTo.value)
  movePath.value = ''
  moveTo.value = ''
}

async function remove(path: string) {
  if (window.confirm(`删除标签「${path}」及其所有子标签？条目本身不会被删除。`)) {
    await tags.remove(path)
  }
}

onMounted(() => void tags.load())
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
    <section class="rounded-lg border border-[var(--wui-color-border)] p-4">
      <h2 class="mb-2 text-sm font-semibold">创建标签</h2>
      <div class="flex flex-wrap items-center gap-2">
        <web-ui-input :value="newName" placeholder="标签名或完整路径（如 a/b/c）" @input="onNewNameInput" />
        <web-ui-input :value="newParent" placeholder="父标签路径（可空）" @input="onNewParentInput" />
        <web-ui-button variant="primary" @click="create">
          <web-ui-icon :icon="lucidePlus" :size="14" slot="prefix" />
          创建
        </web-ui-button>
      </div>
    </section>

    <section class="rounded-lg border border-[var(--wui-color-border)] p-4">
      <h2 class="mb-2 text-sm font-semibold">重命名标签</h2>
      <div class="flex flex-wrap items-center gap-2">
        <web-ui-input :value="renamePath" placeholder="当前路径（如 work/project）" @input="onRenamePathInput" />
        <web-ui-input :value="renameTo" placeholder="新名称（仅最后一段）" @input="onRenameToInput" />
        <web-ui-button @click="rename">
          <web-ui-icon :icon="lucidePencil" :size="14" slot="prefix" />
          重命名
        </web-ui-button>
      </div>
    </section>

    <section class="rounded-lg border border-[var(--wui-color-border)] p-4">
      <h2 class="mb-2 text-sm font-semibold">移动标签（含子树）</h2>
      <div class="flex flex-wrap items-center gap-2">
        <web-ui-input :value="movePath" placeholder="当前路径" @input="onMovePathInput" />
        <web-ui-input :value="moveTo" placeholder="新父路径（空=移到根）" @input="onMoveToInput" />
        <web-ui-button @click="move">
          <web-ui-icon :icon="lucideArrowUpToLine" :size="14" slot="prefix" />
          移动
        </web-ui-button>
      </div>
    </section>

    <section class="rounded-lg border border-[var(--wui-color-border)] p-4">
      <h2 class="mb-2 text-sm font-semibold">删除标签</h2>
      <p class="mb-2 text-xs text-[var(--wui-color-text-muted)]">
        在左侧边栏点击标签树中的标签以选择，然后删除（含子树；条目保留）。
      </p>
      <div class="flex items-center gap-2">
        <web-ui-input :value="tags.selectedPath" readonly placeholder="先选择左侧边栏标签" />
        <web-ui-button variant="danger" :disabled="!tags.selectedPath" @click="remove(tags.selectedPath)">
          <web-ui-icon :icon="lucideTrash2" :size="14" slot="prefix" />
          删除
        </web-ui-button>
      </div>
    </section>
  </div>
</template>
