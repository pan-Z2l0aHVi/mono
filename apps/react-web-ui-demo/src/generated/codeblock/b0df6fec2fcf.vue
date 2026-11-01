<template>
  <form class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-input name="note" placeholder="Note"></web-ui-input>
    <web-ui-button-group @click="onGroupClick">
      <web-ui-button variant="secondary" type="submit" data-id="save">Save</web-ui-button>
      <web-ui-button variant="secondary" data-id="copy">Copy</web-ui-button>
      <web-ui-button variant="secondary" loading data-id="pending">Pending</web-ui-button>
      <web-ui-button variant="danger" disabled data-id="delete">Delete</web-ui-button>
    </web-ui-button-group>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ log }}</output>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const log = ref('No clicks yet')

function onGroupClick(event: MouseEvent) {
  const id = (event.target as HTMLElement).dataset.id
  if (id) log.value = `Clicked ${id}`
}

function onSubmit(event: Event) {
  event.preventDefault()
  log.value = 'The outer form received submit'
}
</script>
