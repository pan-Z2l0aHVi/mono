---
component: progress
tag: web-ui-progress
---

progress / 进度指示：用一条线性轨道表达已完成比例，也支持不暴露具体数值的 indeterminate 状态。

## Samples

### Basic

`value` 默认落在 `0..100`，写入超过上限的数值会收敛到 `max`。宿主始终带 `role="progressbar"`；示例用 `aria-label` 给每条进度一个可访问名称。

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

### Custom range

`max` 可以不是 100，适合「已选 12 / 共 40」这类业务计数；`show-value` 把当前百分比显示在轨道右侧。屏幕阅读器读的是 `aria-valuenow` / `aria-valuemax`，不会重复读可见百分比。

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="已选条目" max={40} value={12} showValue></web-ui-progress>
      <web-ui-progress aria-label="存储空间" max={256} value={192} showValue></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="已选条目" :max="40" :value="12" show-value></web-ui-progress>
    <web-ui-progress aria-label="存储空间" :max="256" :value="192" show-value></web-ui-progress>
  </div>
</template>
```

### Indeterminate

`indeterminate` 用于操作已经开始、但还无法计算百分比的状态。此时组件移除 `aria-valuenow`，仍保留进度条的名称与上限；主题的 reduced-motion 档位会放慢循环动画，而不是把它完全停掉。

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress aria-label="正在连接服务器" indeterminate></web-ui-progress>
      <web-ui-progress aria-label="正在准备数据" indeterminate showValue></web-ui-progress>
    </div>
  )
}
```

```vue
<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress aria-label="正在连接服务器" indeterminate></web-ui-progress>
    <web-ui-progress aria-label="正在准备数据" indeterminate show-value></web-ui-progress>
  </div>
</template>
```

### Styling

轨道高度、圆角、轨道色与完成色都走 CSS Custom Properties；把变量写在宿主或任意祖先上即可覆盖。宿主默认 `display: block; width: 100%`，外层容器负责限制最大宽度。

```tsx
export default function Demo() {
  return (
    <div className="grid w-full max-w-xl gap-5">
      <web-ui-progress
        aria-label="高对比度进度"
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
      aria-label="高对比度进度"
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

### Props

| 名称            | 说明                                                           | 类型      | 默认值  |
| --------------- | -------------------------------------------------------------- | --------- | ------- |
| `value`         | 当前完成量，按 `0..max` 收敛；非法数值回退为 `0`。             | `number`  | `0`     |
| `max`           | 完成量上限；非有限值或非正值回退为 `100`。                     | `number`  | `100`   |
| `indeterminate` | 未知进度模式。开启后移除 `aria-valuenow`，并播放循环动画。     | `boolean` | `false` |
| `show-value`    | 在轨道右侧显示四舍五入后的百分比；indeterminate 时显示省略号。 | `boolean` | `false` |

### CSS Custom Properties

| 名称                                    | 说明                     | 默认值                                            |
| --------------------------------------- | ------------------------ | ------------------------------------------------- |
| `--wui-progress-height`                 | 轨道高度。               | `8px`                                             |
| `--wui-progress-radius`                 | 轨道与完成部分的圆角。   | `var(--wui-radius-control, calc(infinity * 1px))` |
| `--wui-progress-track-color`            | 轨道底色。               | `var(--wui-color-surface-track, #e5e5ea)`         |
| `--wui-progress-fill-color`             | 完成部分颜色。           | `var(--wui-color-accent, #0071e3)`                |
| `--wui-progress-indeterminate-duration` | indeterminate 动画周期。 | `var(--wui-duration-spinner, 800ms)`              |

### Parts

公开样式部件为 `base`、`track`、`indicator` 与 `value`。需要更细的视觉控制时，可以经 `::part(...)` 选中；数值与尺寸变化仍应优先通过上面的 CSS Custom Properties 表达。

### Accessibility

宿主承担 `progressbar` 语义，并维护 `aria-valuemin`、`aria-valuemax` 与确定态的 `aria-valuenow`。未提供 `aria-label` 或 `aria-labelledby` 时，名称为内置英文 `Progress`；消费方应优先传入与业务含义一致的可访问名称。
