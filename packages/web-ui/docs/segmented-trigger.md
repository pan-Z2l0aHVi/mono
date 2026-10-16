---
component: segmented-trigger
tag: web-ui-segmented-trigger
---

`<web-ui-segmented>` 的分段按钮：`value` 是它代表的分段值，选中由父级 segmented 回写 `checked`，表单提交归父级。点击或 Enter / Space 派发 `change`——在组内该事件不冒泡，由父级统一派发一次组级事件；脱离组时才冒泡并穿透 shadow。

## 示例

### 基础 {#basic}

`value` 决定哪个 trigger 是当前项，容器按它回写 `checked`；默认插槽里的文本就是按钮内容。

```react
import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('day')

  return (
    <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
      <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
    </web-ui-segmented>
  )
}
```

```vue
<template>
  <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('day')
</script>
```

### 单独禁用 {#disabled}

`disabled` 加在 trigger 上只禁这一项：它留在轨道里，但不可选中，键盘导航也跳过它。加在 `<web-ui-segmented>` 上则是禁用全部 trigger。

```react
import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('list')

  return (
    <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
      <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="grid" disabled>
        网格
      </web-ui-segmented-trigger>
    </web-ui-segmented>
  )
}
```

```vue
<template>
  <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="grid" disabled>网格</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('list')
</script>
```

## API

### Props

| 名称       | 说明                                                | 类型      | 默认值  |
| ---------- | --------------------------------------------------- | --------- | ------- |
| `value`    | 分段值。                                            | `string`  | `''`    |
| `checked`  | 当前选中；由父级 segmented 回写，单独写不通知容器。 | `boolean` | `false` |
| `disabled` | 单独禁用该 trigger。                                | `boolean` | `false` |

### Events

| 名称     | 说明                                                                                    |
| -------- | --------------------------------------------------------------------------------------- |
| `change` | 点击或 Enter / Space 激活未选中的 trigger 时派发；已是当前项时不派发，且不带 `detail`。 |

### Slots

| 名称      | 说明                                                              |
| --------- | ----------------------------------------------------------------- |
| `default` | 按钮内容；trigger 没有 label 属性，这段内容就是它的全部显示内容。 |
