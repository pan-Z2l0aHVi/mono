---
component: tooltip
tag: web-ui-tooltip
---

tooltip，支持指针与焦点触发；`content` 属性提供纯文本，`content` 插槽可放更丰富的内容。

## 示例

### 基础

默认插槽是 trigger，`content` 是提示文本。

```tsx
<web-ui-tooltip content="保存当前更改">
  <web-ui-button variant="secondary">保存</web-ui-button>
</web-ui-tooltip>
```

```vue
<template>
  <web-ui-tooltip content="保存当前更改">
    <web-ui-button variant="secondary">保存</web-ui-button>
  </web-ui-tooltip>
</template>
```

### 内容插槽

`content` 插槽替代纯文本，可放 icon 或带格式的内容。

```tsx
<web-ui-tooltip placement="right">
  <web-ui-icon slot="default" icon={lucideInfo}></web-ui-icon>
  <div slot="content">
    这是一个 <strong>富文本</strong> 提示
  </div>
</web-ui-tooltip>
```

```vue
<template>
  <web-ui-tooltip placement="right">
    <web-ui-icon slot="default" :icon="lucideInfo"></web-ui-icon>
    <div slot="content">这是一个 <strong>富文本</strong> 提示</div>
  </web-ui-tooltip>
</template>

<script setup lang="ts">
import { lucideInfo } from '@greypan/web-ui/icons'
</script>
```

### 延迟

`show-delay` / `hide-delay` 控制指针进出时的显示与隐藏延迟；`disabled` 直接关闭提示。

```tsx
<web-ui-tooltip content="立即出现" show-delay={0} hide-delay={0}>
  <web-ui-button>悬停我</web-ui-button>
</web-ui-tooltip>
```

```vue
<template>
  <web-ui-tooltip content="立即出现" :show-delay="0" :hide-delay="0">
    <web-ui-button>悬停我</web-ui-button>
  </web-ui-tooltip>
</template>
```

## API

### Props

| 名称               | 说明                                      | 类型               | 默认值  |
| ------------------ | ----------------------------------------- | ------------------ | ------- |
| `placement`        | Floating UI 位置，默认 `top`。            | `Placement`        | `'top'` |
| `show-delay`       | 显示延迟（毫秒）。                        | `number`           | `200`   |
| `hide-delay`       | 隐藏延迟（毫秒）。                        | `number`           | `100`   |
| `disabled`         | 禁用状态。                                | `boolean`          | `false` |
| `offset`           | 与 trigger 的距离（px）。                 | `number`           | `6`     |
| `content`          | 提示文本，是 `content` 插槽的纯文本替代。 | `string`           | `''`    |
| `open`             | 可见性。                                  | `boolean`          | `false` |
| `portal`           | 在 theme-owned overlay root 中渲染。      | `boolean`          | `false` |
| `overlayContainer` | 显式 Portal 容器（property）。            | `OverlayContainer` | —       |

### Events

| 名称          | 说明                                 |
| ------------- | ------------------------------------ |
| `open-change` | 提示开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                                   |
| --------- | -------------------------------------- |
| `default` | trigger。                              |
| `content` | 提示 panel 内容，替代 `content` 属性。 |

### 行为说明

`open` 是自管理的可见性属性。指针/焦点触发会更新它，直接赋值 property 也会同步本地或 Portal panel；`open-change` 仅用户来源的 toggle 时派发。第一个 Tooltip 显示后，相邻 Tooltip 会立即切换；其余 pointer/focus 触发使用延迟计时器。

### CSS Custom Properties

| 名称                      | 说明         | 默认值  |
| ------------------------- | ------------ | ------- |
| `--wui-tooltip-max-width` | 提示最大宽度 | `240px` |
| `--wui-tooltip-font-size` | 提示字号     | `13px`  |
