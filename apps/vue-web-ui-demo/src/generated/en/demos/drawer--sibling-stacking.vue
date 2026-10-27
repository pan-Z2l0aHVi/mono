<template>
  <web-ui-button @click="open[0] = true">Open drawer 1</web-ui-button>

  <web-ui-drawer
    v-for="(value, index) in open"
    :key="index"
    :open="value"
    :heading="`Sibling drawer ${index + 1}`"
    closable
    @open-change="open[index] = $event.detail.open"
  >
    <p>
      Sibling drawer {{ index + 1 }}.
      {{
        index < open.length - 1
          ? 'Open the next drawer from the footer.'
          : 'Close to see the remaining layers rearrange.'
      }}
    </p>
    <web-ui-button
      v-if="index < open.length - 1"
      slot="footer"
      variant="secondary"
      full
      @click="open[index + 1] = true"
    >
      Open drawer {{ index + 2 }}
    </web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref([false, false, false])
</script>
