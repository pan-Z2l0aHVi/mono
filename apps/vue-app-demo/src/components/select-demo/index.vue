<script setup lang="ts">
import { ref } from 'vue'

const selected = ref('')
const framework = ref('vue')

function handleChange(event: Event) {
  selected.value = (event.currentTarget as HTMLElement & { value: string }).value
}
</script>

<template>
  <div>
    <h1>下拉选择</h1>
    <h2>基础</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select placeholder="请选择">
        <web-ui-option value="vue">Vue</web-ui-option>
        <web-ui-option value="react">React</web-ui-option>
        <web-ui-option value="svelte">Svelte</web-ui-option>
      </web-ui-select>
    </div>

    <h2>v-model 绑定</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select v-model="framework" placeholder="已选框架">
        <web-ui-option value="vue">Vue</web-ui-option>
        <web-ui-option value="react">React</web-ui-option>
        <web-ui-option value="svelte">Svelte</web-ui-option>
      </web-ui-select>
      <div>选中值：{{ framework || '无' }}</div>
    </div>

    <h2>change 事件</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select placeholder="选择后触发 change" @change="handleChange">
        <web-ui-option value="a">Option A</web-ui-option>
        <web-ui-option value="b">Option B</web-ui-option>
        <web-ui-option value="c">Option C</web-ui-option>
      </web-ui-select>
      <div>selected：{{ selected || '无' }}</div>
    </div>

    <h2>禁用选项</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select placeholder="部分禁用">
        <web-ui-option value="a">可用选项 A</web-ui-option>
        <web-ui-option value="b" disabled>禁用选项 B</web-ui-option>
        <web-ui-option value="c">可用选项 C</web-ui-option>
      </web-ui-select>
    </div>

    <h2>满宽</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select full placeholder="满宽选择">
        <web-ui-option value="a">Option A</web-ui-option>
        <web-ui-option value="b">Option B</web-ui-option>
      </web-ui-select>
    </div>

    <h2>Portal</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select portal placeholder="Portal 选择">
        <web-ui-option value="a">Option A</web-ui-option>
        <web-ui-option value="b">Option B</web-ui-option>
      </web-ui-select>
    </div>

    <h2>滚动锁定</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select lock-scroll="false" placeholder="打开时不锁定页面滚动">
        <web-ui-option value="a">Option A</web-ui-option>
        <web-ui-option value="b">Option B</web-ui-option>
      </web-ui-select>
    </div>

    <h2>禁用</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select placeholder="禁用状态" disabled>
        <web-ui-option value="a">Option A</web-ui-option>
      </web-ui-select>
    </div>
  </div>
</template>
