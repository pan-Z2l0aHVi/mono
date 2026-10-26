<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button v-for="(value, index) in open" :key="index" @click="open[index] = true">
      Open drawer {{ index + 1 }}
    </web-ui-button>
  </div>

  <web-ui-drawer
    v-for="(value, index) in open"
    :key="index"
    :open="value"
    :heading="`Sibling drawer ${index + 1}`"
    closable
    @open-change="open[index] = $event.detail.open"
  >
    <p>Sibling drawer {{ index + 1 }}. Open the next one and watch this layer scale down and expose its edge.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref([false, false, false])
</script>
