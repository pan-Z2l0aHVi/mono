<template>
  <form ref="form" class="flex w-full flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-textarea
      name="notes"
      :rows="3"
      required
      :minlength="10"
      placeholder="Notes: required, at least 10 characters"
    ></web-ui-textarea>
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
    if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n')}`)
  }
  submitted.value = fields.join(' · ') || '(no fields)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
