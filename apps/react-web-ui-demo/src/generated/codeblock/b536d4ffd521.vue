<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="open = !open">
        {{ open ? 'Close menu' : 'Open menu' }}
      </web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        State: {{ open ? 'open' : 'closed' }} · Last selection: {{ last }}
      </output>
    </div>

    <web-ui-dropdown :open="open" @open-change="open = $event.detail.open">
      <web-ui-button slot="trigger" variant="secondary">Controlled menu</web-ui-button>
      <web-ui-dropdown-item value="edit" @click="select('Edit')">Edit</web-ui-dropdown-item>
      <web-ui-dropdown-item value="copy" @click="select('Copy')">Copy</web-ui-dropdown-item>
      <web-ui-dropdown-item value="archive" @click="select('Archive')">Archive</web-ui-dropdown-item>
    </web-ui-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const last = ref('—')

function select(label: string) {
  last.value = label
  open.value = false
}
</script>
