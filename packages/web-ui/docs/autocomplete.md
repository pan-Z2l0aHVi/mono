---
component: autocomplete
tag: web-ui-autocomplete
---

可输入并过滤候选的单值选择器：输入文本按 `option` 的 label 过滤候选，选中后把 label 回填到 input，并把该项的 value 暴露为只读的 `selected-value`。

## 示例

### 基础

键入时按 label 过滤候选，没有匹配项时 panel 保持关闭；下拉 panel 的开合通过 `open-change` 通知。

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

### 自定义 trigger

把可编辑组件放进 `trigger` 插槽即可替换默认 input。多行 trigger 保留 Enter 换行语义，关闭 panel 改用 Escape 或 blur。

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
<web-ui-autocomplete allow-custom-value placeholder="输入或选择 label"></web-ui-autocomplete>
```

```vue
<template>
  <web-ui-autocomplete allow-custom-value placeholder="输入或选择 label"></web-ui-autocomplete>
</template>
```

## API

### Props

| 名称                 | 说明                                                           | 类型                  | 默认值       |
| -------------------- | -------------------------------------------------------------- | --------------------- | ------------ |
| `placeholder`        | input 占位文本。                                               | `string`              | `''`         |
| `borderless`         | ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。 | `boolean`             | `false`      |
| `disabled`           | 禁用态，不可输入、不可展开下拉。                               | `boolean`             | `false`      |
| `readonly`           | 只读态：不可输入、不可展开下拉。                               | `boolean`             | `false`      |
| `required`           | 必填校验。                                                     | `boolean`             | `false`      |
| `portal`             | 在 theme-owned overlay root 中渲染下拉 panel。                 | `boolean`             | `false`      |
| `no-scroll-lock`     | 打开时不锁定页面滚动。                                         | `boolean`             | `false`      |
| `allow-custom-value` | 允许 Enter 提交不在候选中的输入原文。                          | `boolean`             | `false`      |
| `overlayContainer`   | 显式 Portal 容器（property，不是 attribute）。                 | `OverlayContainer`    | —            |
| `name`               | 表单字段名。                                                   | `string`              | `''`         |
| `aria-label`         | 无障碍名称。                                                   | `string \| null`      | `null`       |
| `aria-labelledby`    | 无障碍名称引用。                                               | `string \| undefined` | —            |
| `filter`             | 候选过滤模式：`contains`（默认）、`prefix` 或 `none`。         | `FilterMode`          | `'contains'` |
| `value`              | 当前输入文本，也是表单提交值。                                 | `string`              | `''`         |

### Events

| 名称          | 说明                                        |
| ------------- | ------------------------------------------- |
| `input`       | 输入时触发，`value` 为当前文本。            |
| `change`      | 选中候选或提交 custom value 时触发。        |
| `focus`       | trigger 获得焦点时触发。                    |
| `blur`        | trigger 失去焦点时触发。                    |
| `open-change` | 下拉 panel 开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                                 |
| --------- | ------------------------------------ |
| `trigger` | 自定义触发区域内容，替换默认 input。 |
| `default` | 投影 `<web-ui-option>` 候选。        |

### Methods

| 名称      | 说明                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `focus()` | 聚焦当前 trigger：`web-ui-input` / `web-ui-textarea` trigger 把焦点交给内部原生控件，没有自己的 focus 重定向的自定义 trigger 则聚焦 trigger 元素自身。 |
| `blur()`  | 让当前 trigger 失焦。                                                                                                                                  |

### 行为说明

键入时按 label 过滤候选（`contains` 或 `prefix`，`none` 关闭过滤）。没有匹配项时下拉 panel 保持关闭；删除字符后重新出现匹配项时，panel 会再次打开。选择 option 时文本回填为该项 label，`selected-value` 暴露该项的 value；`change` 在选择提交时触发。支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航。

Portal panel 创建时会镜像 host 上解析后的这些变量；更新 host 后需重新打开 Portal panel 才会生效。

### trigger

默认 trigger 是 shadow 内的 `web-ui-input`。把任意可编辑组件放进 `trigger` slot 即可替换它——包装 div 继续承载 combobox ARIA，并以 `data-custom-trigger` 标记当前使用自定义 trigger，overlay 始终以 trigger 元素为锚点。组件的 `focus()` / `blur()` 委托到当前生效的 trigger：`web-ui-input` 与 `web-ui-textarea` 会把焦点落到内部原生控件；自定义 trigger 没有自己的 focus 重定向时，聚焦 trigger 元素自身。

```html
<web-ui-autocomplete placeholder="描述问题">
  <web-ui-textarea slot="trigger" rows="3"></web-ui-textarea>
  <web-ui-option value="bug" label="缺陷"></web-ui-option>
  <web-ui-option value="feature" label="需求"></web-ui-option>
</web-ui-autocomplete>
```

自定义 trigger 与默认 trigger 共用同一份契约：字符串 `value` 承载文本、可聚焦，并派发组件委托监听的事件（`input`、`click`、`focus`、`blur`）。`web-ui-input` 与 `web-ui-textarea` 开箱即用；自定义元素只要暴露字符串 `value` property 即可接入。包装 div 不占 tab 位（`tabindex="-1"`）：顺序焦点归 trigger 自身，自定义 trigger 必须可聚焦，键盘用户才能到达 combobox。

多行 trigger（可编辑元素为 `<textarea>`）保留 Enter 换行语义：Enter 不会选中高亮项，也不会提交 custom value，关闭 panel 用 Escape 或 blur。选择 option 仍会把该项 label 回写到 trigger。单行自定义 trigger 保持默认的 Enter 语义。panel 打开时 ArrowUp/ArrowDown 适用同一例外：方向键移动文本光标而不导航候选，该状态下键盘无法导航 option——用指针点击选择。panel 关闭时 ArrowDown/ArrowUp 仍可打开 panel。

启用 `allow-custom-value` 后，无匹配且无活动 option 时，Enter 会把当前输入原文作为 custom value 提交并保持 panel 关闭；`change` 会触发，`selected-value` 保持为空。组件不会自动创建 option，也不会 trim 原文。命中禁用 option 的文本不会绕过禁用语义，也不会派生为已选 option。

### CSS Custom Properties

| 名称                            | 说明                 | 默认值  |
| ------------------------------- | -------------------- | ------- |
| `--wui-autocomplete-max-width`  | 下拉框最大宽度       | `500px` |
| `--wui-autocomplete-max-height` | 下拉滚动区域最大高度 | `200px` |
| `--wui-overlay-min-width`       | 下拉框最小宽度       | `200px` |
