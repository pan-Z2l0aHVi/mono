<script setup lang="ts">
import { WebUiSpinner } from '@greypan/web-ui'

function showSpinner() {
  WebUiSpinner.show()
}

function hideSpinner() {
  WebUiSpinner.hide()
}

function showTimedSpinner() {
  WebUiSpinner.show({ duration: 2000 })
}

function showSmallSpinner() {
  WebUiSpinner.show({ size: 16 })
}

function showLargeSpinner() {
  WebUiSpinner.show({ size: 64 })
}

function showSpinnerWithDescription() {
  WebUiSpinner.show({ description: 'Loading data, please wait...' })
}

function showSpinnerWithLongDescription() {
  WebUiSpinner.show({ description: 'Syncing cloud files, about 10 seconds', duration: 10000 })
}
</script>

<template>
  <div>
    <h1>Spinner spinner</h1>

    <h2>Declarative usage</h2>
    <div class="mb-3 flex items-center gap-4">
      <web-ui-spinner :size="16"></web-ui-spinner>
      <web-ui-spinner :size="24"></web-ui-spinner>
      <web-ui-spinner :size="32"></web-ui-spinner>
    </div>

    <h2>Declarative description slot</h2>
    <div class="mb-6">
      <web-ui-spinner :size="32">
        <span slot="description">Loading...</span>
      </web-ui-spinner>
    </div>

    <h2>Imperative usage</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="showSpinner">show</web-ui-button>
      <web-ui-button @click="hideSpinner">hide</web-ui-button>
      <web-ui-button @click="showTimedSpinner">show (closes automatically after 2s)</web-ui-button>
    </div>

    <h2>Imperative custom size</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="showSmallSpinner">Small (16)</web-ui-button>
      <web-ui-button @click="showLargeSpinner">Large (64)</web-ui-button>
    </div>

    <h2>Imperative description text</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-button @click="showSpinnerWithDescription">With description</web-ui-button>
      <web-ui-button @click="showSpinnerWithLongDescription">Long description (10s)</web-ui-button>
    </div>
  </div>
</template>
