<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        原生 button
      </button>
      <div slot="content">
        <div class="p-3 text-sm">Enter / Space 与焦点都由这个原生 button 自己提供。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      <web-ui-button variant="secondary" full>web-ui-button</web-ui-button>
      <div slot="content">
        <div class="p-3 text-sm">自定义元素也能当 trigger；组件把状态 aria 回写到它身上。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      <web-ui-button variant="secondary" full>
        <web-ui-icon slot="prefix" :icon="lucideChevronDown" :size="14"></web-ui-icon>
        带 prefix icon 的 trigger
      </web-ui-button>
      <div slot="content">
        <div class="p-3 text-sm">被指派的第一件东西仍然是那个 button，所以 aria 落在它身上。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      纯文本 trigger
      <div slot="content">
        <div class="p-3 text-sm">反面写法：鼠标点得动，但不可聚焦、没有键盘激活。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronDown } from '@greypan/web-ui/icons'
</script>
