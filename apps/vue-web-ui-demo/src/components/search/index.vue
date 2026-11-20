<script setup lang="ts">
import { searchNavigation } from '@greypan/doc-demo-kit'
import { navigatePopoverLinks, type WebUiEvent, type WebUiInput, type WebUiPopover } from '@greypan/web-ui'
import { lucideSearch } from '@greypan/web-ui/icons'
import { computed, nextTick, ref, toRef, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useExpandingField } from '@/composables/useExpandingField'
import { currentLocale } from '@/i18n/locale'

const props = defineProps<{
  open: boolean
  /** 头部里收纳搜索框与同级控件的容器；搜索上下文以它为准。 */
  controls?: HTMLElement | null
}>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
const input = ref<WebUiInput>()
const query = ref('')
const displayQuery = ref('')
// 壳页与组件导航的搜索全集在 kit（SHELL_NAV_PAGES + NAV_SECTIONS 的 zhName）。
const matches = computed(() => searchNavigation(displayQuery.value))
const hasQuery = computed(() => query.value.trim().length > 0)
const panelOpen = ref(true)
const results = ref<HTMLDivElement>()
const popover = ref<WebUiPopover>()

/*
 * 展开/收起、焦点与 Escape 交给 useExpandingField：按在 controls 里（含主题/语言/动效
 * 选择器等同级控件）时不收起，按在容器外才收；簇内点击结束后把焦点交还输入框。
 */
useExpandingField({
  field: input,
  controls: toRef(props, 'controls'),
  close: () => emit('update:open', false)
})

watch(
  () => props.open,
  open => {
    if (open)
      void nextTick(async () => {
        const element = input.value
        await element?.updateComplete
        if (props.open && element === input.value) element?.focus()
      })
  }
)

function onInput(event: WebUiEvent<WebUiInput, 'input'>) {
  query.value = event.target.value
  if (event.target.value.trim()) displayQuery.value = event.target.value
  panelOpen.value = true
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (event.key === 'Escape') {
    // 搜索结果链接上的 Escape 只收起结果面板；输入框本体的 Escape 由 useExpandingField
    // 负责关闭整个搜索，这里不再重复处理。
    if (target.closest('a[href]')) {
      event.preventDefault()
      event.stopPropagation()
      panelOpen.value = false
      input.value?.focus()
    }
  } else if (event.key === 'ArrowDown' && target === input.value && !panelOpen.value && hasQuery.value) {
    event.preventDefault()
    panelOpen.value = true
    void nextTick(async () => {
      await popover.value?.updateComplete
      requestAnimationFrame(() => {
        if (document.activeElement === input.value) results.value?.querySelector<HTMLAnchorElement>('a[href]')?.focus()
      })
    })
  } else if (input.value) {
    navigatePopoverLinks(event, input.value, [...(results.value?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])])
  }
}

function onResultClick(event: MouseEvent) {
  if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)
    emit('update:open', false)
}

function openSearch() {
  panelOpen.value = true
  emit('update:open', true)
}
</script>

<template>
  <div class="relative min-w-0" @keydown="onKeydown">
    <web-ui-tooltip v-if="!open" content="搜索" portal>
      <web-ui-button icon variant="glass" aria-label="搜索" @click="openSearch">
        <web-ui-icon :icon="lucideSearch" />
      </web-ui-button>
    </web-ui-tooltip>
    <web-ui-popover
      v-else
      ref="popover"
      trigger="none"
      placement="bottom-end"
      :open="panelOpen && hasQuery"
      class="demo-search-popover"
    >
      <web-ui-input
        slot="trigger"
        ref="input"
        :value="query"
        clearable
        autocomplete="off"
        placeholder="搜索页面和组件"
        aria-label="搜索页面和组件"
        class="w-60 min-w-0 max-w-full [--wui-input-width:100%]"
        @input="onInput"
      >
        <web-ui-icon slot="prefix" :icon="lucideSearch" />
      </web-ui-input>
      <div ref="results" class="demo-search-results" aria-label="搜索结果" aria-live="polite">
        <template v-if="matches.length">
          <RouterLink
            v-for="item in matches"
            :key="item.path"
            :to="item.path"
            :tabindex="-1"
            class="demo-search-link text-sm hover:bg-[#1b1b20]/5 focus:bg-[#1b1b20]/5 dark:hover:bg-white/10 dark:focus:bg-white/10"
            @click="onResultClick"
            >{{ currentLocale === 'zh-CN' ? item.zh : item.en }}</RouterLink
          >
        </template>
        <div v-else class="demo-search-empty"><web-ui-empty title="没有匹配结果" /></div>
      </div>
    </web-ui-popover>
  </div>
</template>
