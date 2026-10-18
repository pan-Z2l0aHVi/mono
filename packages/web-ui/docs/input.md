---
component: input
tag: web-ui-input
---

文本输入框，支持清除按钮与前后缀插槽，并与原生 `<form>` 集成；宿主自身不可聚焦，焦点委托到 shadow 内的原生 input。

## 示例

### 基础

`type` 透传给内部原生 input，`placeholder` 在空值时显示。

```react
<web-ui-input type="email" placeholder="name@example.com"></web-ui-input>
```

```vue
<template>
  <web-ui-input type="email" placeholder="name@example.com"></web-ui-input>
</template>
```

### 清除按钮

`clearable` 在有值时显示清除按钮，`full` 让输入框占满父容器宽度。点击清除按钮会清空值，并**同时派发 `input` 与 `change`**（清除是一次已提交的离散变更，不是连续输入，只监听 `change` 的消费者也能收到）。

```react
<web-ui-input clearable full placeholder="输入关键词"></web-ui-input>
```

```vue
<template>
  <web-ui-input clearable full placeholder="输入关键词"></web-ui-input>
</template>
```

### 前后缀

`prefix` / `suffix` 插槽在输入区两侧放图标或文字，`aria-label` 为无可见标签的输入提供无障碍名称。

```react
<web-ui-input aria-label="搜索" clearable placeholder="搜索组件">
  <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
</web-ui-input>
```

```vue
<template>
  <web-ui-input aria-label="搜索" clearable placeholder="搜索组件">
    <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
  </web-ui-input>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### 受控值

`value` 是输入值也是表单提交值，`input` 每次输入都触发，`change` 在失焦或去抖提交时触发。

```react
const [keyword, setKeyword] = useState('')

return (
  <web-ui-input
    value={keyword}
    placeholder="输入后实时搜索"
    onInput={event => setKeyword(event.currentTarget.value)}
  ></web-ui-input>
)
```

```vue
<template>
  <web-ui-input
    :value="keyword"
    placeholder="输入后实时搜索"
    @input="keyword = $event.currentTarget.value"
  ></web-ui-input>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const keyword = ref('')
</script>
```

## API

### Props

| 名称          | 说明                                                           | 类型             | 默认值   |
| ------------- | -------------------------------------------------------------- | ---------------- | -------- |
| `type`        | HTML input 类型。                                              | `string`         | `'text'` |
| `placeholder` | 占位文本。                                                     | `string`         | `''`     |
| `name`        | 表单字段名。                                                   | `string`         | `''`     |
| `disabled`    | 禁用状态。                                                     | `boolean`        | `false`  |
| `readonly`    | 只读状态。                                                     | `boolean`        | `false`  |
| `required`    | 必填校验。                                                     | `boolean`        | `false`  |
| `clearable`   | 显示清除按钮。                                                 | `boolean`        | `false`  |
| `full`        | 占满父容器宽度。                                               | `boolean`        | `false`  |
| `borderless`  | ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。 | `boolean`        | `false`  |
| `aria-label`  | 无障碍标签。                                                   | `string \| null` | `null`   |
| `value`       | 输入值。                                                       | `string`         | `''`     |

### Events

| 名称     | 说明                                           |
| -------- | ---------------------------------------------- |
| `input`  | 输入时触发。                                   |
| `change` | 提交时触发（失焦、回车，或点击清除按钮清空）。 |
| `focus`  | 获得焦点时触发。                               |
| `blur`   | 失去焦点时触发。                               |

### Slots

| 名称     | 说明                     |
| -------- | ------------------------ |
| `prefix` | 输入区左侧的图标或文字。 |
| `suffix` | 输入区右侧的图标或文字。 |

### Methods

| 名称              | 说明                                                  |
| ----------------- | ----------------------------------------------------- |
| `focus(options?)` | 聚焦 shadow 内的原生 input；`disabled` 时不产生效果。 |
| `blur()`          | 让 shadow 内的原生 input 失焦。                       |
| `select()`        | 全选当前值；`disabled` 时不产生效果。                 |

### CSS Custom Properties

| 名称                      | 说明         | 默认值                           |
| ------------------------- | ------------ | -------------------------------- |
| `--wui-input-clear-color` | 清除按钮颜色 | `var(--wui-color-text-tertiary)` |
