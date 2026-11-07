# Segmented Trigger

[English](./segmented-trigger.md) | 简体中文

`<web-ui-segmented>` 的分段按钮。`value` 是它代表的分段值；是否选中由父级 segmented 回写 `checked`；表单提交由父级负责。

点击或按 Enter / Space 派发 `change`。在组内该事件不冒泡，由父级统一派发一次组级事件；脱离组后它才冒泡，并传出组件边界。

## 示例

### 基础用法

`value` 决定哪个触发器是当前项，父级 segmented 按它回写 `checked`。默认插槽里的文本就是按钮内容。

```tsx
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

### 单项禁用

`disabled` 加在触发器上只禁用这一项：它仍留在轨道里，但不可选中，键盘导航也会跳过它。加在 `<web-ui-segmented>` 上则禁用全部触发器。

```tsx
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

### 属性

| 名称         | 说明                                                                              | 类型             | 默认值  |
| ------------ | --------------------------------------------------------------------------------- | ---------------- | ------- |
| `value`      | 分段值。                                                                          | `string`         | `''`    |
| `checked`    | 当前是否选中；由父级 segmented 回写，单独设置不会通知父级。                       | `boolean`        | `false` |
| `disabled`   | 单独禁用该触发器。                                                                | `boolean`        | `false` |
| `aria-label` | 可访问名称；插槽中只有图标时必须提供，并转发到 shadow 内的 `role="option"` 元素。 | `string \| null` | `null`  |

### 事件

| 名称     | 说明                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| `change` | 点击或 Enter / Space 激活未选中的触发器时派发；已是当前项时不派发。事件不带 `detail`。 |

### Slot

| 名称      | 说明                                                         |
| --------- | ------------------------------------------------------------ |
| `default` | 按钮内容；触发器没有标签属性，这段内容就是它的全部显示内容。 |

### 行为说明

不是表单关联组件；表单提交由父级 segmented 统一负责。

### CSS 自定义属性

| 名称                                | 说明           | 默认值                           |
| ----------------------------------- | -------------- | -------------------------------- |
| `--wui-segmented-trigger-px`        | 水平内边距     | `12px`                           |
| `--wui-segmented-trigger-bg-hover`  | 触发器悬停背景 | `--wui-color-state-layer-hover`  |
| `--wui-segmented-trigger-bg-active` | 触发器按下背景 | `--wui-color-state-layer-active` |
