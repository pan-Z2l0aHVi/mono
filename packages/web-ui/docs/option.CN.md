---
component: option
tag: web-ui-option
---

`<web-ui-select>` 与 `<web-ui-autocomplete>` 的 option 载体：`value` 是选中时提交的值，`label` 是显示文本（缺省时取自身的文本内容），`prefix` / `suffix` 插槽放两端的 icon。

它不派发面向使用方的事件——挂载、更新与卸载时发出的注册握手只由父级容器消费；选中态由容器回写 `selected`。

## Samples

### Basic option

`label` 决定容器里显示什么，`value` 是容器派发出去的值。

```tsx
export default function Demo() {
  return (
    <web-ui-select placeholder="请选择">
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="react" label="React"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte"></web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select placeholder="请选择">
    <web-ui-option value="vue" label="Vue"></web-ui-option>
    <web-ui-option value="react" label="React"></web-ui-option>
    <web-ui-option value="svelte" label="Svelte"></web-ui-option>
  </web-ui-select>
</template>
```

### Prefix and suffix icons

不写 `label` 时，`label` 取默认插槽的文本；`prefix` 与 `suffix` 不参与这段文本。

```tsx
import { lucideImage, lucideStar } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-select placeholder="请选择">
      <web-ui-option value="photo">
        <web-ui-icon slot="prefix" size={14} icon={lucideImage}></web-ui-icon>
        照片
      </web-ui-option>
      <web-ui-option value="starred">
        <web-ui-icon slot="prefix" size={14} icon={lucideStar}></web-ui-icon>
        收藏
      </web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select placeholder="请选择">
    <web-ui-option value="photo">
      <web-ui-icon slot="prefix" :size="14" :icon="lucideImage"></web-ui-icon>
      照片
    </web-ui-option>
    <web-ui-option value="starred">
      <web-ui-icon slot="prefix" :size="14" :icon="lucideStar"></web-ui-icon>
      收藏
    </web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideImage, lucideStar } from '@greypan/web-ui/icons'
</script>
```

### Disabled items

`disabled` 的项留在列表里，但不可选中，键盘导航也会跳过它。

```tsx
export default function Demo() {
  return (
    <web-ui-select placeholder="请选择">
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte（暂不可用）" disabled></web-ui-option>
    </web-ui-select>
  )
}
```

```vue
<template>
  <web-ui-select placeholder="请选择">
    <web-ui-option value="vue" label="Vue"></web-ui-option>
    <web-ui-option value="svelte" label="Svelte（暂不可用）" disabled></web-ui-option>
  </web-ui-select>
</template>
```

## API

### Props

| 名称       | 说明                                                 | 类型      | 默认值  |
| ---------- | ---------------------------------------------------- | --------- | ------- |
| `value`    | 选中时提交给容器的值。                               | `string`  | `''`    |
| `label`    | 显示文本；缺省时取默认插槽的文本内容。               | `string`  | `''`    |
| `disabled` | 禁用项：留在列表里但不可选中，键盘导航跳过它。       | `boolean` | `false` |
| `selected` | 选中态，由容器回写；写 `selected` 属性不会通知容器。 | `boolean` | `false` |

### Slots

| 名称      | 说明                                            |
| --------- | ----------------------------------------------- |
| `prefix`  | 文本左侧的 icon 或标识。                        |
| `default` | option 文本；`label` 为空时这段文本就是 label。 |
| `suffix`  | 文本右侧的 icon 或标识。                        |

### 行为说明

非表单关联组件（父级 select 统一提交）。

### CSS Custom Properties

| 名称                         | 说明                        | 默认值  |
| ---------------------------- | --------------------------- | ------- |
| `--wui-option-check-display` | 选中勾选 icon 的 display 值 | `block` |
