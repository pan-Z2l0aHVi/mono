<template>
  <form class="flex flex-wrap items-center gap-3" @submit="onSubmit">
    <web-ui-input name="nickname" placeholder="昵称"></web-ui-input>
    <web-ui-button type="submit" variant="primary">提交</web-ui-button>
    <web-ui-button type="submit" variant="secondary" @click="onCancelledClick">提交但被拦下</web-ui-button>
    <web-ui-button type="reset" variant="ghost" @click="submitted = ''">重置</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ submitted === '' ? '尚未提交' : submitted }}</output>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const submitted = ref('')

function onSubmit(event: Event) {
  event.preventDefault()
  const nickname = new FormData(event.currentTarget as HTMLFormElement).get('nickname')
  const submitter = (event as SubmitEvent).submitter
  submitted.value = `nickname=${
    typeof nickname === 'string' && nickname !== '' ? nickname : '(空)'
  } · submitter=${submitter === null ? 'null' : '非 null'}`
}

function onCancelledClick(event: MouseEvent) {
  event.preventDefault()
  submitted.value = '这次 click 被 preventDefault，没有提交'
}
</script>
