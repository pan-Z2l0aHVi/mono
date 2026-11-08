<script setup lang="ts">
import { ref } from 'vue'

const name = ref('')
function greet() {
  alert(name.value)
}
</script>

<template>
  <web-ui-input :value="name" placeholder="Name" @input="name = $event.target.value" />
  <web-ui-button variant="primary" @click="greet">Greet</web-ui-button>
</template>
