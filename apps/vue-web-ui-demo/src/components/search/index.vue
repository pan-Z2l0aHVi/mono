<script setup lang="ts">
import { searchNavigation } from '@greypan/doc-demo-kit'
import { navigatePopoverLinks, type WebUiEvent, type WebUiInput, type WebUiPopover } from '@greypan/web-ui'
import { lucideSearch } from '@greypan/web-ui/icons'
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { currentLocale } from '@/i18n/locale'

const pages = [
  { path: '/home', zh: '组件总览', en: 'Components' },
  { path: '/changelog', zh: '更新日志', en: 'Changelog' }
]

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
const input = ref<WebUiInput>()
const query = ref('')
const displayQuery = ref('')
const matches = computed(() => searchNavigation(displayQuery.value, pages))
const hasQuery = computed(() => query.value.trim().length > 0)
const panelOpen = ref(true)
const results = ref<HTMLDivElement>()
const popover = ref<WebUiPopover>()

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

function onFocusout(event: FocusEvent) {
  if ((event.target as HTMLElement).closest('web-ui-button')) return
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) emit('update:open', false)
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (target.closest('a[href]')) {
      panelOpen.value = false
      input.value?.focus()
    } else {
      emit('update:open', false)
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
  <div class="relative min-w-0" @focusout="onFocusout" @keydown="onKeydown">
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
            class="demo-search-link text-sm hover:bg-black/5 focus:bg-black/5 dark:hover:bg-white/10 dark:focus:bg-white/10"
            @click="onResultClick"
            >{{ currentLocale === 'zh-CN' ? item.zh : item.en }}</RouterLink
          >
        </template>
        <div v-else class="demo-search-empty"><web-ui-empty title="没有匹配结果" /></div>
      </div>
    </web-ui-popover>
  </div>
</template>
