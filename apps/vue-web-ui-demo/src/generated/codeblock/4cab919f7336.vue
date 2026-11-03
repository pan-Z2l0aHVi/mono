<template>
  <web-ui-button @click="first = true">Open layer 1</web-ui-button>

  <web-ui-drawer :open="first" page-shift heading="Layer 1" @open-change="first = $event.detail.open">
    <p>Sibling drawers auto-nest by opening order: the first steps aside the most, the next one less.</p>
    <web-ui-button slot="footer" variant="secondary" full @click="second = true">Open sibling layer 2</web-ui-button>
  </web-ui-drawer>

  <web-ui-drawer :open="second" page-shift heading="Layer 2" @open-change="second = $event.detail.open">
    <p>
      This layer is a sibling of the previous one, yet it nests behind it visually and adds another share; closing it
      falls back to the previous layer's position.
    </p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const first = ref(false)
const second = ref(false)
</script>
