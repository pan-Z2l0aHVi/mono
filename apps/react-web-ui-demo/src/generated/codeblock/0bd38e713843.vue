<template>
  <form ref="form" class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-switch name="newsletter" value="yes" required></web-ui-switch>
    <span class="text-sm text-(--wui-color-text-secondary)">Newsletter subscription: required</span>
    <web-ui-button type="submit">Submit</web-ui-button>
    <web-ui-button @click="reset">Reset</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ submitted === '' ? 'Not submitted yet' : submitted }}
    </output>
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
    if (typeof value === 'string') fields.push(`${name}=${value}`)
  }
  submitted.value = fields.join(' · ') || '(no fields)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
