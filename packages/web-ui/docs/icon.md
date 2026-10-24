---
component: icon
tag: web-ui-icon
---

icon 渲染组件，输入是 Iconify 数据对象（`@greypan/web-ui/icons` 按图标集命名导出的就是这种对象）；渲染出来是一个 `aria-hidden="true"` 的 `<svg>`，图标自身不承载可访问名称。

## 示例

### 基础 {#basic}

`icon` 声明为 `attribute: false`，只认 property 绑定，传的是 Iconify 数据对象而不是图标名字。不传 `icon` 时组件什么都不画，连 `<svg>` 也不产生。

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

### 自带图标数据 {#raw}

组件认的输入只有 `IconifyIcon` 这一种形状：`body` 必填，是一段 SVG 内部标记；`width` / `height` / `left` / `top` 描述画布。自己拼一个同样能渲染，图标不必先进 `@greypan/web-ui/icons`。

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

### 尺寸 {#size}

`size` 是像素数值，同时写进 `<svg>` 的 `width` 与 `height`；`viewBox` 取资产自己的画布，所以图形按 viewBox 等比缩放，不是被拉伸。默认 `18`。

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

### 颜色 {#color}

三条来源按优先级排：`color` 写成 `<svg>` 的内联 style，压过一切；其次是宿主上的 `--wui-icon-color`；都没有就跟着文字颜色走——资产画的是 `stroke="currentColor"`。最后一个是前两条同时给，内联 style 赢了。

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

### 旋转 {#spin}

`spin` 给 `<svg>` 挂一条无限循环的 rotation，周期取 `--wui-duration-spin`（`600ms`）。主题 `motion="reduced"` 或系统 reduce 偏好下这条 token 放慢到 `1600ms` 而不停：加载指示停掉会被读成界面卡死。

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

### 与按钮组合 {#button}

button 的 `prefix` / `suffix` 插槽放 icon，图标与 label 走同一条 flex 线、共用 label 的字体色。纯图标按钮打开 `icon` 并写 `aria-label`：图标自己 `aria-hidden`，按钮里没有别的可见内容时它是唯一的线索。

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

## API

### Props

| 名称    | 说明                                                                            | 类型          | 默认值  |
| ------- | ------------------------------------------------------------------------------- | ------------- | ------- |
| `icon`  | Iconify 数据对象；`attribute: false`，只按 property 传，不认图标名字。          | `IconifyIcon` | —       |
| `spin`  | 旋转动画。                                                                      | `boolean`     | `false` |
| `size`  | 像素尺寸，同时写进 `<svg>` 的 `width` 与 `height`。                             | `number`      | `18`    |
| `color` | 图标颜色，写成 `<svg>` 的内联 style；留空时先读 `--wui-icon-color` 再读文字色。 | `string`      | —       |

### 行为说明

`aria-hidden="true"` 挂在生成的 `<svg>` 上，宿主只是一个 `inline-flex` 盒、不带任何语义，所以图标的名字一律由外部提供：旁边的文字、或者宿主控件的 `aria-label`。宿主 `user-select: none`，图标文字混排时不会被整段选中拖走。

`spin`、`size`、`color` 三个属性都 reflect，DOM 上能直接读回当前值；`icon` 不 reflect，它是个对象。

### 画布

`viewBox` 由数据对象的 `left` / `top` / `width` / `height` 拼出，缺省取 `0 0 16 16`——Iconify 规范里 width/height 缺省即 16。

`@greypan/web-ui/icons` 生成的资产都自带画布，这条兜底只服务直接传进来的原始对象。

画布给错了不会报错，只会把图形按错误比例缩放并偏到画布一角，所以自己拼对象时要按 SVG 的真实坐标系写 `width` / `height`。

### CSS Custom Properties

| 名称                  | 说明                                              | 默认值    |
| --------------------- | ------------------------------------------------- | --------- |
| `--wui-icon-color`    | icon 颜色；被 `color` 属性的内联 style 盖过       | `inherit` |
| `--wui-duration-spin` | `spin` 的旋转周期；reduce 下放慢到 `1600ms`，不停 | `600ms`   |
