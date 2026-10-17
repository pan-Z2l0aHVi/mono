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

| 名称              | 说明                                                           | 类型                  | 默认值  |
| ----------------- | -------------------------------------------------------------- | --------------------- | ------- |
| `placeholder`     | 占位文本。                                                     | `string`              | `''`    |
| `name`            | 表单字段名。                                                   | `string`              | `''`    |
| `disabled`        | 禁用状态。                                                     | `boolean`             | `false` |
| `readonly`        | 只读状态。                                                     | `boolean`             | `false` |
| `required`        | 必填校验。                                                     | `boolean`             | `false` |
| `full`            | 占满父容器宽度。                                               | `boolean`             | `false` |
| `clearable`       | 显示清除按钮。                                                 | `boolean`             | `false` |
| `borderless`      | ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。 | `boolean`             | `false` |
| `rows`            | 显示行数。                                                     | `number`              | `3`     |
| `minlength`       | 最小长度校验。                                                 | `number \| undefined` | —       |
| `maxlength`       | 最大长度校验。                                                 | `number \| undefined` | —       |
| `autosize`        | 自动调整高度，同时强制 `resize: none`。                        | `boolean`             | `false` |
| `max-height`      | 自动高度上限（px），0 表示不限制。                             | `number`              | `0`     |
| `aria-label`      | 无障碍标签。                                                   | `string \| null`      | `null`  |
| `aria-labelledby` | 无障碍标签引用。                                               | `string \| undefined` | —       |
| `value`           | 输入值。                                                       | `string`              | `''`    |

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

### Methods

| 名称              | 说明                                                     |
| ----------------- | -------------------------------------------------------- |
| `focus(options?)` | 聚焦 shadow 内的原生 textarea；`disabled` 时不产生效果。 |
| `blur()`          | 让 shadow 内的原生 textarea 失焦。                       |
| `select()`        | 全选当前值；`disabled` 时不产生效果。                    |

### CSS Custom Properties

| 名称                         | 说明         | 默认值                           |
| ---------------------------- | ------------ | -------------------------------- |
| `--wui-textarea-width`       | 文本域宽度   | `200px`                          |
| `--wui-textarea-clear-color` | 清除按钮颜色 | `var(--wui-color-text-tertiary)` |
