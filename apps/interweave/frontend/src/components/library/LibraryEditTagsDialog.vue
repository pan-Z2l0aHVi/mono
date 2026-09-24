<script setup lang="ts">
import type { WebUiAutocomplete, WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { lucideTags, lucideX } from '@greypan/web-ui/icons'
import { computed, ref, watch } from 'vue'

import type { ResourceView } from '@/stores/library'

import { tagClass } from './presentation'

const props = defineProps<{
  open: boolean
  resource: ResourceView | null
  allTagNames: string[]
  busy: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [resourceId: string, tagNames: string[]]
}>()

const draft = ref<string[]>([])
const inputValue = ref('')

const options = computed(() => {
  const selected = new Set(draft.value.map(tag => tag.toLowerCase()))
  return props.allTagNames.filter(tag => !selected.has(tag.toLowerCase()))
})

watch(
  () => [props.open, props.resource?.id] as const,
  ([open, resourceId]) => {
    if (!open || !resourceId) return
    draft.value = [...(props.resource?.tagNames ?? [])]
    inputValue.value = ''
  },
  { immediate: true }
)

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  emit('update:open', event.detail.open)
}

function handleInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  inputValue.value = event.target.value
}

function addTag(field?: WebUiAutocomplete | null) {
  const tag = (field?.value ?? inputValue.value).trim().replace(/\s+/g, ' ')
  if (tag && !draft.value.some(item => item.toLowerCase() === tag.toLowerCase())) {
    draft.value.push(tag)
  }
  if (field) field.value = ''
  inputValue.value = ''
}

function handleChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  addTag(event.target)
}

function removeTag(tag: string) {
  draft.value = draft.value.filter(item => item !== tag)
}

function save() {
  if (!props.resource) return
  emit('save', props.resource.id, [...draft.value])
}
</script>

<template>
  <web-ui-dialog
    :open="open"
    controlled
    no-backdrop-close
    class="max-[640px]:[--wui-dialog-width:90vw] [--wui-dialog-width:340px]"
    @open-change="handleOpenChange"
  >
    <span slot="title">编辑标签</span>

    <div class="grid gap-4">
      <label class="grid gap-1.5">
        <span class="text-xs font-medium text-(--wui-color-text-secondary)">添加标签</span>
        <web-ui-autocomplete
          :value="inputValue"
          allow-custom-value
          portal
          placeholder="输入或选择标签"
          aria-label="添加标签"
          class="w-full [--wui-input-width:100%]"
          @input="handleInput"
          @change="handleChange"
        >
          <web-ui-option v-for="tag in options" :key="tag" :value="tag" :label="tag">{{ tag }}</web-ui-option>
        </web-ui-autocomplete>
      </label>

      <div class="grid gap-2">
        <span class="text-xs font-medium text-(--wui-color-text-secondary)">当前标签</span>
        <div
          v-if="draft.length"
          class="flex min-h-16 flex-wrap items-center gap-1.5 rounded-lg bg-black/3 p-2.5 dark:bg-white/5"
        >
          <span
            v-for="tag in draft"
            :key="tag"
            class="inline-flex h-6 items-center gap-0.5 rounded-full py-1 pr-0.5 pl-2 text-xs"
            :class="tagClass(tag)"
          >
            {{ tag }}
            <web-ui-button icon variant="ghost" size="18" :aria-label="`移除标签 ${tag}`" @click="removeTag(tag)">
              <web-ui-icon :icon="lucideX" :size="10" />
            </web-ui-button>
          </span>
        </div>
        <div
          v-else
          class="flex min-h-16 items-center gap-2 rounded-lg border border-dashed border-black/10 px-3 text-xs text-(--wui-color-text-secondary) dark:border-white/10"
        >
          <web-ui-icon :icon="lucideTags" :size="14" />
          暂无标签
        </div>
      </div>
    </div>

    <div slot="footer" class="grid grid-cols-2 gap-3">
      <web-ui-button full variant="secondary" :disabled="busy" @click="emit('update:open', false)">
        取消
      </web-ui-button>
      <web-ui-button full variant="primary" :loading="busy" @click="save">保存</web-ui-button>
    </div>
  </web-ui-dialog>
</template>
