<template>
  <form ref="form" class="flex w-full flex-col items-start gap-3" @submit="onSubmit">
    <div class="flex flex-col items-start gap-1">
      <span class="text-sm text-(--wui-color-text-secondary)">标题</span>
      <web-ui-editable-text name="title" value="初始标题" aria-label="标题"></web-ui-editable-text>
    </div>
    <div class="flex flex-col items-start gap-1">
      <span class="text-sm text-(--wui-color-text-secondary)">摘要：可留空</span>
      <web-ui-editable-text name="bio" class="w-80" placeholder="写一句摘要" aria-label="摘要"></web-ui-editable-text>
    </div>
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
    if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n') || '(空)'}`)
  }
  submitted.value = fields.join(' · ') || '(没有字段)'
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
