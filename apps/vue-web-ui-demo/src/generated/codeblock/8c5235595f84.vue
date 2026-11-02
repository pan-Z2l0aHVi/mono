<template>
  <form ref="form" class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-input-number name="quantity" :value="3" :min="1" :max="9" :step="1" required></web-ui-input-number>
    <web-ui-button type="submit">提交</web-ui-button>
    <web-ui-button @click="reset">重置</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ submitted === '' ? '尚未提交' : submitted }}</output>
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
  submitted.value = fields.join(' · ') || '(没有字段)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
