<template>
  <form ref="form" class="flex w-full flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-input name="nickname" required placeholder="昵称（必填）"></web-ui-input>
    <web-ui-input name="email" type="email" placeholder="邮箱（可留空，填了要成格式）"></web-ui-input>
    <div class="flex items-center gap-3">
      <web-ui-button type="submit">提交</web-ui-button>
      <web-ui-button @click="reset">重置</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">{{ submitted === '' ? '尚未提交' : submitted }}</output>
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
  submitted.value = fields.join(' · ') || '(没有字段)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
