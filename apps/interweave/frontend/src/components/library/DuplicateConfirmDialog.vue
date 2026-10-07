<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { lucideCopy, lucideTriangleAlert } from '@greypan/web-ui/icons'
import { webUiScrollbarsOptions } from '@greypan/web-ui/scrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'

import type { LibraryDuplicatePrompt } from './addQueue'

defineProps<{
  open: boolean
  prompt: LibraryDuplicatePrompt | null
}>()

const emit = defineEmits<{
  accept: []
  cancel: []
}>()

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  if (!event.detail.open) emit('cancel')
}
</script>

<template>
  <web-ui-dialog
    :open="open"
    controlled
    no-backdrop-close
    class="mobile:[--wui-dialog-width:90vw] [--wui-dialog-width:420px]"
    @open-change="handleOpenChange"
  >
    <span slot="title" class="flex items-center gap-2">
      <web-ui-icon :icon="lucideTriangleAlert" :size="16" class="text-[#b45309] dark:text-[#fcd34d]" />
      资源库中已有这个文件
    </span>

    <p class="m-0 text-[14px] leading-6 text-[#5b5b66] dark:text-(--wui-color-text-secondary)">
      继续添加会创建一条新的资源记录，库中将存在两个指向同一位置的条目。
    </p>

    <!--
      命中项多到需要滚动时，Chrome 会把滚动容器算作可聚焦元素，showModal() 的初始焦点
      就落在它上面——接管后那个元素是 OverlayScrollbars 生成的 viewport，不是外面这个宿主
      （宿主自己 overflow: hidden，不可聚焦）。焦点环因此画在 viewport 上，UA 默认的蓝色
      实心环换成 web-ui 统一的 focus ring。键盘用户仍可以靠这个焦点 + 方向键滚列表。
    -->
    <OverlayScrollbarsComponent
      v-if="prompt"
      :options="webUiScrollbarsOptions"
      class="mt-3 max-h-56 overflow-y-auto rounded-xl bg-black/3 [&_[data-overlayscrollbars-viewport]:focus-visible]:outline-3 [&_[data-overlayscrollbars-viewport]:focus-visible]:outline-offset-2 [&_[data-overlayscrollbars-viewport]:focus-visible]:outline-(--wui-color-focus-ring,rgb(0_136_255/0.4)) dark:bg-white/5"
    >
      <!--
        滚动条接在宿主 div 上，列表留在它里面：OverlayScrollbars 会把宿主的子节点搬进自己
        生成的 viewport，而 <ul> 的内容模型只容得下 <li>——宿主若还是这个 <ul>，搬进去的
        viewport div 就落进列表里了。
      -->
      <ul class="m-0 list-none p-0">
        <li
          v-for="match in prompt.matches"
          :key="match.resource_id"
          class="grid min-w-0 gap-[2px] px-3 py-2 not-last:border-b not-last:border-black/6 not-last:dark:border-white/8"
        >
          <span class="min-w-0 truncate text-[14px] leading-5 font-medium text-[#22212a] dark:text-(--wui-color-text)">
            {{ match.title }}
          </span>
          <span
            class="flex min-w-0 items-center gap-1.5 text-xs leading-5 text-[#6a6a6a] dark:text-(--wui-color-text-secondary)"
            :title="match.location"
          >
            <web-ui-icon :icon="lucideCopy" :size="12" class="shrink-0" />
            <span class="min-w-0 truncate">{{ match.location }}</span>
          </span>
        </li>
      </ul>
    </OverlayScrollbarsComponent>

    <div slot="footer" class="flex gap-3">
      <web-ui-button full variant="secondary" @click="emit('cancel')">取消</web-ui-button>
      <web-ui-button full variant="primary" @click="emit('accept')">仍要添加</web-ui-button>
    </div>
  </web-ui-dialog>
</template>
