---
component: badge
tag: web-ui-badge
---

badge / 通知计数：把 `count` 角标叠加在默认插槽内容的一角，`dot` 模式只显示一个圆点。

## 示例

### 基础 {#basic}

默认插槽是要装饰的内容，`count` 就是角标上的数字；`count` 为 0 时角标不画，被装饰的内容照常显示，要让 0 也占位就写 `show-zero`。图形（icon）和控件（button）都能当内容被包住。

```tsx
import { lucideBell } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={5}>
        <web-ui-button variant="secondary">消息</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={7}>
        <web-ui-icon icon={lucideBell} size={22}></web-ui-icon>
      </web-ui-badge>

      <web-ui-badge count={0}>
        <web-ui-button variant="secondary">草稿（count 为 0）</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={0} show-zero>
        <web-ui-button variant="secondary">收件箱（show-zero）</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="5">
      <web-ui-button variant="secondary">消息</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="7">
      <web-ui-icon :icon="lucideBell" :size="22"></web-ui-icon>
    </web-ui-badge>

    <web-ui-badge :count="0">
      <web-ui-button variant="secondary">草稿（count 为 0）</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="0" show-zero>
      <web-ui-button variant="secondary">收件箱（show-zero）</web-ui-button>
    </web-ui-badge>
  </div>
</template>

<script setup lang="ts">
import { lucideBell } from '@greypan/web-ui/icons'
</script>
```

### 数字上限 {#max}

`count` 超过 `max` 时画 `max+` 而不是把位数摊开；`max` 默认 99，三位数就已经是上限的形状。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={128}>
        <web-ui-button variant="secondary">默认上限 99</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={10} max={9}>
        <web-ui-button variant="secondary">max 为 9</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={99999} max={9999}>
        <web-ui-button variant="secondary">max 为 9999</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="128">
      <web-ui-button variant="secondary">默认上限 99</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="10" :max="9">
      <web-ui-button variant="secondary">max 为 9</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="99999" :max="9999">
      <web-ui-button variant="secondary">max 为 9999</web-ui-button>
    </web-ui-badge>
  </div>
</template>
```

### 点模式 {#dot}

`dot` 只画一枚圆点、不画数字，用来表示「有事发生但不计件」。它是显示层的优先级最高的开关：写了 `dot` 就恒显示，`count` 是多少都不参与判定。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge dot>
        <web-ui-button variant="secondary">新消息</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={5} dot>
        <web-ui-button variant="secondary">dot 优先于数字</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={0} dot>
        <web-ui-button variant="secondary">count 为 0 也照画</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge dot>
      <web-ui-button variant="secondary">新消息</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="5" dot>
      <web-ui-button variant="secondary">dot 优先于数字</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="0" dot>
      <web-ui-button variant="secondary">count 为 0 也照画</web-ui-button>
    </web-ui-badge>
  </div>
</template>
```

### 位置 {#placement}

`placement` 把角标钉在内容盒的四个角之一，默认 `top-right`。非法值不参与渲染：组件把它规范回 `top-right`，宿主 attribute 也随之修正。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={1} placement="top-right">
        <web-ui-button variant="secondary">top-right（默认）</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={2} placement="top-left">
        <web-ui-button variant="secondary">top-left</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={3} placement="bottom-right">
        <web-ui-button variant="secondary">bottom-right</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={4} placement="bottom-left">
        <web-ui-button variant="secondary">bottom-left</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="1" placement="top-right">
      <web-ui-button variant="secondary">top-right（默认）</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="2" placement="top-left">
      <web-ui-button variant="secondary">top-left</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="3" placement="bottom-right">
      <web-ui-button variant="secondary">bottom-right</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="4" placement="bottom-left">
      <web-ui-button variant="secondary">bottom-left</web-ui-button>
    </web-ui-badge>
  </div>
</template>
```

### 偏移 {#offset}

`offset-x` / `offset-y` 在 `placement` 选中的角上做像素微调，负值往内容内侧收、正值往外推。圆角或带描边的内容常常需要收回来一点，角标才不会挂在轮廓外面。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={8} offset-x={-4} offset-y={4}>
        <web-ui-button variant="secondary">数字往内收</web-ui-button>
      </web-ui-badge>

      <web-ui-badge dot offset-x={-6} offset-y={6}>
        <web-ui-button variant="secondary">圆点同样吃偏移</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={8} offset-x={10} offset-y={-10}>
        <web-ui-button variant="secondary">向外推开</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="8" :offset-x="-4" :offset-y="4">
      <web-ui-button variant="secondary">数字往内收</web-ui-button>
    </web-ui-badge>

    <web-ui-badge dot :offset-x="-6" :offset-y="6">
      <web-ui-button variant="secondary">圆点同样吃偏移</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="8" :offset-x="10" :offset-y="-10">
      <web-ui-button variant="secondary">向外推开</web-ui-button>
    </web-ui-badge>
  </div>
</template>
```

### 独立使用 {#standalone}

默认插槽空着时没有「内容的一角」可钉，角标回到行内流，自己就是一枚可读的数字或圆点，适合和文字并排出现在列表项、标签页标题这类位置。

```tsx
export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-badge count={3}></web-ui-badge>
      <web-ui-badge count={128}></web-ui-badge>
      <web-ui-badge dot></web-ui-badge>
      <web-ui-badge count={0} show-zero></web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-badge :count="3"></web-ui-badge>
    <web-ui-badge :count="128"></web-ui-badge>
    <web-ui-badge dot></web-ui-badge>
    <web-ui-badge :count="0" show-zero></web-ui-badge>
  </div>
</template>
```

### 隐藏 {#hidden}

`badge-hidden` 让角标整个不画，内容照常显示。它压过 `dot` 与 `count`：数字或未读还留在状态里，只是这一次不给看。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <web-ui-badge count={5}>
        <web-ui-button variant="secondary">未读 5 条</web-ui-button>
      </web-ui-badge>

      <web-ui-badge count={5} badge-hidden>
        <web-ui-button variant="secondary">同样 5 条，角标隐藏</web-ui-button>
      </web-ui-badge>

      <web-ui-badge dot badge-hidden>
        <web-ui-button variant="secondary">dot 也一起隐藏</web-ui-button>
      </web-ui-badge>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="5">
      <web-ui-button variant="secondary">未读 5 条</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="5" badge-hidden>
      <web-ui-button variant="secondary">同样 5 条，角标隐藏</web-ui-button>
    </web-ui-badge>

    <web-ui-badge dot badge-hidden>
      <web-ui-button variant="secondary">dot 也一起隐藏</web-ui-button>
    </web-ui-badge>
  </div>
</template>
```

### 受控计数 {#controlled}

`count` 是普通属性，值由页面持有：数字涨到超过 `max` 就显示 `max+`，归 0 时角标自己消失，不需要页面额外条件渲染。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(3)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <web-ui-badge count={count}>
        <web-ui-button variant="secondary" onClick={() => setCount(value => value + 1)}>
          收件箱
        </web-ui-button>
      </web-ui-badge>

      <web-ui-button onClick={() => setCount(0)}>清空未读</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">count={count}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <web-ui-badge :count="count">
      <web-ui-button variant="secondary" @click="count += 1">收件箱</web-ui-button>
    </web-ui-badge>

    <web-ui-button @click="count = 0">清空未读</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">count={{ count }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(3)
</script>
```

## API

### Props

| 名称           | 说明                                                                         | 类型                                                           | 默认值        |
| -------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------- |
| `count`        | 显示数字。                                                                   | `number`                                                       | `0`           |
| `max`          | 数字上限，超过时显示 `max+`。                                                | `number`                                                       | `99`          |
| `dot`          | 点模式，只显示圆点不显示数字。                                               | `boolean`                                                      | `false`       |
| `show-zero`    | `count` 为 0 时也显示。                                                      | `boolean`                                                      | `false`       |
| `badge-hidden` | 完全隐藏 badge。                                                             | `boolean`                                                      | `false`       |
| `offset-x`     | 水平偏移（px）。                                                             | `number`                                                       | `0`           |
| `offset-y`     | 垂直偏移（px）。                                                             | `number`                                                       | `0`           |
| `placement`    | badge 位置：`top-right`（默认）、`top-left`、`bottom-right`、`bottom-left`。 | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` |

### Slots

| 名称      | 说明                                 |
| --------- | ------------------------------------ |
| `default` | 被装饰的内容，badge 叠加在它的一角。 |

### 行为说明

显示判定只有一条优先级链：`badge-hidden` 最先，写了就不画；其次 `dot`，写了就恒画；剩下才轮到 `count > 0 || show-zero`。数字同理，`dot` 下画空白，否则取 `count > max ? 'max+' : count`。

`count` 与 `max` 走同一套数值规范化：非有限数（`NaN`、±Infinity）与非数值回落到各自默认值 `0` / `99`，负数与超出 `Number.MAX_SAFE_INTEGER` 的值按区间裁剪，所以 `count={-5}` 落回 0（角标随之消失）。`placement` 走字面量白名单，不在四个角里的值（含空串）回落到 `top-right`，并立即把宿主 attribute 修正成规范后的值。

角标是 `role="status"` 的活跃区域，`aria-label` 由组件按状态给出固定文案：`dot` 报 `Unread`，`count` 大于 0 报 `<count> unread messages`，`show-zero` 报 `No unread messages`；`badge-hidden` 时这个节点整个不渲染，无障碍树里不再有播报。文案是组件内置的英文，不提供可配的无障碍名称属性，要自定义语义就别用 `badge-hidden` 之外的隐藏手段。

### 布局

宿主是 inline-block，包裹层是 inline-flex。有内容时包裹层转成 `position: relative`、角标绝对定位到选中的角，`translate` 的基准由 `placement` 给（数字是 ±50%、圆点是 ±40%，让角标压出轮廓而不是贴在边线上），`offset-x` / `offset-y` 作为内部变量叠在这条 translate 上。内容判的是元素子节点的个数：只放了纯文本时不算有内容，角标会留在行内流里，所以「包住一段文字」这种写法请给文字套一个元素。

角标没有对外暴露的尺寸与颜色旋钮：底色取 `--wui-color-danger`、文字取 `--wui-color-on-accent`、描边取 `--wui-color-page`（1px，用来把角标从深色内容上切出来），圆角走 `--wui-radius-control`（默认是 pill），高度 18px、最小宽度 18px、左右内边距 `--wui-space-1`、字号 `--wui-font-size-caption`；`dot` 只把宽高收到 8px 并去掉内边距。要换颜色请改这几枚语义 token 的作用域，而不是找角标上的属性。
