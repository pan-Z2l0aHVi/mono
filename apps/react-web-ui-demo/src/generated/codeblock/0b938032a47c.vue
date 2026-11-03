<template>
  <web-ui-button @click="shake({ xDistance: 28, duration: 640 })">Bigger and slower</web-ui-button>
  <web-ui-button @click="shake({ xDistance: 12, yDistance: 0 })">Horizontal only</web-ui-button>
  <web-ui-button @click="shake({ xDistance: 0, yDistance: 12 })">Vertical only</web-ui-button>
  <web-ui-button @click="shake({ xDistance: 0, yDistance: 0 })">Both amplitudes 0: nothing happens</web-ui-button>
</template>

<script setup lang="ts">
import { shake } from '@greypan/web-ui'
</script>
