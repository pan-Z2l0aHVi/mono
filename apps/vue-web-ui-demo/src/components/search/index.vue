<script setup lang="ts">
import { createSearchController } from '@greypan/doc-demo-kit'
import { navigatePopoverLinks, type WebUiEvent, type WebUiInput, type WebUiPopover } from '@greypan/web-ui'
import { lucideSearch } from '@greypan/web-ui/icons'
import { onMounted, onScopeDispose, onUpdated, ref, shallowRef, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { currentLocale } from '@/i18n/locale'

const props = defineProps<{
  open: boolean
  /** 头部里收纳搜索框与同级控件的容器；搜索上下文以它为准。 */
  controls?: HTMLElement | null
}>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()

const input = ref<WebUiInput>()
const results = ref<HTMLDivElement>()
const popover = ref<WebUiPopover>()

const controller = createSearchController({
  onOpenChange: next => emit('update:open', next),
  navigateLinks: navigatePopoverLinks
})
const snapshot = shallowRef(controller.getSnapshot())
const unsubscribe = controller.subscribe(() => {
  snapshot.value = controller.getSnapshot()
})

function syncController() {
  controller.syncElements({
    controls: props.controls ?? null,
    input: props.open ? (input.value ?? null) : null,
    popover: props.open ? (popover.value ?? null) : null,
    results: props.open ? (results.value ?? null) : null
  })
  controller.syncOpen(props.open)
}

onMounted(syncController)
onUpdated(syncController)
watch([() => props.controls, () => props.open], syncController, { flush: 'post' })

onScopeDispose(() => {
  unsubscribe()
  controller.dispose()
})

function onInput(event: WebUiEvent<WebUiInput, 'input'>) {
  controller.setQuery(event.target.value)
}
</script>

<template>
  <div class="relative min-w-0" @keydown="controller.handleKeydown">
    <web-ui-tooltip v-if="!open" content="搜索" portal>
      <web-ui-button icon variant="glass" aria-label="搜索" @click="controller.openSearch()">
        <web-ui-icon :icon="lucideSearch" />
      </web-ui-button>
    </web-ui-tooltip>
    <web-ui-popover
      v-else
      ref="popover"
      trigger="none"
      placement="bottom-end"
      :open="snapshot.popoverOpen"
      class="demo-search-popover"
    >
      <web-ui-input
        slot="trigger"
        ref="input"
        :value="snapshot.query"
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
        <template v-if="snapshot.matches.length">
          <RouterLink
            v-for="item in snapshot.matches"
            :key="item.path"
            :to="item.path"
            :tabindex="-1"
            class="demo-search-link text-sm hover:bg-[#1b1b20]/5 focus:bg-[#1b1b20]/5 dark:hover:bg-white/10 dark:focus:bg-white/10"
            @click="controller.handleResultClick"
            >{{ currentLocale === 'zh-CN' ? item.zh : item.en }}</RouterLink
          >
        </template>
        <div v-else class="demo-search-empty"><web-ui-empty title="没有匹配结果" /></div>
      </div>
    </web-ui-popover>
  </div>
</template>
