<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button v-for="item in placements" :key="item.value" @click="openFrom(item.value)">
      {{ item.label }}
    </web-ui-button>
  </div>

  <web-ui-drawer :open="open" :placement="placement" heading="Settings" @open-change="open = $event.detail.open">
    <p>Slides in from the {{ labels[placement] }}. Press Escape or click the backdrop to close.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const placements: { label: string; value: Placement }[] = [
  { label: 'Right', value: 'right' },
  { label: 'Left', value: 'left' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' }
]

const labels: Record<Placement, string> = {
  right: 'right',
  left: 'left',
  top: 'top',
  bottom: 'bottom'
}

const open = ref(false)
const placement = ref<Placement>('right')

function openFrom(next: Placement) {
  placement.value = next
  open.value = true
}
</script>
