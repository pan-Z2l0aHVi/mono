<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-checkbox :checked="exclusive" @change="exclusive = $event.target.checked">同时只留一条</web-ui-checkbox>

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

    <output class="text-sm text-(--wui-color-text-secondary)">展开中：{{ open.join('、') || '一条都没有' }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sections = [
  { title: '发货', body: '工作日 18:00 前下单当天发出。' },
  { title: '退换', body: '签收后 7 天内可申请退换。' },
  { title: '发票', body: '下单时勾选发票，电子票 3 个工作日内开出。' }
]

const open = ref(['发货'])
const exclusive = ref(true)

function setAt(title: string, value: boolean) {
  if (!value) {
    open.value = open.value.filter(item => item !== title)
    return
  }
  open.value = exclusive.value ? [title] : [...open.value, title]
}
</script>
