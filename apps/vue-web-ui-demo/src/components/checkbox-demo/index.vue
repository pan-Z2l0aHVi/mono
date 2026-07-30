<script setup lang="ts">
import { ref } from 'vue'

const fruits = ref<string[]>([])
const checkedDisabled = ref(['apple'])
const groupVals = ref<string[]>(['banana', 'cherry'])

const toggleFruit = (value: string) => {
  const idx = fruits.value.indexOf(value)
  if (idx === -1) {
    fruits.value = [...fruits.value, value]
  } else {
    fruits.value = fruits.value.filter(v => v !== value)
  }
}
</script>

<template>
  <div>
    <h1>复选框</h1>
    <h2>基本用法</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-checkbox :checked="fruits.includes('apple')" value="apple" @change="toggleFruit('apple')"
        >Apple</web-ui-checkbox
      >
      <web-ui-checkbox :checked="fruits.includes('banana')" value="banana" @change="toggleFruit('banana')"
        >Banana</web-ui-checkbox
      >
      <web-ui-checkbox :checked="fruits.includes('cherry')" value="cherry" @change="toggleFruit('cherry')"
        >Cherry</web-ui-checkbox
      >
    </div>
    <p class="text-sm text-gray-500">选中值：{{ fruits }}</p>

    <h2>Checkbox Group</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-checkbox-group :value="groupVals" @value-changed="groupVals = $event.detail.value">
        <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
        <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
        <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
      </web-ui-checkbox-group>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ groupVals }}</p>

    <h2>Checkbox Group 禁用</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-checkbox-group disabled :value="groupVals" @value-changed="groupVals = $event.detail.value">
        <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
        <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
        <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
      </web-ui-checkbox-group>
    </div>

    <h2>禁用状态</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-checkbox :checked="checkedDisabled.includes('apple')" value="apple" disabled>Apple</web-ui-checkbox>
      <web-ui-checkbox :checked="checkedDisabled.includes('banana')" value="banana" disabled>Banana</web-ui-checkbox>
      <web-ui-checkbox :checked="checkedDisabled.includes('cherry')" value="cherry" disabled>Cherry</web-ui-checkbox>
    </div>
  </div>
</template>
