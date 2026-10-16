---
component: popover
tag: web-ui-popover
---

锚定触发元素的弹出层，支持 click / hover / manual 三种触发方式，`trigger` 插槽放触发器、默认插槽放面板内容。

## 示例

### 基础

click 模式点击触发器切换；触发器请放入可交互元素，ARIA 状态会回写到它。

```react
<web-ui-popover>
  <web-ui-button slot="trigger" variant="secondary">
    显示详情
  </web-ui-button>
  <div className="popover-body">这里是弹出层内容</div>
</web-ui-popover>
```

```vue
<template>
  <web-ui-popover>
    <web-ui-button slot="trigger" variant="secondary">显示详情</web-ui-button>
    <div class="popover-body">这里是弹出层内容</div>
  </web-ui-popover>
</template>
```

### Hover 触发

`trigger` 为 `hover` 时用 `pointerenter` / `pointerleave` 加延迟控制开合。

```react
<web-ui-popover trigger="hover" placement="top">
  <web-ui-button slot="trigger">悬停我</web-ui-button>
  <div className="popover-body">悬停显示的气泡</div>
</web-ui-popover>
```

```vue
<template>
  <web-ui-popover trigger="hover" placement="top">
    <web-ui-button slot="trigger">悬停我</web-ui-button>
    <div class="popover-body">悬停显示的气泡</div>
  </web-ui-popover>
</template>
```

### 受控开合

`open` 可被程序化写入，`open-change` 只报告用户来源的开合。

```react
<web-ui-popover open={open} onopen-change={event => setOpen(event.detail.open)}>
  <web-ui-button slot="trigger" onClick={() => setOpen(!open)}>
    主题设置
  </web-ui-button>
  <div className="popover-body">受控内容</div>
</web-ui-popover>
```

```vue
<template>
  <web-ui-popover :open="open" @open-change="open = $event.detail.open">
    <web-ui-button slot="trigger" @click="open = !open">主题设置</web-ui-button>
    <div class="popover-body">受控内容</div>
  </web-ui-popover>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

## API

### Props

| 名称               | 说明                                           | 类型                             | 默认值     |
| ------------------ | ---------------------------------------------- | -------------------------------- | ---------- |
| `open`             | 弹出层可见性。                                 | `boolean`                        | `false`    |
| `disabled`         | 禁用状态。                                     | `boolean`                        | `false`    |
| `placement`        | Floating UI 位置。                             | `Placement`                      | `'bottom'` |
| `offset`           | 与锚点的距离（px）。                           | `number`                         | `8`        |
| `trigger`          | 触发方式：`click`（默认）、`hover`、`manual`。 | `'click' \| 'hover' \| 'manual'` | `'click'`  |
| `portal`           | 在 theme-owned overlay root 中渲染。           | `boolean`                        | `false`    |
| `overlayContainer` | 显式 Portal 容器（property）。                 | `OverlayContainer`               | —          |

### Events

| 名称          | 说明                                   |
| ------------- | -------------------------------------- |
| `open-change` | 弹出层开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                       |
| --------- | -------------------------- |
| `trigger` | 触发器，请放入可交互元素。 |
| `default` | 弹出层内容。               |
