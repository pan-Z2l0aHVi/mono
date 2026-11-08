# Option

[English](./option.md) | 简体中文

`<web-ui-select>` 与 `<web-ui-autocomplete>` 里的选项元素。`value` 是选中时提交的值，`label` 是显示文本（缺省时取自身的文本内容），`prefix` / `suffix` 插槽放两端的图标。

它不派发面向使用方的事件。挂载、更新与卸载时发出的注册握手只由父级容器消费。选中态由容器通过 `selected` 回写。

## 示例

### 基础选项

`label` 是显示文本，`value` 是选中后容器交回的值。

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

### 前缀和后缀图标

不写 `label` 时，显示文本取默认插槽的文本；`prefix` 与 `suffix` 的内容不计入这段文本。

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

### 禁用选项

`disabled` 的项留在列表里，但不能选中，键盘导航也会跳过它。

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

### 属性

| 名称       | 说明                                                 | 类型      | 默认值  |
| ---------- | ---------------------------------------------------- | --------- | ------- |
| `value`    | 选中时提交给容器的值。                               | `string`  | `''`    |
| `label`    | 显示文本；缺省时取默认插槽的文本内容。               | `string`  | `''`    |
| `disabled` | 禁用项：留在列表里但不可选中，键盘导航跳过它。       | `boolean` | `false` |
| `selected` | 选中态，由容器回写；写 `selected` 属性不会通知容器。 | `boolean` | `false` |

### Slot

| 名称      | 说明                                       |
| --------- | ------------------------------------------ |
| `prefix`  | 文本左侧的图标或标识。                     |
| `default` | 选项文本；`label` 为空时这段文本就是标签。 |
| `suffix`  | 文本右侧的图标或标识。                     |

### 行为说明

键盘导航的活动项与悬停使用同一档背景加深，文字颜色保持不变。

非表单关联组件（父级 select 统一提交）。

### CSS 自定义属性

| 名称                         | 说明                        | 默认值  |
| ---------------------------- | --------------------------- | ------- |
| `--wui-option-check-display` | 选中勾选图标的 `display` 值 | `block` |
