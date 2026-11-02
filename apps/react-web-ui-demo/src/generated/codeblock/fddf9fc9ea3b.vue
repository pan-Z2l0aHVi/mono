<template>
  <form ref="form" class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-slider aria-label="Form volume" name="volume" :step="5" :value="40"></web-ui-slider>
    <web-ui-button type="submit">Submit</web-ui-button>
    <web-ui-button @click="reset">Reset</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ submitted === '' ? 'Not submitted yet' : `volume=${submitted}` }}
    </output>
  </form>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'

const submitted = ref('')
const form = useTemplateRef('form')

function onSubmit(event: Event) {
  event.preventDefault()
  const volume = new FormData(event.currentTarget as HTMLFormElement).get('volume')
  submitted.value = typeof volume === 'string' ? volume : ''
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
