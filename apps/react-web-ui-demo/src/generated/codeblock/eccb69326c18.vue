<template>
  <web-ui-theme ref="theme" appearance="dark">
    <div class="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="flex flex-wrap items-center gap-2">
        <web-ui-select portal placeholder="Portal select" aria-label="Select mounted into the scope overlay root">
          <web-ui-option value="portal" label="Portal overlay">Portal overlay</web-ui-option>
          <web-ui-option value="token" label="Theme token">Theme token</web-ui-option>
        </web-ui-select>
        <web-ui-button ref="toast-target" variant="secondary" @click="showToast">Show toast</web-ui-button>
        <web-ui-button variant="secondary" @click="dialogOpen = true">Open dialog</web-ui-button>
        <web-ui-button variant="ghost" @click="inspect">Read overlay root</web-ui-button>
      </div>
      <output class="mt-2 block text-sm text-(--wui-color-text-secondary)">{{ report }}</output>

      <web-ui-dialog :open="dialogOpen" heading="Scoped dialog" @open-change="dialogOpen = $event.detail.open">
        The dialog sits in the native top layer; color and motion tokens are still inherited from this layer.
        <web-ui-button slot="footer" variant="primary" full @click="dialogOpen = false">Close</web-ui-button>
      </web-ui-dialog>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import { toast, type WebUiButton, type WebUiTheme } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const theme = useTemplateRef<WebUiTheme>('theme')
const toastTarget = useTemplateRef<WebUiButton>('toast-target')
const dialogOpen = ref(false)
const report = ref('Not read yet')

function showToast() {
  toast.info("This toast mounts into the sample's own overlay root.", {
    heading: 'Scoped toast',
    duration: 3000,
    target: toastTarget.value ?? undefined
  })
}

function inspect() {
  report.value = theme.value?.getOverlayRoot()
    ? 'getOverlayRoot() returns an element'
    : 'getOverlayRoot() returns undefined'
}
</script>
