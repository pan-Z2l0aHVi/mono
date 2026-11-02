<template>
  <form class="flex flex-wrap items-center gap-3" @submit="onSubmit">
    <web-ui-input name="nickname" placeholder="Nickname"></web-ui-input>
    <web-ui-button type="submit" variant="primary">Submit</web-ui-button>
    <web-ui-button type="submit" variant="secondary" @click="onCancelledClick">Submit but blocked</web-ui-button>
    <web-ui-button type="reset" variant="ghost" @click="submitted = ''">Reset</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ submitted === '' ? 'Not submitted yet' : submitted }}
    </output>
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
    typeof nickname === 'string' && nickname !== '' ? nickname : '(empty)'
  } · submitter=${submitter === null ? 'null' : 'non-null'}`
}

function onCancelledClick(event: MouseEvent) {
  event.preventDefault()
  submitted.value = 'This click was preventDefault-ed; nothing was submitted'
}
</script>
