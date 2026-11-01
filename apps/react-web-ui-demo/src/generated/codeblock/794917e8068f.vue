<template>
  <web-ui-button @click="open[0] = true">打开 drawer 1</web-ui-button>

  <web-ui-drawer
    v-for="(value, index) in open"
    :key="index"
    :open="value"
    :heading="`同级 drawer ${index + 1}`"
    closable
    @open-change="open[index] = $event.detail.open"
  >
    <p>
      第 {{ index + 1 }} 个同级 drawer。{{
        index < open.length - 1 ? '从 footer 打开下一层。' : '关闭后观察剩余层级重新排列。'
      }}
    </p>
    <web-ui-button
      v-if="index < open.length - 1"
      slot="footer"
      variant="secondary"
      full
      @click="open[index + 1] = true"
    >
      打开 drawer {{ index + 2 }}
    </web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref([false, false, false])
</script>
