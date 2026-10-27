<script setup lang="ts">
import { ref } from 'vue'
import { loadLocale } from 'wuchale/load-utils'

const name = ref('Ada')
const count = ref(2)
</script>

<template>
  <main>
    <p id="greeting">Hello {{ name }}, {{ count }} items!</p>
    <input id="name" aria-label="Name" v-model="name" />
    <button id="increment" @click="count++">Add item</button>
    <button id="english" @click="loadLocale('en')">English</button>
    <button id="french" @click="loadLocale('fr')">French</button>
  </main>
</template>
