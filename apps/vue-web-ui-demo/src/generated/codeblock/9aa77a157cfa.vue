<template>
  <web-ui-button @click="shake()">Shake the page</web-ui-button>
</template>

<script setup lang="ts">
import { shake } from '@greypan/web-ui'
</script>
