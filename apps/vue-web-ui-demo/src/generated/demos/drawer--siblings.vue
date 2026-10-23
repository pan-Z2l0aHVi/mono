<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button v-for="(value, index) in open" :key="index" @click="open[index] = true">
      打开 drawer {{ index + 1 }}
    </web-ui-button>
  </div>

  <web-ui-drawer
    v-for="(value, index) in open"
    :key="index"
    :open="value"
    :heading="`同级 drawer ${index + 1}`"
    closable
    @open-change="open[index] = $event.detail.open"
  >
    <p>第 {{ index + 1 }} 个同级 drawer。打开下一个，观察这一层缩放并让出边缘。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref([false, false, false])
</script>
