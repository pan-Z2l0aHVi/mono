<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse :open="outer" @open-change="onOuterChange">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        外层 collapse
      </button>
      <div slot="content">
        <div class="p-3">
          <p class="m-0 mb-2 text-sm">外层内容，里面再套一条。</p>
          <web-ui-collapse :open="inner" @open-change="inner = $event.detail.open">
            <button
              type="button"
              class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
            >
              内层 collapse
            </button>
            <div slot="content">
              <div class="p-3 text-sm">内层展开后外层随之变高，两层各自持有 open。</div>
            </div>
          </web-ui-collapse>
        </div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">外层 {{ outer }} · 内层 {{ inner }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiCollapse, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const outer = ref(false)
const inner = ref(false)

function onOuterChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  // 内层的 open-change 会冒泡经过外层宿主：只认派发给自己这一条的。
  if (event.target === event.currentTarget) outer.value = event.detail.open
}
</script>
