---
component: image-preview
tag: web-ui-image-preview
---

命令式图片预览：通过 `imagePreview()` 打开，用返回的句柄控制；内部使用原生 `<dialog>`，默认挂载到最近的 theme-owned overlay root。

## 示例

### 基础

只传图片时只渲染图片本身，点击图片外空白或按 Escape 关闭。

```react
import { imagePreview } from '@greypan/web-ui'

const preview = imagePreview({
  images: [
    { src: '/photos/a.jpg', alt: '图 A' },
    { src: '/photos/b.jpg', alt: '图 B' }
  ]
})

preview.next()
await preview.closed
```

```vue
<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

function open() {
  const preview = imagePreview({
    images: [
      { src: '/photos/a.jpg', alt: '图 A' },
      { src: '/photos/b.jpg', alt: '图 B' }
    ],
    nav: true,
    toolbar: true,
    closable: true,
    indicator: true
  })
  preview.next()
}
</script>
```

### 展示类选项

`nav`、`toolbar`、`closable`、`indicator` 彼此独立且默认关闭，需要显式开启。

```react
const preview = imagePreview({
  images,
  index: 0,
  nav: true,
  toolbar: true,
  closable: true,
  indicator: true
})
```

```vue
<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

function openFull(images: { src: string; alt?: string }[]) {
  return imagePreview({ images, nav: true, toolbar: true, closable: true, indicator: true })
}
</script>
```

### 滑动与循环

`swipe` 在 1x 倍率下允许左右滑动切图；`loop` 关闭时首尾钳制、边界方向回弹。

```react
const preview = imagePreview({ images, swipe: true, loop: false })
```

```vue
<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

function openBounded(images: { src: string; alt?: string }[]) {
  return imagePreview({ images, swipe: true, loop: false })
}
</script>
```

### 句柄

句柄暴露 `index`、`scale`、`images`、`closed` 与全部控制方法，可据此实现自己的触发器与状态面板。

```react
const preview = imagePreview({ images })
preview.goTo(2)
preview.zoomIn()
await preview.closed
console.log(preview.index, preview.scale)
```

```vue
<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

async function inspect(images: { src: string; alt?: string }[]) {
  const preview = imagePreview({ images })
  preview.goTo(2)
  preview.zoomIn()
  await preview.closed
  console.log(preview.index, preview.scale)
}
</script>
```

## API

### Props

| 名称              | 说明                                         | 类型                 | 默认值  |
| ----------------- | -------------------------------------------- | -------------------- | ------- |
| `images`          | 图片列表，至少一项；每项为 `{ src, alt? }`。 | `ImagePreviewItem[]` | `[]`    |
| `loop`            | 首尾循环切换。                               | `boolean`            | `true`  |
| `nav`             | 展示上一张 / 下一张按钮。                    | `boolean`            | `false` |
| `toolbar`         | 展示缩放工具条。                             | `boolean`            | `false` |
| `closable`        | 展示关闭按钮。                               | `boolean`            | `false` |
| `indicator`       | 展示「当前 / 总数」指示器。                  | `boolean`            | `false` |
| `swipe`           | 1x 下允许左右滑动切图。                      | `boolean`            | `false` |
| `noScrollLock`    | 打开期间不锁定页面滚动。                     | `boolean`            | `false` |
| `noBackdropClose` | 点击图片以外的空白区域不关闭。               | `boolean`            | `false` |
