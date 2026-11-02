<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button v-for="item in sizes" :key="item.label" @click="openWith(item)">
      {{ item.label }}
    </web-ui-button>
  </div>

  <web-ui-drawer
    :open="open"
    :placement="current.placement"
    :heading="current.label"
    :style="{
      '--wui-drawer-width': vertical ? undefined : current.size,
      '--wui-drawer-height': vertical ? current.size : undefined
    }"
    @open-change="open = $event.detail.open"
  >
    <p>Current size: {{ current.size }}</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const sizes: { label: string; placement: Placement; size: string }[] = [
  { label: 'Right 400px', placement: 'right', size: '400px' },
  { label: 'Left 260px', placement: 'left', size: '260px' },
  { label: 'Top 400px', placement: 'top', size: '400px' },
  { label: 'Bottom 160px', placement: 'bottom', size: '160px' }
]

const open = ref(false)
const current = ref(sizes[0])
const vertical = computed(() => current.value.placement === 'top' || current.value.placement === 'bottom')

function openWith(item: (typeof sizes)[number]) {
  current.value = item
  open.value = true
}
</script>
