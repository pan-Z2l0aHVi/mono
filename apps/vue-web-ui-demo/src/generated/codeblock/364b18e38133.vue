<template>
  <web-ui-button @click="first = true">打开第 1 层</web-ui-button>

  <web-ui-drawer :open="first" page-shift heading="第 1 层" @open-change="first = $event.detail.open">
    <p>同级 drawer 也按打开先后自动嵌套：先打开的偏移最多，后打开的偏移更少。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="second = true">打开同级第 2 层</web-ui-button>
  </web-ui-drawer>

  <web-ui-drawer :open="second" page-shift heading="第 2 层" @open-change="second = $event.detail.open">
    <p>这一层与上一层是兄弟节点，视觉上仍退后一层、页面继续偏移；关闭它，页面回落到前一层的位置。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const first = ref(false)
const second = ref(false)
</script>
