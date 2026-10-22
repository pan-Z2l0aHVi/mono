---
component: radio-group
tag: web-ui-radio-group
---

一组 `<web-ui-radio>` 的容器：把成员的选中状态收敛成单个 `value`，选中变化时统一派发 `input` / `change`，并负责组级禁用与必填校验。成员自己声明的 `name` 在组内不参与提交，表单字段名取组上的 `name`。

## 示例

### 单选组 {#basic}

组持有唯一的值：`value` 决定谁被选中，成员的选中态由组下发，页面只读组的值。

Tab 进入组时，焦点落在已选中的成员；若尚无选中项，则落在第一个启用成员。组内只有这个成员是 Tab stop。方向键在启用成员间循环移动焦点并立即选中；`Home` 和 `End` 分别选中第一个和最后一个启用成员。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [size, setSize] = useState('m')

  return (
    <web-ui-radio-group name="size" value={size} onInput={event => setSize(event.currentTarget.value)}>
      <web-ui-radio value="s">小</web-ui-radio>
      <web-ui-radio value="m">中</web-ui-radio>
      <web-ui-radio value="l">大</web-ui-radio>
    </web-ui-radio-group>
  )
}
```

```vue
<template>
  <web-ui-radio-group name="size" :value="size" @input="onInput">
    <web-ui-radio value="s">小</web-ui-radio>
    <web-ui-radio value="m">中</web-ui-radio>
    <web-ui-radio value="l">大</web-ui-radio>
  </web-ui-radio-group>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiRadioGroup } from '@greypan/web-ui'
import { ref } from 'vue'

const size = ref('m')

function onInput(event: WebUiEvent<WebUiRadioGroup, 'input'>) {
  size.value = event.currentTarget.value
}
</script>
```

### 排列方向 {#direction}

`direction` 决定成员横排还是竖排，默认 `vertical`；非法值也回退到 `vertical`。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">direction: vertical（默认）</span>
        <web-ui-radio-group value="s">
          <web-ui-radio value="s">小</web-ui-radio>
          <web-ui-radio value="m">中</web-ui-radio>
        </web-ui-radio-group>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
        <web-ui-radio-group direction="horizontal" value="s">
          <web-ui-radio value="s">小</web-ui-radio>
          <web-ui-radio value="m">中</web-ui-radio>
        </web-ui-radio-group>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap gap-8">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: vertical（默认）</span>
      <web-ui-radio-group value="s">
        <web-ui-radio value="s">小</web-ui-radio>
        <web-ui-radio value="m">中</web-ui-radio>
      </web-ui-radio-group>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
      <web-ui-radio-group direction="horizontal" value="s">
        <web-ui-radio value="s">小</web-ui-radio>
        <web-ui-radio value="m">中</web-ui-radio>
      </web-ui-radio-group>
    </div>
  </div>
</template>
```

### 成员间距 {#gap}

成员之间的间距走 `--wui-radio-group-gap`，默认经 `--wui-space-2` 解析成 8px；覆盖它只换间距，不动排列方向。下面两条是同一份成员，只有这个变量不同。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-6">
      <web-ui-radio-group direction="horizontal" value="s">
        <web-ui-radio value="s">小</web-ui-radio>
        <web-ui-radio value="m">中</web-ui-radio>
        <web-ui-radio value="l">大</web-ui-radio>
      </web-ui-radio-group>

      <web-ui-radio-group direction="horizontal" className="[--wui-radio-group-gap:16px]" value="s">
        <web-ui-radio value="s">小</web-ui-radio>
        <web-ui-radio value="m">中</web-ui-radio>
        <web-ui-radio value="l">大</web-ui-radio>
      </web-ui-radio-group>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-6">
    <web-ui-radio-group direction="horizontal" value="s">
      <web-ui-radio value="s">小</web-ui-radio>
      <web-ui-radio value="m">中</web-ui-radio>
      <web-ui-radio value="l">大</web-ui-radio>
    </web-ui-radio-group>

    <web-ui-radio-group direction="horizontal" class="[--wui-radio-group-gap:16px]" value="s">
      <web-ui-radio value="s">小</web-ui-radio>
      <web-ui-radio value="m">中</web-ui-radio>
      <web-ui-radio value="l">大</web-ui-radio>
    </web-ui-radio-group>
  </div>
</template>
```

### 组级禁用与必填 {#disabled-required}

`disabled` 关掉整组的交互，这个禁用态会下发给成员；`required` 让原生表单校验在组没有值时拦截提交。

```tsx
export default function Demo() {
  return (
    <web-ui-radio-group name="plan" value="basic" required disabled>
      <web-ui-radio value="basic">基础版</web-ui-radio>
      <web-ui-radio value="pro">专业版</web-ui-radio>
    </web-ui-radio-group>
  )
}
```

```vue
<template>
  <web-ui-radio-group name="plan" value="basic" required disabled>
    <web-ui-radio value="basic">基础版</web-ui-radio>
    <web-ui-radio value="pro">专业版</web-ui-radio>
  </web-ui-radio-group>
</template>
```

## API

### Props

| 名称        | 说明                                     | 类型                         | 默认值       |
| ----------- | ---------------------------------------- | ---------------------------- | ------------ |
| `name`      | 表单字段名。                             | `string`                     | `''`         |
| `disabled`  | 禁用整组，并把禁用态下发给成员。         | `boolean`                    | `false`      |
| `required`  | 必填校验：组没有值时拦截原生提交。       | `boolean`                    | `false`      |
| `direction` | 成员排列方向。                           | `'horizontal' \| 'vertical'` | `'vertical'` |
| `value`     | 当前选中的值，也是成员选中态的唯一来源。 | `string`                     | `''`         |

### Events

| 名称     | 说明                                           |
| -------- | ---------------------------------------------- |
| `input`  | 选中变化时触发，`currentTarget.value` 是新值。 |
| `change` | 与 `input` 一起派发，语义上表示一次确认。      |

### Slots

| 名称      | 说明                           |
| --------- | ------------------------------ |
| `default` | 组内的 `<web-ui-radio>` 成员。 |

### 行为说明

`disabled` 提供继承的有效禁用状态，不改写子项自身的 `disabled` 属性。`direction` 传入非法值时回退为 `vertical`。

在 group 元素本身，或同一个 `<web-ui-theme>` 作用域内的祖先元素上设置。theme 宿主会为自己的子树声明该间距阶，写在 `<web-ui-theme>` 元素之外的覆盖到不了 group。它的默认值现在经 `--wui-space-2` 解析，所以在 theme 宿主上覆盖该级会连带改变成员间距；显式设置这个 token 仍然优先于两者。

```css
web-ui-radio-group {
  --wui-radio-group-gap: 16px;
}
```

### CSS Custom Properties

| 名称                    | 说明                  | 默认值               |
| ----------------------- | --------------------- | -------------------- |
| `--wui-radio-group-gap` | 成员 radio 之间的间距 | `var(--wui-space-2)` |
