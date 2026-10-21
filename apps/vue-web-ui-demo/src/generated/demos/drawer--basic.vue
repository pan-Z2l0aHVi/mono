<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button v-for="item in placements" :key="item.value" @click="openFrom(item.value)">
      {{ item.label }}
    </web-ui-button>
  </div>

  <web-ui-drawer :open="open" :placement="placement" heading="设置" @open-change="open = $event.detail.open">
    <p>从{{ labels[placement] }}滑入。按 Escape 或点击遮罩关闭。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const placements: { label: string; value: Placement }[] = [
  { label: '右侧', value: 'right' },
  { label: '左侧', value: 'left' },
  { label: '顶部', value: 'top' },
  { label: '底部', value: 'bottom' }
]

const labels: Record<Placement, string> = {
  right: '右侧',
  left: '左侧',
  top: '顶部',
  bottom: '底部'
}

const open = ref(false)
const placement = ref<Placement>('right')

function openFrom(next: Placement) {
  placement.value = next
  open.value = true
}
</script>
