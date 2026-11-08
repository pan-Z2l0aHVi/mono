# Shake

[English](./shake.md) | 简体中文

命令式 shake：`shake()` 让目标摆动几次后回到原位，用于提示「不行」或「请先处理」，例如表单还有未保存内容却要离开，或需要把注意力拉回某个字段。它直接从 `@greypan/web-ui` 导入，调用方式是一个函数。

不传 `target` 时震整页，传 `target` 时只震那一块。横向摆幅由 `--wui-shake-x-distance`（默认 `12px`）控制，纵向摆幅由 `--wui-shake-y-distance`（默认与横向同值，也是 `12px`）控制，整段时长由 `--wui-shake-duration`（默认 `420ms`）控制。三者都可以通过选项逐次覆盖。

## 示例

### 整个页面

`shake()` 不带参数就震整页：页面中的普通流内容和 `position: fixed` 内容一起移动；已打开的对话框 / 抽屉不受影响。两轴同相位，合成后的位移沿一条直线，默认幅度下第一次摆动朝左上，回到原位时不会突然跳动。

```tsx
import { shake } from '@greypan/web-ui'

export default function Demo() {
  return <web-ui-button onClick={() => shake()}>震整页</web-ui-button>
}
```

```vue
<template>
  <web-ui-button @click="shake()">震整页</web-ui-button>
</template>

<script setup lang="ts">
import { shake } from '@greypan/web-ui'
</script>
```

### 单个元素

传 `target` 只震那个元素，页面其余部分保持不动：一次调用只在目标上保留一条动画，重复调用会取消上一条并重新开始，不会叠加成更大的位移。

目标上已有的 `transform` 会被保留，因此 `translate(-50%, -50%)` 那类居中定位不会被震动覆盖，摆动结束后仍在原位。

```tsx
import { shake } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <web-ui-button
        onClick={() => {
          if (cardRef.current) shake({ target: cardRef.current, xDistance: 18 })
        }}
      >
        只震这张卡片
      </web-ui-button>
      <div
        ref={cardRef}
        className="mt-3 w-64 rounded-xl border border-(--wui-color-border) bg-(--wui-color-surface) p-3 text-sm"
      >
        没有填完的字段还在这块里。
      </div>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="shakeCard">只震这张卡片</web-ui-button>
  <div ref="card" class="mt-3 w-64 rounded-xl border border-(--wui-color-border) bg-(--wui-color-surface) p-3 text-sm">
    没有填完的字段还在这块里。
  </div>
</template>

<script setup lang="ts">
import { shake } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const card = useTemplateRef<HTMLDivElement>('card')

function shakeCard() {
  if (card.value) shake({ target: card.value, xDistance: 18 })
}
</script>
```

### 振幅与时长

`xDistance` 与 `yDistance` 分别是横向与纵向的幅度（px），`duration` 是整段时长（ms）。都省略时读取目标计算样式上的同名 token。两轴默认同值（各 `12px`），所以不带参数时斜向摆动。把一轴设为 `0` 就只摆另一条轴。

指定 `target` 时，token 写在 `target` 的任意祖先上即可；震整页时写在 `html` / `:root` 上。

`0` 按轴计算。一条轴归零时只去掉这条轴，另一轴照常摆动。两条轴都为 0（或时长为 0）时什么都不发生。

```tsx
import { shake } from '@greypan/web-ui'

export default function Demo() {
  return (
    <>
      <web-ui-button onClick={() => shake({ xDistance: 28, duration: 640 })}>摆得更大更慢</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 12, yDistance: 0 })}>仅横向振动</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 0, yDistance: 12 })}>仅纵向振动</web-ui-button>
      <web-ui-button onClick={() => shake({ xDistance: 0, yDistance: 0 })}>两轴都是 0：什么都不发生</web-ui-button>
    </>
  )
}
```

```vue
<template>
  <web-ui-button @click="shake({ xDistance: 28, duration: 640 })">摆得更大更慢</web-ui-button>
  <web-ui-button @click="shake({ xDistance: 12, yDistance: 0 })">仅横向振动</web-ui-button>
  <web-ui-button @click="shake({ xDistance: 0, yDistance: 12 })">仅纵向振动</web-ui-button>
  <web-ui-button @click="shake({ xDistance: 0, yDistance: 0 })">两轴都是 0：什么都不发生</web-ui-button>
</template>

<script setup lang="ts">
import { shake } from '@greypan/web-ui'
</script>
```

## API

### 选项

`shake(input?)` 的 `input` 可以是一个 `HTMLElement`（等价于只传 `target`）、一个选项对象，或省略。

| 名称        | 说明                                                                                | 类型          | 默认值                     |
| ----------- | ----------------------------------------------------------------------------------- | ------------- | -------------------------- |
| `target`    | 位移目标。省略时震整页。                                                            | `HTMLElement` | `document.documentElement` |
| `xDistance` | 横向首摆幅度（px），即横轴上实际摆出的最大位移。省略时读 `--wui-shake-x-distance`。 | `number`      | `12`                       |
| `yDistance` | 纵向幅度（px），与横向同相位。省略时读 `--wui-shake-y-distance`；默认与横向同值。   | `number`      | `12`                       |
| `duration`  | 整段时长（ms）。省略时读目标计算样式上的 `--wui-shake-duration`。                   | `number`      | `420`                      |

### 行为说明

两个幅度 token 接受视口单位与 `calc()`；百分号不生效，写了会使用默认幅度。时长接受 `420ms` 与 `0.42s` 两种写法。

减少动效（系统 `prefers-reduced-motion`，或所在 `web-ui-theme` 的 `motion` 模式）下不产生任何位移，也不留下状态。指定 `target` 时按它最近的主题范围判定；震整页时按页面根主题的模式判定。

### CSS 自定义属性

| 名称                     | 说明                                                                            | 默认值  |
| ------------------------ | ------------------------------------------------------------------------------- | ------- |
| `--wui-shake-x-distance` | 横向幅度，即横轴上实际摆出的最大位移；可写视口单位与 `calc()`，不可写百分号。   | `12px`  |
| `--wui-shake-y-distance` | 纵向幅度，与横向同相位，默认与横向同值；同样收视口单位与 `calc()`，不收百分号。 | `12px`  |
| `--wui-shake-duration`   | 整段时长，可写 `420ms` 或 `0.42s`；置 `0` 关掉整条效果。                        | `420ms` |
