<script setup lang="ts">
// Vue 事件类型回归护栏：锁定「宿主化 $events + 局部 HTMLAttributes」类型契约的关键场景，
// 随每次 vue-tsc --build 被检查。
// 局限：vue-tsc 对组件上未声明 emit/prop 的属性和事件会回退到 $attrs 放行（$event 为 any），
// 因此本文件无法对「非 web-ui 组件被全局污染」做负向断言；该契约由 types/vue.ts
// 不再全局扩展 ComponentCustomProps 结构保证，并由 docs/agents/web-ui.md 约束。
import type { WebUiCheckboxGroup, WebUiDialog, WebUiEvent, WebUiSegmented, WebUiSwitch } from '@greypan/web-ui'
import { ref } from 'vue'

// 1. 标准事件的 target/currentTarget 收窄到 host，value/checked 精确推导。
function onSegmentedInput(event: WebUiEvent<WebUiSegmented, 'input'>) {
  const value: string = event.target.value
  valueRef.value = value
}
function onSwitchChange(event: WebUiEvent<WebUiSwitch, 'change'>) {
  const checked: boolean = event.currentTarget.checked
  checkedRef.value = checked
}

// 1b. 复合控件 group 的 change 同样收窄到 group 实例，value 为 string[]。
function onGroupChange(event: WebUiEvent<WebUiCheckboxGroup, 'change'>) {
  const values: string[] = event.target.value
  groupVals.value = values
}

// 2. kebab-case CustomEvent 的 detail 精确推导。
function onDialogOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  const open: boolean = event.detail.open
  dialogOpen.value = open
}

// 3. 具体 Custom Element 模板 ref 类型。
const segmentedRef = ref<WebUiSegmented>()

const valueRef = ref('')
const checkedRef = ref(false)
const groupVals = ref<string[]>([])
const dialogOpen = ref(false)
const clickCount = ref(0)
</script>

<template>
  <!-- 1. inline handler 直接使用推导的 $event.target/currentTarget，无需 cast -->
  <web-ui-segmented :value="valueRef" @input="valueRef = $event.target.value" />
  <web-ui-switch :checked="checkedRef" @change="checkedRef = $event.target.checked" />
  <web-ui-segmented @input="onSegmentedInput" />
  <web-ui-switch @change="onSwitchChange" />

  <!-- 1b. group 的 inline 与命名 handler 均无 cast -->
  <web-ui-checkbox-group :value="groupVals" @change="groupVals = $event.target.value">
    <web-ui-checkbox value="a">A</web-ui-checkbox>
  </web-ui-checkbox-group>
  <web-ui-checkbox-group @change="onGroupChange" />

  <!-- 2. kebab 自定义事件：$event.detail 精确类型 -->
  <web-ui-dialog :open="dialogOpen" @open-change="dialogOpen = $event.detail.open" />
  <web-ui-dialog @open-change="onDialogOpenChange" />

  <!-- 3. 具体 Custom Element ref -->
  <web-ui-segmented ref="segmentedRef" />

  <!-- 4. 未声明 $events 的组件仍支持原生 click/focus 绑定 -->
  <web-ui-button @click="clickCount = clickCount + 1" @focus="clickCount = clickCount + 1">A</web-ui-button>
</template>
