<template>
  <form ref="form" class="flex flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-checkbox name="channel" value="email">邮件</web-ui-checkbox>
    <web-ui-checkbox name="channel" value="sms">短信</web-ui-checkbox>
    <web-ui-checkbox name="agreement" value="yes" required>我已阅读并同意服务条款</web-ui-checkbox>
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
  submitted.value = fields.join(' · ')
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
