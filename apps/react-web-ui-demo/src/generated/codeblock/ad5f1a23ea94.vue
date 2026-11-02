<template>
  <form ref="form" class="flex flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-segmented name="day" :value="day" @input="day = $event.currentTarget.value">
      <web-ui-segmented-trigger value="mon">Mon</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="tue">Tue</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="wed">Wed</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="thu">Thu</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="fri">Fri</web-ui-segmented-trigger>
    </web-ui-segmented>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button type="submit">Submit</web-ui-button>
      <web-ui-button @click="reset">Reset</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        {{ submitted === '' ? 'Not submitted yet' : submitted }}
      </output>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

const submitted = ref('')
const day = ref('wed')
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
  day.value = 'wed'
}
</script>
