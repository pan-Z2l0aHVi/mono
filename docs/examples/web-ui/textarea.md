---
component: textarea
tag: web-ui-textarea
---

多行文本输入框，支持清除按钮、自动高度与前后缀插槽；焦点委托到 shadow 内的原生 textarea。

## 示例

### 基础

`rows` 决定初始显示行数，`placeholder` 在空值时显示。

```react
<web-ui-textarea rows={4} placeholder="写下你的想法"></web-ui-textarea>
```

```vue
<template>
  <web-ui-textarea :rows="4" placeholder="写下你的想法"></web-ui-textarea>
</template>
```

### 自动高度

`autosize` 按内容撑高并强制 `resize: none`；`max-height` 是自动高度上限，0 表示不限。

```react
<web-ui-textarea autosize max-height={320} placeholder="输入多行内容，高度自适应"></web-ui-textarea>
```

```vue
<template>
  <web-ui-textarea autosize :max-height="320" placeholder="输入多行内容，高度自适应"></web-ui-textarea>
</template>
```

### 前后缀

`prefix` / `suffix` 插槽在文本域两侧放图标或计数。

```react
<web-ui-textarea clearable aria-label="备注">
  <span slot="prefix">📝</span>
  <span slot="suffix">最多 200 字</span>
</web-ui-textarea>
```

```vue
<template>
  <web-ui-textarea clearable aria-label="备注">
    <span slot="prefix">📝</span>
    <span slot="suffix">最多 200 字</span>
  </web-ui-textarea>
</template>
```

## API

### Props

| 名称              | 说明                                                           |
| ----------------- | -------------------------------------------------------------- |
| `placeholder`     | 占位文本。                                                     |
| `name`            | 表单字段名。                                                   |
| `disabled`        | 禁用状态。                                                     |
| `readonly`        | 只读状态。                                                     |
| `required`        | 必填校验。                                                     |
| `full`            | 占满父容器宽度。                                               |
| `clearable`       | 显示清除按钮。                                                 |
| `borderless`      | ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。 |
| `rows`            | 显示行数。                                                     |
| `minlength`       | 最小长度校验。                                                 |
| `maxlength`       | 最大长度校验。                                                 |
| `autosize`        | 自动调整高度，同时强制 `resize: none`。                        |
| `max-height`      | 自动高度上限（px），0 表示不限制。                             |
| `aria-label`      | 无障碍标签。                                                   |
| `aria-labelledby` | 无障碍标签引用。                                               |
| `value`           | 输入值。                                                       |

### Events

| 名称     | 说明             |
| -------- | ---------------- |
| `input`  | 输入时触发。     |
| `change` | 提交时触发。     |
| `focus`  | 获得焦点时触发。 |
| `blur`   | 失去焦点时触发。 |

### Slots

| 名称     | 说明                     |
| -------- | ------------------------ |
| `prefix` | 文本域左侧的图标或文字。 |
| `suffix` | 文本域右侧的图标或文字。 |
