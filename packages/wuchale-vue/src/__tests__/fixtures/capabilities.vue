<script setup>
import { defineComponent, h, ref } from 'vue'

import plural from './locales/plural.js'

const count = ref(2)
const Counter = defineComponent({
  setup() {
    const clicks = ref(0)
    return () => h('button', { onClick: () => clicks.value++ }, clicks.value)
  }
})
function summary() {
  return `Hello ${count.value} items!`
}
function quantity() {
  return plural(count.value, ['One item', '# items'])
}
</script>

<template>
  <section>
    <p>{{ summary() }}</p>
    <p>{{ quantity() }}</p>
    <p>Read <a href="/guide" @click.prevent="count++">this</a> and <Counter /> now.</p>
    <output>{{ count }}</output>
  </section>
</template>
