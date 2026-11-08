<script setup lang="ts">
import { ref } from 'vue'

const name = ref('')
function greet() {
  alert(name.value)
}
</script>

<template>
  <web-ui-input :value="name" placeholder="姓名" @input="name = $event.target.value" />
  <web-ui-button variant="primary" @click="greet">问候</web-ui-button>
</template>
