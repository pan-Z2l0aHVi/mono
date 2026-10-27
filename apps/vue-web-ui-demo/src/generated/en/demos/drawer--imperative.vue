<template>
  <web-ui-button @click="drawer?.show()">Open drawer</web-ui-button>

  <web-ui-drawer ref="drawer" heading="Imperative drawer" closable>
    <p>Opened by show(); the close button in the top-right corner, Escape, and the backdrop all close it.</p>
    <web-ui-button slot="footer" variant="secondary" full @click="drawer?.close()">Call close()</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import type { WebUiDrawer } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const drawer = useTemplateRef<WebUiDrawer>('drawer')
</script>
