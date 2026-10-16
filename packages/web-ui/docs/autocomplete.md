---
component: autocomplete
tag: web-ui-autocomplete
---

可输入并过滤候选的单值选择器：输入文本按 `option` 的 label 过滤候选，选中后把 label 回填到输入框，并把该项的 value 暴露为只读的 `selected-value`。

## 示例

### 基础

键入时按 label 过滤候选，没有匹配项时面板保持关闭；下拉面板的开合通过 `open-change` 通知。

```react
<web-ui-autocomplete placeholder="选择框架" onChange={event => console.log(event.currentTarget.value)}>
  <web-ui-option value="vue" label="Vue"></web-ui-option>
  <web-ui-option value="react" label="React"></web-ui-option>
  <web-ui-option value="svelte" label="Svelte"></web-ui-option>
</web-ui-autocomplete>
```

```vue
<template>
  <web-ui-autocomplete placeholder="选择框架" @change="onChange">
    <web-ui-option value="vue" label="Vue"></web-ui-option>
    <web-ui-option value="react" label="React"></web-ui-option>
    <web-ui-option value="svelte" label="Svelte"></web-ui-option>
  </web-ui-autocomplete>
</template>

<script setup lang="ts">
function onChange(event: Event) {
  const select = event.currentTarget as HTMLElement & { value: string }
  console.log(select.value)
}
</script>
```

### 自定义触发器

把可编辑组件放进 `trigger` 插槽即可替换默认输入框。多行触发器保留 Enter 换行语义，关闭面板改用 Escape 或 blur。

```react
<web-ui-autocomplete placeholder="描述问题" filter="none">
  <web-ui-textarea slot="trigger" rows="3"></web-ui-textarea>
  <web-ui-option value="bug" label="缺陷"></web-ui-option>
  <web-ui-option value="feature" label="需求"></web-ui-option>
</web-ui-autocomplete>
```

```vue
<template>
  <web-ui-autocomplete placeholder="描述问题" filter="none">
    <web-ui-textarea slot="trigger" rows="3"></web-ui-textarea>
    <web-ui-option value="bug" label="缺陷"></web-ui-option>
    <web-ui-option value="feature" label="需求"></web-ui-option>
  </web-ui-autocomplete>
</template>
```

### 允许自定义值

开启 `allow-custom-value` 后，无匹配且无活动项时 Enter 会把输入原文作为 custom value 提交，`selected-value` 保持为空。

```react
<web-ui-autocomplete allow-custom-value placeholder="输入或选择标签"></web-ui-autocomplete>
```

```vue
<template>
  <web-ui-autocomplete allow-custom-value placeholder="输入或选择标签"></web-ui-autocomplete>
</template>
```

## API

### Props

| 名称                 | 说明                                                           | 类型                  | 默认值       |
| -------------------- | -------------------------------------------------------------- | --------------------- | ------------ |
| `placeholder`        | 输入框占位文本。                                               | `string`              | `''`         |
| `borderless`         | ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。 | `boolean`             | `false`      |
| `disabled`           | 禁用态，不可输入、不可展开下拉。                               | `boolean`             | `false`      |
| `readonly`           | 只读态：不可输入、不可展开下拉。                               | `boolean`             | `false`      |
| `required`           | 必填校验。                                                     | `boolean`             | `false`      |
| `portal`             | 在 theme-owned overlay root 中渲染下拉面板。                   | `boolean`             | `false`      |
| `no-scroll-lock`     | 打开时不锁定页面滚动。                                         | `boolean`             | `false`      |
| `allow-custom-value` | 允许 Enter 提交不在候选中的输入原文。                          | `boolean`             | `false`      |
| `overlayContainer`   | 显式 Portal 容器（property，不是 attribute）。                 | `OverlayContainer`    | —            |
| `name`               | 表单字段名。                                                   | `string`              | `''`         |
| `aria-label`         | 无障碍名称。                                                   | `string \| null`      | `null`       |
| `aria-labelledby`    | 无障碍名称引用。                                               | `string \| undefined` | —            |
| `filter`             | 候选过滤模式：`contains`（默认）、`prefix` 或 `none`。         | `FilterMode`          | `'contains'` |
| `value`              | 当前输入文本，也是表单提交值。                                 | `string`              | `''`         |

### Events

| 名称          | 说明                                     |
| ------------- | ---------------------------------------- |
| `input`       | 输入时触发，`value` 为当前文本。         |
| `change`      | 选中候选或提交 custom value 时触发。     |
| `focus`       | 触发器获得焦点时触发。                   |
| `blur`        | 触发器失去焦点时触发。                   |
| `open-change` | 下拉面板开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                                 |
| --------- | ------------------------------------ |
| `trigger` | 自定义触发区域内容，替换默认输入框。 |
| `default` | 投影 `<web-ui-option>` 候选。        |

### Methods

| 名称      | 说明                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `focus()` | 聚焦当前触发器：`web-ui-input` / `web-ui-textarea` 触发器把焦点交给内部原生控件，没有自己的 focus 重定向的自定义触发器则聚焦触发器元素自身。 |
| `blur()`  | 让当前触发器失焦。                                                                                                                           |
