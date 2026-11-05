# Icon

icon 用来渲染图标，渲染结果是一个 `aria-hidden="true"` 的 `<svg>`，图标本身不提供可访问名称。输入是 Iconify 数据对象，不是图标名字：组件接受任意合法的 `IconifyIcon`，`body` 必填，是一段 SVG 内部标记；`width` / `height` / `left` / `top` 描述画布。手写的对象与包内资产渲染方式相同，不必先登记进 `@greypan/web-ui/icons`。

`@greypan/web-ui/icons` 按图标集命名导出这些对象，当前采用白名单按需生成：本 monorepo 实际用到的图标逐条登记在包根的 `icons.used.json`（`set:name` 格式），生成器只从这些条目提取资产，生成逐图标数据模块，并聚合出 `iconGallery` 全量清单。要追加新图标，往 `icons.used.json` 加一条 `set:name` 再跑 `pnpm --filter @greypan/web-ui generate-icons`；白名单之外的图标直接把 `IconifyIcon` 传给 `icon` 即可，不必等清单扩量。

## Samples

### Basic

`icon` 只能通过 property 传入，不接受 attribute，值是 Iconify 数据对象，不是图标名字。不传 `icon` 时组件不绘制任何内容，连 `<svg>` 也不生成。

```tsx
import { lucideFolderOpen, lucideSearch, lucideSettings } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex items-center gap-2">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
        搜索
      </span>
      <span className="flex items-center gap-2">
        <web-ui-icon icon={lucideFolderOpen}></web-ui-icon>
        打开项目
      </span>
      <span className="flex items-center gap-2">
        <web-ui-icon icon={lucideSettings}></web-ui-icon>
        设置
      </span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      搜索
    </span>
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="lucideFolderOpen"></web-ui-icon>
      打开项目
    </span>
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="lucideSettings"></web-ui-icon>
      设置
    </span>
  </div>
</template>

<script setup lang="ts">
import { lucideFolderOpen, lucideSearch, lucideSettings } from '@greypan/web-ui/icons'
</script>
```

### Bring your own icon data

手写对象同样能渲染：`clock` 没有经过 `@greypan/web-ui/icons`，直接传给 `icon` 即可。

```tsx
const clock = {
  width: 24,
  height: 24,
  body: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M12 7v5l3 3"/>'
}

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex items-center gap-2">
        <web-ui-icon icon={clock}></web-ui-icon>
        默认 18px
      </span>
      <span className="flex items-center gap-2">
        <web-ui-icon icon={clock} size={32} color="#007aff"></web-ui-icon>
        32px
      </span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="clock"></web-ui-icon>
      默认 18px
    </span>
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="clock" :size="32" color="#007aff"></web-ui-icon>
      32px
    </span>
  </div>
</template>

<script setup lang="ts">
const clock = {
  width: 24,
  height: 24,
  body: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M12 7v5l3 3"/>'
}
</script>
```

### Size

`size` 是像素尺寸，图形按资产自己的 viewBox 等比缩放，不会被拉伸。默认 `18`。

```tsx
import { lucideStar } from '@greypan/web-ui/icons'

const sizes = [14, 18, 24, 32]

export default function Demo() {
  return (
    <div className="flex flex-wrap items-end gap-6">
      {sizes.map(size => (
        <span key={size} className="flex flex-col items-center gap-2">
          <web-ui-icon icon={lucideStar} size={size}></web-ui-icon>
          <span className="text-xs text-(--wui-color-text-secondary)">{size}</span>
        </span>
      ))}
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-end gap-6">
    <span v-for="size in sizes" :key="size" class="flex flex-col items-center gap-2">
      <web-ui-icon :icon="lucideStar" :size="size"></web-ui-icon>
      <span class="text-xs text-(--wui-color-text-secondary)">{{ size }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { lucideStar } from '@greypan/web-ui/icons'

const sizes = [14, 18, 24, 32]
</script>
```

### Color

颜色按优先级取：`color` 属性最高；其次是宿主上的 `--wui-icon-color`；两者都没有时跟随文字颜色，因为资产用 `currentColor` 绘制。

```tsx
import { lucideHeart } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex items-center gap-2 text-(--wui-color-danger)">
        <web-ui-icon icon={lucideHeart}></web-ui-icon>
        跟着文字颜色
      </span>
      <web-ui-icon icon={lucideHeart} color="#007aff"></web-ui-icon>
      <web-ui-icon icon={lucideHeart} className="[--wui-icon-color:#34c759]"></web-ui-icon>
      <web-ui-icon icon={lucideHeart} color="#007aff" className="[--wui-icon-color:#34c759]"></web-ui-icon>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex items-center gap-2 text-(--wui-color-danger)">
      <web-ui-icon :icon="lucideHeart"></web-ui-icon>
      跟着文字颜色
    </span>
    <web-ui-icon :icon="lucideHeart" color="#007aff"></web-ui-icon>
    <web-ui-icon :icon="lucideHeart" class="[--wui-icon-color:#34c759]"></web-ui-icon>
    <web-ui-icon :icon="lucideHeart" color="#007aff" class="[--wui-icon-color:#34c759]"></web-ui-icon>
  </div>
</template>

<script setup lang="ts">
import { lucideHeart } from '@greypan/web-ui/icons'
</script>
```

### Spin

`spin` 给 `<svg>` 加一条无限循环的旋转，周期取自 `--wui-duration-spin`（`600ms`）。在 `motion="reduced"` 主题或系统减少动态偏好下，该 token 放慢到 `1600ms`，不会停止：加载指示停住会被理解为界面卡死。

```tsx
import { lucideLoaderCircle } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [spinning, setSpinning] = useState(true)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <web-ui-icon icon={lucideLoaderCircle} size={24} spin={spinning}></web-ui-icon>
      <web-ui-checkbox checked={spinning} onChange={event => setSpinning(event.currentTarget.checked)}>
        旋转
      </web-ui-checkbox>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <web-ui-icon :icon="lucideLoaderCircle" :size="24" :spin="spinning"></web-ui-icon>
    <web-ui-checkbox :checked="spinning" @change="spinning = $event.target.checked">旋转</web-ui-checkbox>
  </div>
</template>

<script setup lang="ts">
import { lucideLoaderCircle } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const spinning = ref(true)
</script>
```

### Combined with button

按钮的 `prefix` / `suffix` 插槽用来放图标。图标与标签文字排在同一条 flex 线上，共用标签的文字颜色。纯图标按钮设置 `icon` 并写 `aria-label`：图标自身是 `aria-hidden`，按钮里没有其他可见内容时，可访问名称只能来自 `aria-label`。

```tsx
import { lucideChevronLeft, lucideDownload, lucideUpload } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button>
        <web-ui-icon slot="prefix" icon={lucideUpload} size={16}></web-ui-icon>
        上传
      </web-ui-button>
      <web-ui-button variant="secondary">
        <web-ui-icon slot="suffix" icon={lucideDownload} size={16}></web-ui-icon>
        下载
      </web-ui-button>
      <web-ui-button icon aria-label="上一页">
        <web-ui-icon icon={lucideChevronLeft}></web-ui-icon>
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button>
      <web-ui-icon slot="prefix" :icon="lucideUpload" :size="16"></web-ui-icon>
      上传
    </web-ui-button>
    <web-ui-button variant="secondary">
      <web-ui-icon slot="suffix" :icon="lucideDownload" :size="16"></web-ui-icon>
      下载
    </web-ui-button>
    <web-ui-button icon aria-label="上一页">
      <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideDownload, lucideUpload } from '@greypan/web-ui/icons'
</script>
```

### Icon gallery

`iconGallery` 是 `Record<string, IconifyIcon>`，key 与命名导出同名（camelCase），收录 `@greypan/web-ui/icons` 当前导出的全部图标。遍历它就是浏览当前可用图标的完整清单；找到后按同名命名导入，拿到的就是同一个数据对象。

```tsx
import { iconGallery } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4">
      {Object.entries(iconGallery).map(([name, icon]) => (
        <span key={name} className="flex flex-col items-center gap-2">
          <web-ui-icon icon={icon}></web-ui-icon>
          <span className="text-xs text-(--wui-color-text-secondary)">{name}</span>
        </span>
      ))}
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4">
    <span v-for="(icon, name) in iconGallery" :key="name" class="flex flex-col items-center gap-2">
      <web-ui-icon :icon="icon"></web-ui-icon>
      <span class="text-xs text-(--wui-color-text-secondary)">{{ name }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { iconGallery } from '@greypan/web-ui/icons'
</script>
```

## API

### Props

| 名称    | 说明                                                       | 类型          | 默认值  |
| ------- | ---------------------------------------------------------- | ------------- | ------- |
| `icon`  | Iconify 数据对象；只能通过 property 传入，不接受图标名字。 | `IconifyIcon` | —       |
| `spin`  | 旋转动画。                                                 | `boolean`     | `false` |
| `size`  | 像素尺寸，同时写进 `<svg>` 的 `width` 与 `height`。        | `number`      | `18`    |
| `color` | 图标颜色；留空时先读 `--wui-icon-color`，再读文字颜色。    | `string`      | —       |

### 行为说明

图标本身是 `aria-hidden="true"`，不带任何语义，因此名称一律由外部提供：旁边的文字，或者宿主控件的 `aria-label`。宿主设置了 `user-select: none`，图标与文字混排时不会被整段选中并拖走。

`spin`、`size`、`color` 三个属性都会同步为 attribute，可以直接从 DOM 读回当前值。`icon` 不会同步，因为它是一个对象。

### 画布

画布取自数据对象的 `left` / `top` / `width` / `height`，缺省为 `0 0 16 16`。`@greypan/web-ui/icons` 的资产都自带画布，缺省值只用于直接传入的原始对象。

画布给错不会报错，只会按错误的比例缩放图形，并把它挤到一角。自己拼对象时，要按 SVG 的真实坐标系写 `width` / `height`。

### CSS Custom Properties

| 名称                  | 说明                                                     | 默认值    |
| --------------------- | -------------------------------------------------------- | --------- |
| `--wui-icon-color`    | 图标颜色；被 `color` 属性覆盖                            | `inherit` |
| `--wui-duration-spin` | `spin` 的旋转周期；减少动态效果时放慢到 `1600ms`，不停止 | `600ms`   |
