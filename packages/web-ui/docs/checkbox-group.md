---
component: checkbox-group
tag: web-ui-checkbox-group
---

一组 `<web-ui-checkbox>` 的容器：把成员的选中状态收敛成 `string[]`，变化时统一派发 `input` / `change`，并负责组级禁用与必填校验。属性形式的值是逗号分隔的字符串（`value="apple,cherry"`），JS 侧读到的始终是数组。

## 示例

### 多选组 {#basic}

组的 `value` 是会选中的那些项，成员按自己是否在数组里决定选中。

```react
import { useState } from 'react'

export default function Demo() {
  const [picked, setPicked] = useState(['banana'])

  return (
    <web-ui-checkbox-group name="fruit" value={picked} onInput={event => setPicked(event.currentTarget.value)}>
      <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
      <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
    </web-ui-checkbox-group>
  )
}
```

```vue
<template>
  <web-ui-checkbox-group name="fruit" :value="picked" @input="onInput">
    <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
    <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
    <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
  </web-ui-checkbox-group>
</template>

<script setup lang="ts">
import type { WebUiCheckboxGroup, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const picked = ref(['banana'])

function onInput(event: WebUiEvent<WebUiCheckboxGroup, 'input'>) {
  picked.value = event.currentTarget.value
}
</script>
```

### 排列方向 {#direction}

`direction` 决定成员横排还是竖排，默认 `vertical`；成员之间的间距由 `--wui-checkbox-group-gap` 控制。

```react
export default function Demo() {
  return (
    <web-ui-checkbox-group direction="horizontal" value={['apple']}>
      <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
      <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
    </web-ui-checkbox-group>
  )
}
```

```vue
<template>
  <web-ui-checkbox-group direction="horizontal" :value="['apple']">
    <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
    <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
    <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
  </web-ui-checkbox-group>
</template>
```

### 组级禁用与必填 {#disabled-required}

`disabled` 关掉整组的交互，这个禁用态会下发给成员；`required` 让原生表单校验在组为空时拦截提交。

```react
export default function Demo() {
  return (
    <web-ui-checkbox-group name="toppings" value={['cheese']} required disabled>
      <web-ui-checkbox value="cheese">芝士</web-ui-checkbox>
      <web-ui-checkbox value="bacon">培根</web-ui-checkbox>
    </web-ui-checkbox-group>
  )
}
```

```vue
<template>
  <web-ui-checkbox-group name="toppings" :value="['cheese']" required disabled>
    <web-ui-checkbox value="cheese">芝士</web-ui-checkbox>
    <web-ui-checkbox value="bacon">培根</web-ui-checkbox>
  </web-ui-checkbox-group>
</template>
```

## API

### Props

| 名称        | 说明                                     | 类型                         | 默认值       |
| ----------- | ---------------------------------------- | ---------------------------- | ------------ |
| `name`      | 表单字段名，每个选中项各占一个同名字段。 | `string`                     | `''`         |
| `disabled`  | 禁用整组，并把禁用态下发给成员。         | `boolean`                    | `false`      |
| `required`  | 必填校验：组为空时拦截原生提交。         | `boolean`                    | `false`      |
| `direction` | 成员排列方向。                           | `'horizontal' \| 'vertical'` | `'vertical'` |
| `value`     | 当前选中的值集合。                       | `string[]`                   | `[]`         |

### Events

| 名称     | 说明                                                   |
| -------- | ------------------------------------------------------ |
| `input`  | 选中集合变化时触发，`currentTarget.value` 是新的数组。 |
| `change` | 与 `input` 一起派发，语义上表示一次确认。              |

### Slots

| 名称      | 说明                              |
| --------- | --------------------------------- |
| `default` | 组内的 `<web-ui-checkbox>` 成员。 |
