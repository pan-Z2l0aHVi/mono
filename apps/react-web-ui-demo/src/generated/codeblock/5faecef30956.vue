<template>
  <web-ui-button @click="open = true">Edit profile</web-ui-button>

  <web-ui-drawer :open="open" heading="Edit profile" @open-change="open = $event.detail.open">
    <div class="flex flex-col gap-3">
      <p v-for="index in 12" :key="index" class="m-0">Line {{ index }}, used to demonstrate body scrolling.</p>
    </div>

    <div slot="footer" class="flex gap-3">
      <web-ui-button variant="secondary" full @click="open = false">Cancel</web-ui-button>
      <web-ui-button full @click="open = false">Save</web-ui-button>
    </div>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
