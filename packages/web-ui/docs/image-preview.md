---
component: image-preview
tag: web-ui-image-preview
---

命令式 image preview：通过 `imagePreview()` 打开，用返回的句柄控制；内部使用原生 `<dialog>`，默认挂载到最近的 theme-owned overlay root。下面的表分别列 `imagePreview()` 的 option 与返回句柄的成员。

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

### 展示类 option

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

句柄暴露只读的 `index`、`scale`、`images`、`closed` 与下表的方法，可据此实现自己的 trigger 与状态 panel。

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

### Options

| 名称              | 说明                                               | 类型                 | 默认值  |
| ----------------- | -------------------------------------------------- | -------------------- | ------- |
| `images`          | 图片列表，至少一项；每项为 `{ src, alt? }`。       | `ImagePreviewItem[]` | `—`     |
| `index`           | 初始图片索引，越界时钳制到有效区间。               | `number`             | `0`     |
| `loop`            | 首尾循环切换。                                     | `boolean`            | `true`  |
| `target`          | 用于解析最近 theme-owned overlay root 的触发元素。 | `Element`            | `—`     |
| `container`       | 显式挂载容器，优先级高于主题作用域。               | `HTMLElement`        | `—`     |
| `nav`             | 展示上一张 / 下一张 button。                       | `boolean`            | `false` |
| `toolbar`         | 展示缩放工具条。                                   | `boolean`            | `false` |
| `closable`        | 展示关闭 button。                                  | `boolean`            | `false` |
| `indicator`       | 展示「当前 / 总数」indicator。                     | `boolean`            | `false` |
| `swipe`           | 1x 下允许左右滑动切图。                            | `boolean`            | `false` |
| `noScrollLock`    | 打开期间不锁定页面滚动。                           | `boolean`            | `false` |
| `noBackdropClose` | 点击图片以外的空白区域不关闭。                     | `boolean`            | `false` |

### Methods

| 名称          | 说明                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| `next()`      | 切到下一张；`loop` 开启时末张回到首张，关闭时已在末张则不动作。                 |
| `prev()`      | 切到上一张；`loop` 开启时首张回到末张，关闭时已在首张则不动作。                 |
| `goTo(index)` | 跳到指定索引；`loop` 开启时按图片数取模，关闭时钳制到有效区间，切换后缩放复位。 |
| `zoomIn()`    | 放大一档（0.5），上限 4。                                                       |
| `zoomOut()`   | 缩小一档（0.5），下限 1。                                                       |
| `resetZoom()` | 缩放与平移复位：回到 1x 并居中。                                                |
| `close()`     | 关闭预览；句柄的 `closed` 在退场结束后兑现。                                    |

### 行为说明

它不复用 `<web-ui-dialog>` 组件：预览需要自身铺满视口的 dialog（全视口 backdrop 由 dialog 内独立 backdrop 层渲染，dialog 元素自身不做 opacity 过渡，玻璃控件的 backdrop blur 全程连续）与自有指针交互，与 dialog 组件的玻璃卡片 / 插槽契约不同源。两者共享 `native-dialog-presence` 与 `scroll-lock` 两个底层插件，`noScrollLock` / `noBackdropClose` 的命名与语义也对齐同名属性。

```ts
import { imagePreview } from '@greypan/web-ui'

const preview = imagePreview({
  images: [{ src: '/a.jpg', alt: '图 A' }, { src: '/b.jpg' }],
  index: 0,
  nav: true,
  toolbar: true,
  closable: true,
  indicator: true
})

preview.next()
preview.zoomIn()

await preview.closed
```

`ImagePreviewItem` 为 `{ src: string; alt?: string }`；`alt` 缺省为空字符串。

展示类 option 默认全关：不传任何 option 时只渲染图片本身，导航、工具条、关闭 button 与 indicator 都需要显式开启。

### 返回句柄

| 名称     | 说明                             | 类型                          |
| -------- | -------------------------------- | ----------------------------- |
| `index`  | 当前索引，关闭后保留最后一次的值 | `number`                      |
| `scale`  | 当前缩放倍率，区间 `[1, 4]`      | `number`                      |
| `images` | 归一化后的图片列表               | `readonly ImagePreviewItem[]` |
| `closed` | 退场结束且宿主移除后兑现         | `Promise<void>`               |

### 交互

方向键始终可切换图片，与 `nav` 无关；`+` / `-` 键和滚轮缩放，`0` 重置。缩放带锚点：滚轮固定光标下的那一点，双指捏合固定两指中点，工具条 button、键盘快捷键与双击则以视口中心为中心放大。按住鼠标拖拽或单指按住拖拽都能平移图片，方向不限，且与倍率无关：放大后是查看被裁切的边缘，1x 是在视口内移动图片。两种情形共用同一个边界——图片与舞台尺寸差的一半，因此图片永远不会被拖出视口；拖到边界后继续拖是钳制而非回弹。双击图片在 1x 与 2x 之间切换。

双指缩放始终开启且不提供 option：舞台本身就持有指针交互，没有会冲突的手势。第一根手指照常负责平移 / 滑动，第二根手指落下才进入捏合，并中止进行中的平移或滑动。捏合不会关闭 overlay；混合输入事后可能补发的兼容 `click` 会被吞掉，而不是当作 backdrop 点击。

点击图片以外的空白区域或按 Escape 关闭，原生 dialog 始终暴露 `image preview` 这一可访问名称。`swipe` 开启且图片多于一张时，图片排布在单条轮播 track 上：当前图与相邻图各占等宽等高的 slide，舞台裁切溢出，整条 track 随手指平移；松手时越过距离阈值（舞台宽度的 15%，取整）滑入相邻图，位移未达阈值但快速轻扫的采样速度达到 320px/s 以上、或位移至少 16px 且速度（窗口采样或整段平均）达到 160px/s 以上的轻扫同样提交，否则弹回；`loop` 开启时首尾环绕的相邻图恒在当前图两侧，`loop` 关闭时边界方向回弹不越界。该手势生效期间接管整个拖拽：1x 下横向拖拽用于切图，纵向位移被完全忽略（不驱平移、不跟手）。放大后拖拽一律平移（纵横都跟），不再切换图片。由于 1x 也能平移，`resetZoom()` 在「已放大」和「已位移」两种情况下都可用——工具条里的重置 button 对已平移的 1x 图片同样可点。

关闭请求不会立刻销毁原生 dialog：它保持在 top layer，等退场过渡结束后才调用 `dialog.close()`，随后宿主从 DOM 移除并兑现 `closed`。打开期间锁定页面滚动，除非 `noScrollLock` 为 `true`。

### CSS Custom Properties

| 名称                             | 说明                     | 默认值                           |
| -------------------------------- | ------------------------ | -------------------------------- |
| `--wui-image-preview-overlay-bg` | 全视口 backdrop 背景色   | `rgb(0 0 0 / 0.72)`              |
| `--wui-image-preview-edge-gap`   | 控件到视口边缘的可见距离 | `20px`                           |
| `--wui-duration-swipe-settle`    | 轮播滑入/回位的过渡时长  | `220ms`                          |
| `--wui-ease-swipe`               | 轮播滑入/回位的缓动曲线  | `cubic-bezier(0.32, 0.72, 0, 1)` |
