# Spinner

加载旋转器。可以在页面里声明式使用，也可以用静态方法 `WebUiSpinner.show()` / `hide()` 挂载一个全屏实例。

## Samples

### Basic

`size` 是像素尺寸，只改变旋转器本体的宽高。宿主带 `role="status"` 和 `aria-label`，已有的值不会被改写，可以按语境直接写在元素上。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={16}></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">16</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">24（默认）</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={48} aria-label="正在提交"></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">48，另给无障碍名</span>
      </span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="16"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">16</span>
    </span>
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">24（默认）</span>
    </span>
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="48" aria-label="正在提交"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">48，另给无障碍名</span>
    </span>
  </div>
</template>
```

### Description text

说明有两条通道：`description` 属性由组件渲染一段带样式的文字，`description` 插槽把内容交给你自己排版。两者同时提供会渲染两行，组件不判断互斥。声明式实例把说明排在旋转器右侧，全屏实例排在下方。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-6">
      <web-ui-spinner size={32} description="正在加载数据"></web-ui-spinner>
      <web-ui-spinner size={32}>
        <span slot="description" className="text-sm text-(--wui-color-text-secondary)">
          正在加载数据 · 第 2 / 5 步
        </span>
      </web-ui-spinner>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-6">
    <web-ui-spinner :size="32" description="正在加载数据"></web-ui-spinner>
    <web-ui-spinner :size="32">
      <span slot="description" class="text-sm text-(--wui-color-text-secondary)"> 正在加载数据 · 第 2 / 5 步 </span>
    </web-ui-spinner>
  </div>
</template>
```

### Full-screen instance

`show()` 在当前主题的 overlay 容器（没有主题作用域时回退到 body 的默认 overlay 容器）挂载一个全屏实例，`size` / `description` / `color` 覆盖外观，`duration` 大于 0 时到期自动 `hide()`。

全屏实例的覆盖层不接收指针事件。它只报告加载状态，不接管点击、焦点或页面滚动。`hide()` 会关闭它，并清除 `duration` 计时器。

连续点击不会叠层：新实例挂载时会移除上一个命令式实例。

```tsx
import { WebUiSpinner } from '@greypan/web-ui'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button onClick={() => WebUiSpinner.show()}>show()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.hide()}>hide()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 16 })}>小（16px）</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 64, duration: 2000 })}>大（64px）</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ description: '正在同步云端文件，约 10 秒', duration: 10000 })}>
        带说明，10 秒
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button @click="show">show()</web-ui-button>
    <web-ui-button @click="hide">hide()</web-ui-button>
    <web-ui-button @click="showSmall">小（16px）</web-ui-button>
    <web-ui-button @click="showLarge">大（64px）</web-ui-button>
    <web-ui-button @click="showWithDescription">带说明，10 秒</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { WebUiSpinner } from '@greypan/web-ui'

function show() {
  WebUiSpinner.show()
}

function hide() {
  WebUiSpinner.hide()
}

function showSmall() {
  WebUiSpinner.show({ size: 16 })
}

function showLarge() {
  WebUiSpinner.show({ size: 64, duration: 2000 })
}

function showWithDescription() {
  WebUiSpinner.show({ description: '正在同步云端文件，约 10 秒', duration: 10000 })
}
</script>
```

### Speed

旋转动画的周期由 `--wui-duration-spinner` 控制（`800ms`），在宿主上覆盖它就能改变速度。主题为 `motion="reduced"` 或系统偏好减少动效时，这个 token 放慢到 `1600ms`，不会停止。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={32}></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">800ms（默认）</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={32} className="[--wui-duration-spinner:400ms]"></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">400ms</span>
      </span>
      <span className="flex flex-col items-center gap-2">
        <web-ui-spinner size={32} className="[--wui-duration-spinner:1600ms]"></web-ui-spinner>
        <span className="text-xs text-(--wui-color-text-secondary)">1600ms</span>
      </span>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="32"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">800ms（默认）</span>
    </span>
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="32" class="[--wui-duration-spinner:400ms]"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">400ms</span>
    </span>
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="32" class="[--wui-duration-spinner:1600ms]"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">1600ms</span>
    </span>
  </div>
</template>
```

## API

### Props

| 名称          | 说明                                                 | 类型     | 默认值 |
| ------------- | ---------------------------------------------------- | -------- | ------ |
| `size`        | 旋转器像素尺寸。                                     | `number` | `24`   |
| `description` | 说明文字，由组件排版（次要色、居中、最大 240px）。   | `string` | `''`   |
| `color`       | 指示器颜色，CSS 颜色值；为空时跟随主题的次要文本色。 | `string` | `''`   |

### Slots

| 名称          | 说明                                                         |
| ------------- | ------------------------------------------------------------ |
| `description` | 说明的第二条通道：内容原样交给你排版，与属性同时给就画两行。 |

### Options

| 名称          | 说明                                                               | 类型     | 默认值 |
| ------------- | ------------------------------------------------------------------ | -------- | ------ |
| `size`        | 实例尺寸；只在 truthy 时写实例的 `size`，`0` 被忽略而留默认 `24`。 | `number` | `24`   |
| `description` | 实例说明文字，使用属性这条通道；空串等于不设置。                   | `string` | `''`   |
| `color`       | 实例指示器颜色，CSS 颜色值；空串等于不设置。                       | `string` | `''`   |
| `duration`    | 大于 `0` 时到期自动 `hide()`；不传或 `0` 时实例一直存在。          | `number` | —      |

### Methods

| 名称                          | 说明                                                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WebUiSpinner.show(options?)` | 在主题的 overlay 容器（无主题时为 body 的默认 overlay 容器）挂载一个全屏实例并返回它；实例非模态，不拦截页面交互与滚动。新实例挂载时移除上一个命令式实例，`duration` 到期调用 `hide()`。 |
| `WebUiSpinner.hide()`         | 关闭实例的 dialog，清除 `duration` 计时器，并把 `show()` 挂载的实例从 overlay 容器移除；没有实例时不做任何事。                                                                           |

### 行为说明

无障碍名由组件补齐：缺 `role` 就补 `status`，缺 `aria-label` 就补 `Loading`；两者都已存在时不做改写。

尺寸只有 `size` 这一个入口：在宿主上覆盖 `--wui-spinner-size` 不生效。

命令式实例挂载在主题的 overlay 容器里（没有主题作用域时挂 body 的默认 overlay 容器），说明文字、速度（`--wui-duration-spinner`）和层级（`--wui-layer-loading`）因此都跟随主题。

组件不会替你收尾。`duration` 不传或为 `0` 时实例会一直存在，只有 `hide()` 或新实例顶替才会移除它。命令式实例不锁页面滚动。

### 颜色

指示器颜色默认取宿主的 `--wui-color-text-secondary`，`color` 属性给任意 CSS 颜色值即可覆盖（声明式的属性和 `show()` 的 `color` option 都使用它）。

说明文字使用 `--wui-color-text-secondary`。

### CSS Custom Properties

| 名称                     | 说明                                              | 默认值  |
| ------------------------ | ------------------------------------------------- | ------- |
| `--wui-spinner-size`     | 旋转器宽高；覆盖无效，尺寸由 `size` 决定          | `24px`  |
| `--wui-duration-spinner` | 旋转动画周期；减少动效时放慢到 `1600ms`，不会停止 | `800ms` |
| `--wui-layer-loading`    | 命令式 overlay 的 `z-index`，属主题的层级 token   | `3000`  |
