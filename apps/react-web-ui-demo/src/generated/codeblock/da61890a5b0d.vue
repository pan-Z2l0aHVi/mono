<template>
  <form ref="form" class="flex flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-radio name="size" value="s" :checked="size === 's'" @change="size = 's'">Small</web-ui-radio>
    <web-ui-radio name="size" value="m" :checked="size === 'm'" @change="size = 'm'">Medium</web-ui-radio>
    <web-ui-radio name="size" value="l" :checked="size === 'l'" @change="size = 'l'">Large</web-ui-radio>
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
const size = ref('m')
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
  size.value = 'm'
}
</script>
