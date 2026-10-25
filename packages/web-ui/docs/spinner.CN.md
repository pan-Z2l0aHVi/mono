---
component: spinner
tag: web-ui-spinner
---

加载旋转器：声明式放在页面里，或用静态 `WebUiSpinner.show()` / `hide()` 挂一个全屏实例。8 根叶片各差 1/8 个周期，形成一圈追光。

## Samples

### 基础 {#basic}

`size` 是像素尺寸，只改旋转器本体的宽高。宿主在 connect 时补上 `role="status"` 与 `aria-label`，已经有就不改写，所以按语境换名直接写在元素上。

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

### 说明文字 {#description}

说明有两条通道：`description` 属性由组件画一段带样式的文字，`description` 插槽把内容交给你自己排版。两者同时给就画两行——组件不判互斥。声明式实例是 inline-flex 盒，说明排在旋转器**右侧**；全屏实例排在**下方**。

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

### 全屏实例 {#imperative}

`show()` 在当前主题的 overlay root（没有主题作用域时回退到 body 的 fallback overlay root）挂一个全屏实例，`size` / `description` / `color` 覆盖外观，`duration` 大于 0 时到期自动 `hide()`。

实例期间用原生 `<dialog>` 的 `showModal()` 拦截页面其余交互并锁定滚动；`hide()` 或卸载会同时释放滚动锁、清掉 `duration` 计时器。

连点不会叠层——新实例挂上时移除上一个命令式实例。

```tsx
import { WebUiSpinner } from '@greypan/web-ui'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button onClick={() => WebUiSpinner.show()}>show()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.hide()}>hide()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 16 })}>小（16px）</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 64, duration: 2000 })}>
        大（64px），2 秒后自己收
      </web-ui-button>
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
    <web-ui-button @click="showLarge">大（64px），2 秒后自己收</web-ui-button>
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

### 转速 {#speed}

叶片追光的周期是 `--wui-duration-spinner`（`800ms`），在宿主上覆盖它就能改转速。主题 `motion="reduced"` 或系统 reduce 偏好下这个 token 放慢到 `1600ms` 而不停：加载指示停掉会被读成界面卡死。

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

| 名称          | 说明                                                   | 类型     | 默认值 |
| ------------- | ------------------------------------------------------ | -------- | ------ |
| `size`        | 旋转器像素尺寸；组件把它写成宿主内联样式的宽高 token。 | `number` | `24`   |
| `description` | 说明文字，由组件排版（次要色、居中、最大 240px）。     | `string` | `''`   |
| `color`       | 叶片颜色，CSS 颜色值；为空时跟随主题次要文本色。       | `string` | `''`   |

### Slots

| 名称          | 说明                                                         |
| ------------- | ------------------------------------------------------------ |
| `description` | 说明的第二条通道：内容原样交给你排版，与属性同时给就画两行。 |

### Options

| 名称          | 说明                                                               | 类型     | 默认值 |
| ------------- | ------------------------------------------------------------------ | -------- | ------ |
| `size`        | 实例尺寸；只在 truthy 时写实例的 `size`，`0` 被忽略而留默认 `24`。 | `number` | `24`   |
| `description` | 实例说明文字，走属性那条通道；空串等于不设。                       | `string` | `''`   |
| `color`       | 实例叶片颜色，CSS 颜色值；空串等于不设。                           | `string` | `''`   |
| `duration`    | 大于 `0` 时到期自动 `hide()`；不传或 `0` 就一直挂着。              | `number` | —      |

### Methods

| 名称                          | 说明                                                                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WebUiSpinner.show(options?)` | 在主题 overlay root（无主题时为 body 的 fallback overlay root）挂载一个全屏实例并返回它；期间用 `showModal()` 拦截页面交互并锁定滚动。新实例 connect 时移除上一个命令式实例，`duration` 到期调用 `hide()`。 |
| `WebUiSpinner.hide()`         | 释放滚动锁、清掉 `duration` 计时器并移除 `show()` 挂载的实例；没有实例时为 no-op。                                                                                                                          |

### 行为说明

无障碍名在 `connectedCallback` 里补：缺 `role` 补 `status`，缺 `aria-label` 补 `Loading`；两者都已存在时不改写。

叶片是 8 根 `<span>`，各自转 `i * 45deg` 并带 `-(i / 8)` 周期的负 `animation-delay`，视觉上就是一圈追着跑的余晖。

`size` 不是只写 CSS 变量：组件在 `updated()` 里把 `--wui-spinner-size` 写成宿主**内联样式**，所以在宿主上设同名变量会被盖掉，尺寸只有 `size` 这一个入口。

命令式实例挂在主题的 overlay root 里（没有主题作用域时挂 body 的 fallback overlay root），主题 token 沿 overlay root 继承：说明文字、转速（`--wui-duration-spinner`）与层级（`--wui-layer-loading`）都跟主题走。

没有主题作用域时才落回组件样式里的字面值 `#6a6a6a` / `800ms` / `300`。

组件不会替你收尾：`duration` 不传或为 `0` 时实例一直挂着，只有 `hide()`、新实例顶替或显式移除才会收掉它；实例被移除时会释放滚动锁与 overlay 占位。

### 颜色

叶片用 `currentcolor` 画：默认继承宿主的 `--wui-color-text-secondary`（回落 `#6a6a6a`），`color` 属性给 CSS 颜色值即可覆盖（声明式与 `show()` 的 `color` option 都走它）。

说明文字走 `--wui-color-text-secondary`。

### CSS Custom Properties

| 名称                     | 说明                                                             | 默认值  |
| ------------------------ | ---------------------------------------------------------------- | ------- |
| `--wui-spinner-size`     | 旋转器宽高；由 `size` 写成宿主内联样式，消费方设同名变量会被盖掉 | `24px`  |
| `--wui-duration-spinner` | 叶片追光周期；reduce 下放慢到 `1600ms`，不停                     | `800ms` |
| `--wui-layer-loading`    | 命令式 overlay 的 `z-index`，属主题的层级 token                  | `300`   |
