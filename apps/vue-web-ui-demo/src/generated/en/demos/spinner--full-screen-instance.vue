<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button @click="show">show()</web-ui-button>
    <web-ui-button @click="hide">hide()</web-ui-button>
    <web-ui-button @click="showSmall">Small (16px)</web-ui-button>
    <web-ui-button @click="showLarge">Large (64px), closes itself after 2 seconds</web-ui-button>
    <web-ui-button @click="showWithDescription">With description, 10 seconds</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { WebUiSpinner } from '@greypan/web-ui'

function show() {
  WebUiSpinner.show()
}

function hide() {
  WebUiSpinner.hide()
}

function showSmall() {
  WebUiSpinner.show({ size: 16 })
}

function showLarge() {
  WebUiSpinner.show({ size: 64, duration: 2000 })
}

function showWithDescription() {
  WebUiSpinner.show({ description: 'Syncing cloud files, about 10 seconds', duration: 10000 })
}
</script>
