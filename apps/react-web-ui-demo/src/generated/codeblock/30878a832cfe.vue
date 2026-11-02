<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-checkbox :checked="exclusive" @change="exclusive = $event.target.checked"
      >Only one at a time</web-ui-checkbox
    >

    <web-ui-collapse
      v-for="item in sections"
      :key="item.title"
      :open="open.includes(item.title)"
      @open-change="setAt(item.title, $event.detail.open)"
    >
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        {{ item.title }}
      </button>
      <div slot="content">
        <div class="p-3 text-sm">{{ item.body }}</div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">expanded: {{ open.join(', ') || 'none' }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sections = [
  { title: 'Shipping', body: 'Orders placed before 18:00 on a business day ship the same day.' },
  { title: 'Returns', body: 'Returns and exchanges can be requested within 7 days of delivery.' },
  { title: 'Invoices', body: 'Select an invoice at checkout; the e-invoice is issued within 3 business days.' }
]

const open = ref(['Shipping'])
const exclusive = ref(true)

function setAt(title: string, value: boolean) {
  if (!value) {
    open.value = open.value.filter(item => item !== title)
    return
  }
  open.value = exclusive.value ? [title] : [...open.value, title]
}
</script>
