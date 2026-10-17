---
component: segmented
tag: web-ui-segmented
---

分段控制器（单选按钮组），子项是 `<web-ui-segmented-trigger>`；`value` 同步选中项，并与原生 `<form>` 集成。

## 示例

### 基础

默认插槽投影 segmented-trigger，选中由 `value` 决定。

```react
<web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
  <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
</web-ui-segmented>
```

```vue
<template>
  <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('week')
</script>
```

### 变体

`variant` 选择轨道与指示器的材质：`inset`（默认，嵌入轨道）或 `raised`（经典浮起）。

```react
<web-ui-segmented variant="raised" value="list">
  <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="grid">网格</web-ui-segmented-trigger>
</web-ui-segmented>
```

```vue
<template>
  <web-ui-segmented variant="raised" value="list">
    <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="grid">网格</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>
```

### 单项禁用

`disabled` 加在组上会禁用全部 trigger；只禁用某一项时加在该 trigger 上。

```react
<web-ui-segmented value="a">
  <web-ui-segmented-trigger value="a">可用</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="b" disabled>
    不可用
  </web-ui-segmented-trigger>
</web-ui-segmented>
```

```vue
<template>
  <web-ui-segmented value="a">
    <web-ui-segmented-trigger value="a">可用</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="b" disabled>不可用</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>
```

## API

### Props

| 名称       | 说明                                   | 类型                  | 默认值    |
| ---------- | -------------------------------------- | --------------------- | --------- |
| `name`     | 表单字段名。                           | `string`              | `''`      |
| `variant`  | 材质变体：`inset`（默认）或 `raised`。 | `'inset' \| 'raised'` | `'inset'` |
| `disabled` | 禁用全部 trigger。                     | `boolean`             | `false`   |
| `required` | 必填校验。                             | `boolean`             | `false`   |
| `value`    | 当前选中值。                           | `string`              | `''`      |

### Events

| 名称     | 说明                 |
| -------- | -------------------- |
| `input`  | 选中值变化时触发。   |
| `change` | 用户切换选中时触发。 |

### Slots

| 名称      | 说明                                     |
| --------- | ---------------------------------------- |
| `default` | 投影 `<web-ui-segmented-trigger>` 子项。 |

### 变体

`inset`（默认，「凹」）是不透明实体轨道（`--wui-color-surface`）——1px 描边环与投影全程常驻，静止指示器是 `--wui-color-surface-segmented` 纯灰底，视觉上嵌入轨道。浅色下该 token 与 `--wui-color-page` 同值，轨道与页面齐平，凹感只由常驻环与投影承担；深色下它是「比页面高一档」的 elevation，轨道依旧浮离页面。`raised`（「凸」）是经典形态：flat 灰轨道（`--wui-color-surface-segmented`，无环无投影），静止指示器是 `--wui-color-surface-selected` 实体底加柔投影，浮起于轨道之上。两个变体的按压/拖拽态一致——指示器转透明玻璃（backdrop blur、80ms 淡入的描边环、1.5x 放大），松开淡回各自静止面。非法值回退 `inset`。

与原生 `<form>` 集成（通过 `ElementInternals`）。

根据 `value` 同步子 trigger 的 `checked` 状态。`disabled` 提供继承的有效禁用状态，不改写 trigger 自身的 `disabled` 属性。直接设 `value` 不派发事件。

按住当前选中项横向拖拽可滑动指示器，松手吸附到最近选项（快速抛掷按速度切换）。trigger 宽度不等时，拖拽中的指示器取「离自身中心最近的那一项」的宽度——即预览松手会落到的那一项，而不是保持按下那一项的宽度。触摸面声明 `touch-action: none`，拖拽激活期间阻止 `touchmove` 默认滚动，避免 iOS Safari 中断手势。

### 按压态

轨道在所有状态下都是不透明实体面（`--wui-color-surface`，浅色即 page 同色、无 backdrop filter），1px 描边环与投影全程不变；转为玻璃的是指示器这一层。静止态指示器是 `--wui-color-surface-segmented` 实色底、玻璃输出全部关闭；按压/拖拽态获得 backdrop blur、随 80ms 过渡淡入的玻璃描边环与 1.5x 放大，底色全透明：指示器的 blur 采样面整个落在轨道之内，此前的玻璃轨道上全透明指示器在均匀深底与相邻轨道仅差 +0.5 阶，条纹底实测指示器内部灰度 std 1.89（背景渗透）；轨道实体化后同一采样 std 归零，按压态本体的可感知性由实色轨道与放大/环/投影共同承担，不再需要 tint 打底或压制轨道边缘装饰。底色不淡入——按下第一帧即落定；松开时指示器经 `--wui-duration-press` 淡回实色灰底。

### 文字色

选中与未选中项文字一律保持 `--wui-color-text-secondary`——`inset`/`raised` 两个变体一致，静止态与按压/拖拽态一致。选中态只由指示器承担，任何标签都不着 `--wui-color-accent`。
