<script setup lang="ts">
import type { WebUiCheckboxGroup, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const fruits = ref<string[]>([])
const checkedDisabled = ref(['apple'])
const groupVals = ref<string[]>(['banana', 'cherry'])
const disabledGroupVals = ref<string[]>(['apple', 'cherry'])
const verticalVals = ref<string[]>(['apple'])
const horizontalVals = ref<string[]>(['apple'])
const gapVals = ref<string[]>(['apple'])

const toggleFruit = (value: string) => {
  const idx = fruits.value.indexOf(value)
  if (idx === -1) {
    fruits.value = [...fruits.value, value]
  } else {
    fruits.value = fruits.value.filter(v => v !== value)
  }
}

function updateGroupValues(event: WebUiEvent<WebUiCheckboxGroup, 'change'>) {
  groupVals.value = event.currentTarget.value
}

function updateVerticalValues(event: WebUiEvent<WebUiCheckboxGroup, 'change'>) {
  verticalVals.value = event.currentTarget.value
}

function updateHorizontalValues(event: WebUiEvent<WebUiCheckboxGroup, 'change'>) {
  horizontalVals.value = event.currentTarget.value
}

function updateGapValues(event: WebUiEvent<WebUiCheckboxGroup, 'change'>) {
  gapVals.value = event.currentTarget.value
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
      <web-ui-checkbox-group :value="groupVals" @change="updateGroupValues">
        <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
        <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
        <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
      </web-ui-checkbox-group>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ groupVals }}</p>

    <h2>Checkbox Group 布局方向</h2>
    <p class="mb-3 text-sm text-(--wui-color-text-secondary)">direction 控制组内排布，默认 vertical。</p>
    <div class="mb-3 flex flex-wrap gap-8">
      <div>
        <p class="mb-1 text-sm text-(--wui-color-text-secondary)">direction="vertical"（默认）</p>
        <web-ui-checkbox-group direction="vertical" :value="verticalVals" @change="updateVerticalValues">
          <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
          <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
          <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
        </web-ui-checkbox-group>
      </div>
      <div>
        <p class="mb-1 text-sm text-(--wui-color-text-secondary)">direction="horizontal"</p>
        <web-ui-checkbox-group direction="horizontal" :value="horizontalVals" @change="updateHorizontalValues">
          <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
          <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
          <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
        </web-ui-checkbox-group>
      </div>
    </div>
    <p class="text-sm text-gray-500">选中值：vertical {{ verticalVals }} / horizontal {{ horizontalVals }}</p>

    <h2>Checkbox Group 间距</h2>
    <p class="mb-3 text-sm text-(--wui-color-text-secondary)">--wui-checkbox-group-gap 覆盖默认间距 8px。</p>
    <div class="mb-3">
      <web-ui-checkbox-group
        class="[--wui-checkbox-group-gap:16px]"
        direction="horizontal"
        :value="gapVals"
        @change="updateGapValues"
      >
        <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
        <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
        <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
      </web-ui-checkbox-group>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ gapVals }}</p>

    <h2>Checkbox Group 禁用</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-checkbox-group disabled :value="disabledGroupVals">
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
