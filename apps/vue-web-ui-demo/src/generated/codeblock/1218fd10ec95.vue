<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button @click="rightOpen = true">右侧拖拽关闭</web-ui-button>
    <web-ui-button @click="bottomOpen = true">底部拖拽关闭</web-ui-button>
  </div>

  <web-ui-drawer :open="rightOpen" draggable heading="向右拖拽关闭" @open-change="rightOpen = $event.detail.open">
    <p>按住左缘的灰色胶囊，向右拖过半或快速甩动即可关闭。</p>
  </web-ui-drawer>

  <web-ui-drawer
    :open="bottomOpen"
    placement="bottom"
    draggable
    heading="向下拖拽关闭"
    @open-change="bottomOpen = $event.detail.open"
  >
    <p>按住上缘的灰色胶囊，向下拖过半或快速甩动即可关闭。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const rightOpen = ref(false)
const bottomOpen = ref(false)
</script>
