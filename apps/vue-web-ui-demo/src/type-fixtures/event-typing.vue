<script setup lang="ts">
// Vue 事件类型回归护栏：补上 demo 类型检查未覆盖的两个公共契约场景，随每次 vue-tsc 构建被检查。
// 局限：vue-tsc 对未声明 emit/prop 的事件会回退到原生元素事件类型，因此本文件无法区分
// 「全局 ComponentCustomProps 保留了 onFocus/onInput」与「靠原生回退兜底」；该全局契约由
// packages/web-ui/src/types/vue.ts 内的警示注释与 docs/agents/web-ui.md 约束，而非本文件。
import { defineComponent, ref } from 'vue'

// 非 web-ui 组件：验证其原生 @input/@focus 事件仍可绑定（P1-1 场景示例）。
const NativeBox = defineComponent({})

const eventTarget = ref<EventTarget | null>(null)
</script>

<template>
  <!-- 未声明 focus/blur emit 的组件仍支持 @focus/@blur 绑定（P1-2 场景示例）。 -->
  <web-ui-checkbox @focus="eventTarget = $event.target" @blur="eventTarget = $event.target">A</web-ui-checkbox>
  <web-ui-radio @focus="eventTarget = $event.target" @blur="eventTarget = $event.target">A</web-ui-radio>

  <!-- 非 web-ui 组件仍支持原生 @input/@focus 事件（P1-1 场景示例）。 -->
  <NativeBox @focus="eventTarget = $event.target" @input="eventTarget = $event.target" />
</template>
