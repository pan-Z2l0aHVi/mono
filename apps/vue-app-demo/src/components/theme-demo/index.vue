<script setup lang="ts">
import { ref } from 'vue'

const appearance = ref<'light' | 'dark' | 'system'>('light')
</script>

<template>
  <div>
    <h1>Theme</h1>
    <div class="mb-6 flex gap-2">
      <web-ui-button variant="secondary" @click="appearance = 'light'">Light</web-ui-button>
      <web-ui-button variant="secondary" @click="appearance = 'dark'">Dark</web-ui-button>
      <web-ui-button variant="secondary" @click="appearance = 'system'">System</web-ui-button>
    </div>

    <web-ui-theme :appearance="appearance">
      <section class="rounded-xl p-6" style="background: var(--wui-color-page)">
        <div class="flex flex-wrap gap-3">
          <web-ui-button variant="primary">Primary</web-ui-button>
          <web-ui-button variant="secondary">Secondary</web-ui-button>
          <web-ui-button variant="danger">Danger</web-ui-button>
          <web-ui-input value="Theme scope"></web-ui-input>
          <web-ui-switch checked></web-ui-switch>
        </div>
      </section>
    </web-ui-theme>
  </div>
</template>
