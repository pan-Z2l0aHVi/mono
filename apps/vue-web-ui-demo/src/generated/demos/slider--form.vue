<template>
  <form ref="form" class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-slider name="volume" :step="5" :value="40"></web-ui-slider>
    <web-ui-button type="submit">提交</web-ui-button>
    <web-ui-button @click="reset">重置</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ submitted === '' ? '尚未提交' : `volume=${submitted}` }}
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
