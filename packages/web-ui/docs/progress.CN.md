# Progress

[English](./progress.md) | 简体中文

progress / 进度指示：用一条线性轨道表示已完成比例，也支持 `sport` 循环滑动形态。

## 示例

### 基础用法

`value` 的取值范围是 `0..max`，超过上限的值会收敛到 `max`。宿主始终带 `role="progressbar"`，用 `aria-label` 给它可访问名称。

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="资料完善度" value={24}></web-ui-progress>
      <web-ui-progress aria-label="上传进度" value={62}></web-ui-progress>
      <web-ui-progress aria-label="同步完成" value={100}></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="资料完善度" :value="24"></web-ui-progress>
    <web-ui-progress aria-label="上传进度" :value="62"></web-ui-progress>
    <web-ui-progress aria-label="同步完成" :value="100"></web-ui-progress>
  </div>
</template>
```

### 自定义范围

`max` 可以不是 100，适合「已选 12 / 共 40」这类业务计数。`show-value` 把四舍五入后的百分比显示在轨道右侧。屏幕阅读器读取的是 `aria-valuenow` / `aria-valuemax`，不会重复读可见的百分比。

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="已选条目" max={40} value={12} showValue></web-ui-progress>
      <web-ui-progress aria-label="已用存储空间" max={256} value={192} showValue></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="已选条目" :max="40" :value="12" show-value></web-ui-progress>
    <web-ui-progress aria-label="已用存储空间" :max="256" :value="192" show-value></web-ui-progress>
  </div>
</template>
```

### 运动模式

`sport` 把完成部分变成一条在轨道内从左到右循环滑动的短条。条的**宽度**仍是 `value / max` 的百分比，**位置**由动画决定；首尾两帧短条都完全在轨道外，同一进度下循环首尾衔接无跳变。短条为方角。动画采用非线性缓动（两端减速、中段加速），周期默认为 1s（主题 spinner token 的 1.25 倍），在主题的减少动效设置下放慢到 2s 而不会停止。

`sport` 的进度是已知的，宿主保留 `aria-valuenow`，`show-value` 仍显示百分比。进度在动画运行中变化会同步更新条宽与位移终点。

`progressbar` 只表达已知进度。操作已开始、但还无法计算百分比时，应改用 `web-ui-spinner` 这类 loading 指示器，而不是进度条。组件不再提供 `indeterminate` 属性、`--wui-progress-indeterminate-duration` 变量与 `wui-progress-indeterminate` 动画；模板里遗留的 `indeterminate` 会被忽略，**未给 `value` 时会静默显示为 0%**，请一并移除并改用 `web-ui-spinner`。

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="文件校验中" value={35} sport></web-ui-progress>
      <web-ui-progress aria-label="索引构建中" max={200} value={130} sport showValue></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="文件校验中" :value="35" sport></web-ui-progress>
    <web-ui-progress aria-label="索引构建中" :max="200" :value="130" sport show-value></web-ui-progress>
  </div>
</template>
```

### 样式

轨道高度、圆角、轨道色和完成色都由 CSS Custom Properties 控制。把变量写在宿主或任意祖先上即可覆盖。宿主默认 `display: block; width: 100%`，由外层容器限制最大宽度。

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress
        aria-label="成功色进度"
        className="[--wui-progress-height:12px] [--wui-progress-fill-color:var(--wui-color-success)]"
        value={72}
        showValue
      ></web-ui-progress>
      <web-ui-progress
        aria-label="细轨道进度"
        className="[--wui-progress-height:4px] [--wui-progress-radius:2px]"
        value={38}
      ></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress
      aria-label="成功色进度"
      class="[--wui-progress-height:12px] [--wui-progress-fill-color:var(--wui-color-success)]"
      :value="72"
      show-value
    ></web-ui-progress>
    <web-ui-progress
      aria-label="细轨道进度"
      class="[--wui-progress-height:4px] [--wui-progress-radius:2px]"
      :value="38"
    ></web-ui-progress>
  </div>
</template>
```

## API

### 属性

| 名称         | 说明                                               | 类型      | 默认值  |
| ------------ | -------------------------------------------------- | --------- | ------- |
| `value`      | 当前完成量，按 `0..max` 收敛；非法数值回退为 `0`。 | `number`  | `0`     |
| `max`        | 完成量上限；非有限值或非正值回退为 `100`。         | `number`  | `100`   |
| `sport`      | 运动模式：按进度定宽的方角短条非线性循环滑动。     | `boolean` | `false` |
| `show-value` | 在轨道右侧显示四舍五入后的百分比。                 | `boolean` | `false` |

### CSS 自定义属性

| 名称                            | 说明                   | 默认值                                            |
| ------------------------------- | ---------------------- | ------------------------------------------------- |
| `--wui-progress-height`         | 轨道高度。             | `8px`                                             |
| `--wui-progress-radius`         | 轨道与完成部分的圆角。 | `var(--wui-radius-control, calc(infinity * 1px))` |
| `--wui-progress-track-color`    | 轨道底色。             | `var(--wui-color-surface-track, #e5e5eb)`         |
| `--wui-progress-fill-color`     | 完成部分颜色。         | `var(--wui-color-accent, #0071e3)`                |
| `--wui-progress-sport-duration` | sport 动画周期。       | `calc(var(--wui-duration-spinner, 800ms) * 1.25)` |
| `--wui-progress-sport-easing`   | sport 动画缓动曲线。   | `cubic-bezier(0.65, 0, 0.35, 1)`                  |

### 构件

公开样式部件为 `base`、`track`、`indicator` 与 `value`。需要更细的视觉控制时，可以经 `::part(...)` 选中；数值与尺寸变化仍应优先通过上面的 CSS Custom Properties 表达。`--wui-progress-percent` 与 `--wui-progress-sport-shift` 由组件按进度写入 `indicator` 的内联样式，不能从外部覆盖。

### 无障碍

宿主承担 `progressbar` 语义，并始终维护 `aria-valuemin`、`aria-valuemax` 与 `aria-valuenow`。`sport` 只改变视觉表现，不改变进度语义。未提供 `aria-label` 或 `aria-labelledby` 时，名称为内置英文 `Progress`。调用方应优先传入与业务含义一致的可访问名称。
