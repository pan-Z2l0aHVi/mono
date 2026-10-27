<template>
  <div class="flex flex-wrap items-center gap-6">
    <web-ui-icon :icon="lucideLoaderCircle" :size="24" :spin="spinning"></web-ui-icon>
    <web-ui-checkbox :checked="spinning" @change="spinning = $event.target.checked">Spin</web-ui-checkbox>
  </div>
</template>

<script setup lang="ts">
import { lucideLoaderCircle } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const spinning = ref(true)
</script>
