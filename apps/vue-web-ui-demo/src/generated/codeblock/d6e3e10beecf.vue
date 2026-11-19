<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button @click="rightOpen = true">右侧拖拽关闭</web-ui-button>
    <web-ui-button @click="bottomOpen = true">底部拖拽关闭</web-ui-button>
    <web-ui-button @click="fullOpen = true">右侧拖拽全屏</web-ui-button>
  </div>

  <web-ui-drawer :open="rightOpen" draggable heading="向右拖拽关闭" @open-change="rightOpen = $event.detail.open">
    <p>按住左缘的灰色胶囊，向右拖过阈值或快速甩动即可关闭。</p>
  </web-ui-drawer>

  <web-ui-drawer
    :open="bottomOpen"
    placement="bottom"
    draggable
    heading="向下拖拽关闭"
    @open-change="bottomOpen = $event.detail.open"
  >
    <p>按住上缘的灰色胶囊，向下拖过阈值或快速甩动即可关闭。</p>
  </web-ui-drawer>

  <web-ui-drawer
    :open="fullOpen"
    draggable
    fullable
    heading="向右拖拽全屏"
    @open-change="fullOpen = $event.detail.open"
  >
    <p>
      按住左缘的灰色胶囊向外（向左）拖过一段行程即吸附全屏；往回拉过恢复阈值会先恢复原尺寸，并让本次手势停在原尺寸。松手后重新拖过阈值或快速内甩才会关闭。
    </p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const rightOpen = ref(false)
const bottomOpen = ref(false)
const fullOpen = ref(false)
</script>
