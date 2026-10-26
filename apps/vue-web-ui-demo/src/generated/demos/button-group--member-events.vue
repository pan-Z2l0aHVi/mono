<template>
  <form class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-input name="note" placeholder="备注"></web-ui-input>
    <web-ui-button-group @click="onGroupClick">
      <web-ui-button variant="secondary" type="submit" data-id="保存">保存</web-ui-button>
      <web-ui-button variant="secondary" data-id="复制">复制</web-ui-button>
      <web-ui-button variant="secondary" loading data-id="处理中">处理中</web-ui-button>
      <web-ui-button variant="danger" disabled data-id="删除">删除</web-ui-button>
    </web-ui-button-group>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ log }}</output>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const log = ref('还没有点击')

function onGroupClick(event: MouseEvent) {
  const id = (event.target as HTMLElement).dataset.id
  if (id) log.value = `点了 ${id}`
}

function onSubmit(event: Event) {
  event.preventDefault()
  log.value = '外层 form 收到了 submit'
}
</script>
