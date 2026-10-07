<script setup lang="ts">
import type { WebUiAutocomplete, WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { heroiconsCheck16Solid, heroiconsXMark16Solid, lucideTags } from '@greypan/web-ui/icons'
import { computed, ref, watch } from 'vue'

import type { LibraryQueueItem } from '@/services/library'
import type { ResourceView, TagColor } from '@/stores/library'

import { tagClass } from './presentation'

const props = defineProps<{
  open: boolean
  target: ResourceView | LibraryQueueItem | null
  allTagNames: string[]
  /**
   * 标签名 → 持久化颜色。草稿里可能有刚输入、尚未创建的名字（没有颜色，显示中性档），
   * 也可能是队列里尚未落库的标签，因此一律按名回查，而不是从 target 上取。
   */
  tagColors: Record<string, TagColor>
  busy: boolean
  error: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [resourceId: string, tagNames: string[]]
}>()

const draft = ref<string[]>([])
const inputValue = ref('')
const autocompleteField = ref<WebUiAutocomplete | null>(null)

const options = computed(() => {
  const selected = new Set(draft.value.map(tag => tag.toLowerCase()))
  return props.allTagNames.filter(tag => !selected.has(tag.toLowerCase()))
})

watch(
  () => [props.open, props.target?.id] as const,
  ([open, targetId]) => {
    if (!open || !targetId || !props.target) return
    draft.value = [...('tagNames' in props.target ? props.target.tagNames : props.target.tags)]
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

// 面板打开时 Enter 归 autocomplete：只把高亮候选回写输入框。真正的提交发生在面板关闭后
// 的 Enter 或确认按钮上，所以这里必须早于 autocomplete 内部的 keydown 读到 open。
function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.isComposing) return
  if (autocompleteField.value?.open) return
  addTag()
}

function commit() {
  if (!props.target) return
  emit('save', props.target.id, [...draft.value])
}

function addTag(field?: WebUiAutocomplete | null) {
  const tag = (field?.value ?? inputValue.value).trim().replace(/\s+/g, ' ')
  if (tag && !draft.value.some(item => item.toLowerCase() === tag.toLowerCase())) {
    draft.value.push(tag)
    commit()
  }
  if (field) field.value = ''
  inputValue.value = ''
}

function removeTag(tag: string) {
  draft.value = draft.value.filter(item => item !== tag)
  commit()
}
</script>

<template>
  <web-ui-dialog
    :open="open"
    controlled
    no-backdrop-close
    class="mobile:[--wui-dialog-desc-gap:22px] mobile:[--wui-dialog-footer-gap:12px] mobile:[--wui-dialog-padding:22px_20px_20px] mobile:[--wui-dialog-title-gap:18px] mobile:[--wui-dialog-width:90vw] [--wui-dialog-width:320px]"
    @open-change="handleOpenChange"
  >
    <span slot="title">标签</span>

    <p
      v-if="error"
      class="m-0 rounded-md bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:bg-red-400/12 dark:text-red-200"
      role="alert"
    >
      {{ error }}
    </p>

    <div class="grid gap-4">
      <div class="grid gap-1.5">
        <span class="text-sm font-medium text-[#6a6a6a] dark:text-(--wui-color-text-secondary)">添加标签</span>
        <web-ui-autocomplete
          ref="autocompleteField"
          :value="inputValue"
          allow-custom-value
          portal
          placeholder="请输入标签"
          aria-label="添加标签"
          class="block w-full min-w-0 [--wui-autocomplete-max-width:100%] [--wui-input-width:100%]"
          @input="handleInput"
          @keydown="handleKeydown"
        >
          <web-ui-input slot="trigger" class="w-full min-w-0" placeholder="请输入标签" aria-label="添加标签">
            <!-- stop：委托层在 trigger 包装 div 上监听 click 打开面板，确认添加不该顺带开面板 -->
            <!--
              28px + mr-[-8px] 是算出来的等距，不是随手取值：input 的 .wui-input-inner 高
              36px、padding 0 12px。按钮 20px 时上下各留 8px、右侧 12px，本来就不等距。
              放大到 28px 后上下收成 (36-28)/2 = 4px，再用 -8px 把右边距从 12px 拉到
              4px，于是上、下、右三边间隙一致。改 input 的高度或 padding 会打破这个等式。
              宽度走 --wui-button-width 而不是 size：size 同时管 height 与 min-width，
              40px 宽配 28px 高只能分开设，只调宽度才不会动到上下间隙。
            -->
            <web-ui-button
              slot="suffix"
              class="mr-[-8px] shrink-0 [--wui-button-width:40px]"
              icon
              variant="primary"
              size="28"
              :disabled="busy || !inputValue.trim()"
              aria-label="确认添加标签"
              @click.stop="addTag()"
            >
              <web-ui-icon :icon="heroiconsCheck16Solid" :size="18" />
            </web-ui-button>
          </web-ui-input>
          <web-ui-option v-for="tag in options" :key="tag" :value="tag" :label="tag">{{ tag }}</web-ui-option>
        </web-ui-autocomplete>
      </div>

      <div class="grid gap-2">
        <span class="text-sm font-medium text-[#6a6a6a] dark:text-(--wui-color-text-secondary)">当前标签</span>
        <div
          v-if="draft.length"
          class="flex min-h-[36px] flex-wrap items-center gap-1.5 rounded-[18px] bg-white px-3 py-1.5 dark:bg-(--wui-color-surface-raised)"
        >
          <span
            v-for="tag in draft"
            :key="tag"
            class="inline-flex h-[22px] min-w-[22px] items-center gap-0.5 rounded-full px-[7px] text-xs leading-none has-[web-ui-button]:pr-0.5"
            :class="tagClass(props.tagColors[tag])"
          >
            {{ tag }}
            <web-ui-button
              class="shrink-0 [--wui-button-color:currentColor]"
              icon
              variant="ghost"
              size="16"
              :disabled="busy"
              :aria-label="`移除标签 ${tag}`"
              @click="removeTag(tag)"
            >
              <!-- 实心 X：与面板里的实心 check 同一路子，16px 描边图标在这个 22px chip 里太轻。 -->
              <web-ui-icon :icon="heroiconsXMark16Solid" :size="10" />
            </web-ui-button>
          </span>
        </div>
        <div
          v-else
          class="flex items-center gap-2 rounded-2xl border border-dashed border-black/10 px-3 py-3 text-xs text-[#9a9aa4] dark:border-white/10 dark:text-(--wui-color-text-tertiary)"
        >
          <web-ui-icon :icon="lucideTags" :size="14" />
          暂无标签
        </div>
      </div>
    </div>

    <div slot="footer" class="grid gap-2">
      <web-ui-button full variant="secondary" @click="emit('update:open', false)">完成</web-ui-button>
    </div>
  </web-ui-dialog>
</template>
