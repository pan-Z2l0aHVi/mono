# Image Preview

命令式 image preview：通过 `imagePreview()` 打开，用返回的 handle 控制；内部使用原生 `<dialog>`，不传 `container` 时挂到根主题（`web-ui-theme`）的 overlay root，页面里没有主题作用域时回退到全局 fallback root——传 `target` 则改为解析它最近的 theme 作用域。

下面的表分别列 `imagePreview()` 的 option 与返回 handle 的成员。

## Samples

### Single image

只传一张图时，预览里没有上一张 / 下一张的切换；方向键、滚轮与 `+` / `-` 缩放、`0` 重置、双击在 1x 与 2x 之间切换都照常可用。

点击图片以外的空白处或按 Escape 关闭：关闭请求先播退场过渡，宿主移除后 handle 的 `closed` 才兑现。

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [{ src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' }]

export default function Demo() {
  return <web-ui-button onClick={() => imagePreview({ images: IMAGES })}>打开单张预览</web-ui-button>
}
```

```vue
<template>
  <web-ui-button @click="open">打开单张预览</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [{ src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' }]

function open() {
  imagePreview({ images: IMAGES })
}
</script>
```

### Multiple images

`images` 传入多张图时，方向键可以直接切换；`loop` 默认 `true`，首尾环绕。

只传 `images` 时四个展示类 option 保持默认关闭，画面上只有图片本身；上一张 / 下一张 button、缩放工具条、关闭 button 与 indicator 都需要显式开启。

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' },
  { src: gradientImage('第四张', '#bf5af2', '#ff375f'), alt: '紫色渐变的示例图' }
]

export default function Demo() {
  return <web-ui-button onClick={() => imagePreview({ images: IMAGES })}>打开多张预览</web-ui-button>
}
```

```vue
<template>
  <web-ui-button @click="open">打开多张预览</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' },
  { src: gradientImage('第四张', '#bf5af2', '#ff375f'), alt: '紫色渐变的示例图' }
]

function open() {
  imagePreview({ images: IMAGES })
}
</script>
```

### Display options

`nav`、`toolbar`、`closable`、`indicator` 彼此独立、默认全关，四个都传 `true` 才会把上一张 / 下一张 button、缩放工具条、关闭 button 与「当前 / 总数」indicator 一起带出来。

`nav` 只在图片多于一张时渲染；`loop` 默认 `true`，首尾环绕，所以这里可以一直朝同一个方向翻。

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' },
  { src: gradientImage('第四张', '#bf5af2', '#ff375f'), alt: '紫色渐变的示例图' }
]

export default function Demo() {
  return (
    <web-ui-button
      onClick={() => imagePreview({ images: IMAGES, nav: true, toolbar: true, closable: true, indicator: true })}
    >
      打开预览（全部控件）
    </web-ui-button>
  )
}
```

```vue
<template>
  <web-ui-button @click="open">打开预览（全部控件）</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' },
  { src: gradientImage('第四张', '#bf5af2', '#ff375f'), alt: '紫色渐变的示例图' }
]

function open() {
  imagePreview({ images: IMAGES, nav: true, toolbar: true, closable: true, indicator: true })
}
</script>
```

### Swipe

`swipe: true` 且图片多于一张时，1x 下可以左右拖动切图；纵向位移被忽略，放大后拖动改为平移。

这里同时打开 `nav` 与 `indicator`，方便比对滑动后的结果。

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' },
  { src: gradientImage('第四张', '#bf5af2', '#ff375f'), alt: '紫色渐变的示例图' }
]

export default function Demo() {
  return (
    <web-ui-button onClick={() => imagePreview({ images: IMAGES, swipe: true, nav: true, indicator: true })}>
      打开并左右滑动
    </web-ui-button>
  )
}
```

```vue
<template>
  <web-ui-button @click="open">打开并左右滑动</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' },
  { src: gradientImage('第四张', '#bf5af2', '#ff375f'), alt: '紫色渐变的示例图' }
]

function open() {
  imagePreview({ images: IMAGES, swipe: true, nav: true, indicator: true })
}
</script>
```

### No backdrop close

`noBackdropClose: true` 时点击图片以外的空白区域不再关闭；仍可按 Escape 或点右上角关闭 button（`closable: true`）退出。

```tsx
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' },
  { src: gradientImage('第四张', '#bf5af2', '#ff375f'), alt: '紫色渐变的示例图' }
]

export default function Demo() {
  return (
    <web-ui-button onClick={() => imagePreview({ images: IMAGES, noBackdropClose: true, closable: true })}>
      打开（点击空白不关闭）
    </web-ui-button>
  )
}
```

```vue
<template>
  <web-ui-button @click="open">打开（点击空白不关闭）</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' },
  { src: gradientImage('第四张', '#bf5af2', '#ff375f'), alt: '紫色渐变的示例图' }
]

function open() {
  imagePreview({ images: IMAGES, noBackdropClose: true, closable: true })
}
</script>
```

### Handle

这里的 handle 是这次预览实例的控制器：`imagePreview()` 打开后返回它，翻页、缩放与关闭都通过它发起。

handle 的 `index`、`scale`、`images`、`closed` 是只读成员，方法调用后同步读得到新值；预览内部的手势与键盘操作不会回调外部，需要时自己读。

顺序上先 `goTo(1)` 再 `zoomIn()`：切图会把缩放复位到 1x，反过来写放大就丢了。

示例把读数写进 `<output>`，`closed` 兑现后再改成「预览已关闭」。

```tsx
import { imagePreview } from '@greypan/web-ui'
import { useState } from 'react'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' },
  { src: gradientImage('第四张', '#bf5af2', '#ff375f'), alt: '紫色渐变的示例图' }
]

export default function Demo() {
  const [status, setStatus] = useState('尚未打开')

  function open() {
    const preview = imagePreview({ images: IMAGES, toolbar: true })
    // 切图会把缩放复位到 1x，所以先 goTo 再 zoomIn。
    preview.goTo(1)
    preview.zoomIn()
    setStatus(`第 ${preview.index + 1} 张 · 缩放 ${Math.round(preview.scale * 100)}%`)
    void preview.closed.then(() => setStatus('预览已关闭'))
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button onClick={open}>打开并跳到第 2 张</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">{status}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button @click="open">打开并跳到第 2 张</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ status }}</output>
  </div>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'
import { ref } from 'vue'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' },
  { src: gradientImage('第四张', '#bf5af2', '#ff375f'), alt: '紫色渐变的示例图' }
]

const status = ref('尚未打开')

function open() {
  const preview = imagePreview({ images: IMAGES, toolbar: true })
  // 切图会把缩放复位到 1x，所以先 goTo 再 zoomIn。
  preview.goTo(1)
  preview.zoomIn()
  status.value = `第 ${preview.index + 1} 张 · 缩放 ${Math.round(preview.scale * 100)}%`
  void preview.closed.then(() => {
    status.value = '预览已关闭'
  })
}
</script>
```

## API

### Options

| 名称              | 说明                                                                               | 类型                     | 默认值  |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------ | ------- |
| `images`          | 图片列表，至少一项；每项为 `{ src, alt? }`。                                       | `ImagePreviewItem[]`     | —       |
| `index`           | 初始图片索引，越界时钳制到有效区间。                                               | `number`                 | `0`     |
| `loop`            | 首尾循环切换。                                                                     | `boolean`                | `true`  |
| `target`          | 用于解析最近 theme-owned overlay root 的触发元素。                                 | `Element`                | —       |
| `container`       | 显式挂载容器，优先级高于主题作用域。                                               | `HTMLElement`            | —       |
| `nav`             | 展示上一张 / 下一张 button。                                                       | `boolean`                | `false` |
| `toolbar`         | 展示缩放工具条。                                                                   | `boolean`                | `false` |
| `closable`        | 展示关闭 button。                                                                  | `boolean`                | `false` |
| `indicator`       | 展示「当前 / 总数」indicator。                                                     | `boolean`                | `false` |
| `swipe`           | 1x 下允许左右滑动切图。                                                            | `boolean`                | `false` |
| `noScrollLock`    | 打开期间不锁定页面滚动。                                                           | `boolean`                | `false` |
| `noBackdropClose` | 点击图片以外的空白区域不关闭。                                                     | `boolean`                | `false` |
| `ariaLabels`      | 内置无障碍名（关闭/前后切换/缩放/重置）的成组覆盖；未提供的 key 回退内置英文文案。 | `ImagePreviewAriaLabels` | —       |

### Methods

| 名称          | 说明                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| `next()`      | 切到下一张；`loop` 开启时末张回到首张，关闭时已在末张则不动作。                 |
| `prev()`      | 切到上一张；`loop` 开启时首张回到末张，关闭时已在首张则不动作。                 |
| `goTo(index)` | 跳到指定索引；`loop` 开启时按图片数取模，关闭时钳制到有效区间，切换后缩放复位。 |
| `zoomIn()`    | 放大一档（0.5），上限 4。                                                       |
| `zoomOut()`   | 缩小一档（0.5），下限 1。                                                       |
| `resetZoom()` | 缩放与平移复位：回到 1x 并居中。                                                |
| `close()`     | 关闭预览；handle 的 `closed` 在退场结束后兑现。                                 |

### 行为说明

它不复用 `<web-ui-dialog>` 组件：预览需要自身铺满视口的 dialog（全视口 backdrop 由 dialog 内独立 backdrop 层渲染，dialog 元素自身不做 opacity 过渡，玻璃控件的 backdrop blur 全程连续）与自有指针交互，与 dialog 组件的玻璃卡片 / 插槽契约不同源。

两者共享 `native-dialog-presence` 与 `scroll-lock` 两个底层插件，`noScrollLock` / `noBackdropClose` 的命名与语义也对齐同名属性。

```ts
import { imagePreview } from '@greypan/web-ui'

function openPreview() {
  const preview = imagePreview({
    images: [{ src: '/a.jpg', alt: '图 A' }, { src: '/b.jpg' }],
    nav: true,
    toolbar: true,
    closable: true,
    indicator: true
  })

  preview.next()
  preview.zoomIn()
}
```

`ImagePreviewItem` 为 `{ src: string; alt?: string }`；`alt` 缺省为空字符串。

展示类 option 默认全关：不传任何 option 时只渲染图片本身，导航、工具条、关闭 button 与 indicator 都需要显式开启。

### 返回 handle

| 名称     | 说明                             | 类型                          |
| -------- | -------------------------------- | ----------------------------- |
| `index`  | 当前索引，关闭后保留最后一次的值 | `number`                      |
| `scale`  | 当前缩放倍率，区间 `[1, 4]`      | `number`                      |
| `images` | 归一化后的图片列表               | `readonly ImagePreviewItem[]` |
| `closed` | 退场结束且宿主移除后兑现         | `Promise<void>`               |

### 交互

方向键始终可切换图片，与 `nav` 无关；`+` / `-` 键和滚轮缩放，`0` 重置。

缩放带锚点：滚轮固定光标下的那一点，双指捏合固定两指中点，工具条 button、键盘快捷键与双击则以视口中心为中心放大。

按住鼠标拖拽或单指按住拖拽都能平移图片，方向不限，且与倍率无关：放大后是查看被裁切的边缘，1x 是在视口内移动图片。两种情形共用同一个边界——图片与舞台尺寸差的一半，因此图片永远不会被拖出视口；拖到边界后继续拖是钳制而非回弹。

双击图片在 1x 与 2x 之间切换。

双指缩放始终开启且不提供 option：舞台本身就持有指针交互，没有会冲突的手势。第一根手指照常负责平移 / 滑动，第二根手指落下才进入捏合，并中止进行中的平移或滑动。捏合不会关闭 overlay；混合输入事后可能补发的兼容 `click` 会被吞掉，而不是当作 backdrop 点击。

点击图片以外的空白区域或按 Escape 关闭，原生 dialog 始终暴露 `image preview` 这一可访问名称。

`swipe` 开启且图片多于一张时，图片排布在单条轮播 track 上：当前图与相邻图各占等宽等高的 slide，舞台裁切溢出，整条 track 随手指平移。

松手时越过距离阈值（舞台宽度的 15%，取整）滑入相邻图，位移未达阈值但快速轻扫的采样速度达到 320px/s 以上、或位移至少 16px 且速度（窗口采样或整段平均）达到 160px/s 以上的轻扫同样提交，否则弹回；`loop` 开启时首尾环绕的相邻图恒在当前图两侧，`loop` 关闭时边界方向回弹不越界。

该手势生效期间接管整个拖拽：1x 下横向拖拽用于切图，纵向位移被完全忽略（不驱平移、不跟手）。放大后拖拽一律平移（纵横都跟），不切换图片。

由于 1x 也能平移，`resetZoom()` 在「已放大」和「已位移」两种情况下都可用——工具条里的重置 button 对已平移的 1x 图片同样可点。

关闭请求不会立刻销毁原生 dialog：它保持在 top layer，等退场过渡结束后才调用 `dialog.close()`，随后宿主从 DOM 移除并兑现 `closed`。打开期间默认锁定页面滚动。预览是全视口模态层，滚轮与触摸手势都被它用于缩放 / 平移，所以 `noScrollLock` 主要影响未被预览消费的页面级滚动（例如 PageDown、程序化滚动或外部容器），而不是让滚轮穿透去滚页面。

### CSS Custom Properties

| 名称                             | 说明                     | 默认值                           |
| -------------------------------- | ------------------------ | -------------------------------- |
| `--wui-image-preview-overlay-bg` | 全视口 backdrop 背景色   | `rgb(0 0 0 / 0.72)`              |
| `--wui-image-preview-edge-gap`   | 控件到视口边缘的可见距离 | `20px`                           |
| `--wui-duration-swipe-settle`    | 轮播滑入/回位的过渡时长  | `220ms`                          |
| `--wui-ease-swipe`               | 轮播滑入/回位的缓动曲线  | `cubic-bezier(0.32, 0.72, 0, 1)` |
