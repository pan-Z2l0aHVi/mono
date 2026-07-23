<script setup lang="ts">
import { ref } from 'vue'

const selected = ref('apple')
const disabledVal = ref('apple')
const groupVal = ref('banana')

const updateSelected = (value: string) => {
  selected.value = value
}
</script>

<template>
  <div>
    <h1>单选框</h1>
    <h2>基本用法</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-radio :checked="selected === 'apple'" value="apple" name="fruit" @update:checked="updateSelected('apple')"
        >Apple</web-ui-radio
      >
      <web-ui-radio
        :checked="selected === 'banana'"
        value="banana"
        name="fruit"
        @update:checked="updateSelected('banana')"
        >Banana</web-ui-radio
      >
      <web-ui-radio
        :checked="selected === 'cherry'"
        value="cherry"
        name="fruit"
        @update:checked="updateSelected('cherry')"
        >Cherry</web-ui-radio
      >
    </div>
    <p class="text-sm text-gray-500">选中值：{{ selected }}</p>

    <h2>Radio Group</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-radio-group :value="groupVal" name="group-demo" @value-changed="groupVal = $event.detail.value">
        <web-ui-radio value="apple">Apple</web-ui-radio>
        <web-ui-radio value="banana">Banana</web-ui-radio>
        <web-ui-radio value="cherry">Cherry</web-ui-radio>
      </web-ui-radio-group>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ groupVal }}</p>

    <h2>Radio Group 禁用</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-radio-group
        disabled
        :value="groupVal"
        name="group-disabled-demo"
        @value-changed="groupVal = $event.detail.value"
      >
        <web-ui-radio value="apple">Apple</web-ui-radio>
        <web-ui-radio value="banana">Banana</web-ui-radio>
        <web-ui-radio value="cherry">Cherry</web-ui-radio>
      </web-ui-radio-group>
    </div>

    <h2>禁用状态</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-radio :checked="disabledVal === 'apple'" value="apple" name="disabled-fruit" disabled>Apple</web-ui-radio>
      <web-ui-radio :checked="disabledVal === 'banana'" value="banana" name="disabled-fruit" disabled
        >Banana</web-ui-radio
      >
      <web-ui-radio :checked="disabledVal === 'cherry'" value="cherry" name="disabled-fruit" disabled
        >Cherry</web-ui-radio
      >
    </div>
  </div>
</template>
