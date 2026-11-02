<template>
  <form ref="form" class="flex w-full flex-col items-start gap-3" @submit="onSubmit">
    <div class="flex flex-col items-start gap-1">
      <span class="text-sm text-(--wui-color-text-secondary)">Title</span>
      <web-ui-editable-text name="title" value="Initial title" aria-label="Title"></web-ui-editable-text>
    </div>
    <div class="flex flex-col items-start gap-1">
      <span class="text-sm text-(--wui-color-text-secondary)">Summary: optional</span>
      <web-ui-editable-text
        name="bio"
        class="w-80"
        placeholder="Write a one-line summary"
        aria-label="Summary"
      ></web-ui-editable-text>
    </div>
    <div class="flex items-center gap-3">
      <web-ui-button type="submit">Submit</web-ui-button>
      <web-ui-button @click="reset">Reset</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">{{
        submitted === '' ? 'Not submitted yet' : submitted
      }}</output>
    </div>
  </form>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'

const submitted = ref('')
const form = useTemplateRef('form')

function onSubmit(event: Event) {
  event.preventDefault()
  const fields: string[] = []
  for (const [name, value] of new FormData(event.currentTarget as HTMLFormElement)) {
    if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n') || '(empty)'}`)
  }
  submitted.value = fields.join(' · ') || '(no fields)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
