<template>
  <form ref="form" class="flex flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-checkbox name="channel" value="email">Email</web-ui-checkbox>
    <web-ui-checkbox name="channel" value="sms">SMS</web-ui-checkbox>
    <web-ui-checkbox name="agreement" value="yes" required>
      I have read and agree to the terms of service
    </web-ui-checkbox>
    <div class="flex items-center gap-3">
      <web-ui-button type="submit">Submit</web-ui-button>
      <web-ui-button @click="reset">Reset</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        {{ submitted === '' ? 'Not submitted yet' : submitted }}
      </output>
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
    if (typeof value === 'string') fields.push(`${name}=${value}`)
  }
  submitted.value = fields.join(' · ')
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
