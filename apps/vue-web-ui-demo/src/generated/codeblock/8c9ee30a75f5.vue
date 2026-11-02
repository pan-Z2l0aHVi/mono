<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">Open dialog</web-ui-button>
    <web-ui-dialog
      :open="open"
      footer-orientation="horizontal"
      heading="Save this message?"
      @open-change="open = $event.detail.open"
    >
      <p class="m-0">
        This message has not been sent and contains unsaved changes. Save it as a draft to work on later.
      </p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">Discard</web-ui-button>
      <web-ui-button slot="footer" full variant="primary" @click="open = false">Save draft</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
