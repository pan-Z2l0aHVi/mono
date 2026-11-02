<template>
  <web-ui-button @click="drawer?.show()">打开 drawer</web-ui-button>

  <web-ui-drawer ref="drawer" heading="命令式 drawer" closable>
    <p>由 show() 打开；右上角关闭按钮、Escape 与遮罩都会关闭它。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="drawer?.close()">调用 close()</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import type { WebUiDrawer } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const drawer = useTemplateRef<WebUiDrawer>('drawer')
</script>
