<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-checkbox :checked="channels.includes('email')" @change="toggle('email')">邮件通知</web-ui-checkbox>
    <web-ui-checkbox :checked="channels.includes('sms')" @change="toggle('sms')">短信通知</web-ui-checkbox>
    <output class="text-sm text-(--wui-color-text-secondary)"
      >已选择：{{ channels.join('、') || '还没有选中项' }}</output
    >
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const channels = ref(['email'])

function toggle(channel: string) {
  channels.value = channels.value.includes(channel)
    ? channels.value.filter(item => item !== channel)
    : [...channels.value, channel]
}
</script>
