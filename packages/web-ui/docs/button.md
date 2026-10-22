---
component: button
tag: web-ui-button
---

button 用于触发一个即时操作：提交表单、打开 dialog、切换状态。它不贡献表单值，
`type="submit"` / `type="reset"` 时把原生 activation 转发给宿主 form。

## 示例

### 变体

`variant` 决定视觉层级。默认 `glass` 与页面背景融合，适合工具栏；`primary` 一页只应有一个。

```react
<web-ui-button variant="primary">Primary</web-ui-button>
<web-ui-button variant="secondary">Secondary</web-ui-button>
<web-ui-button variant="ghost">Ghost</web-ui-button>
<web-ui-button variant="danger">Danger</web-ui-button>
<web-ui-button variant="glass">Glass</web-ui-button>
```

```vue
<template>
  <web-ui-button variant="primary">Primary</web-ui-button>
  <web-ui-button variant="secondary">Secondary</web-ui-button>
  <web-ui-button variant="ghost">Ghost</web-ui-button>
  <web-ui-button variant="danger">Danger</web-ui-button>
  <web-ui-button variant="glass">Glass</web-ui-button>
</template>
```

### 插槽

默认插槽是 button 文字；`prefix` / `suffix` 放在文字两侧，icon 模式（`icon`）下默认插槽整体作为 icon。

```react
<web-ui-button>
  <web-ui-icon slot="prefix" icon={lucideSearch}></web-ui-icon>
  搜索
  <web-ui-icon slot="suffix" icon={lucideChevronRight}></web-ui-icon>
</web-ui-button>
```

```vue
<template>
  <web-ui-button>
    <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
    搜索
    <web-ui-icon slot="suffix" :icon="lucideChevronRight"></web-ui-icon>
  </web-ui-button>
</template>

<script setup lang="ts">
import { lucideChevronRight, lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### icon 模式

`icon` 让 button 变成正方形 icon button，此时 `loading` 优先于插槽内容，只渲染 spinner。

```react
<web-ui-button icon variant="primary" aria-label="搜索">
  <web-ui-icon icon={lucideSearch}></web-ui-icon>
</web-ui-button>
<web-ui-button icon loading variant="primary" aria-label="加载中">
  <web-ui-icon icon={lucideSearch}></web-ui-icon>
</web-ui-button>
```

```vue
<template>
  <web-ui-button icon variant="primary" aria-label="搜索">
    <web-ui-icon :icon="lucideSearch"></web-ui-icon>
  </web-ui-button>
  <web-ui-button icon loading variant="primary" aria-label="加载中">
    <web-ui-icon :icon="lucideSearch"></web-ui-icon>
  </web-ui-button>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### button group

`<web-ui-button-group>` 把多个 button 并成一组并画出相邻分割线；成员 button 的 `size` 在组内被忽略。

```react
<web-ui-button-group>
  <web-ui-button variant="secondary">左</web-ui-button>
  <web-ui-button variant="secondary">中</web-ui-button>
  <web-ui-button variant="secondary">右</web-ui-button>
</web-ui-button-group>
```

```vue
<template>
  <web-ui-button-group>
    <web-ui-button variant="secondary">左</web-ui-button>
    <web-ui-button variant="secondary">中</web-ui-button>
    <web-ui-button variant="secondary">右</web-ui-button>
  </web-ui-button-group>
</template>
```

`direction` 选择横排或竖排，分割线长度由 `--wui-button-group-divider-length` 控制。

## API

### Props

| 名称            | 说明                                                                                                       | 类型                                                         | 默认值     |
| --------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| `variant`       | 视觉变体：`primary` / `secondary` / `ghost` / `danger` / `glass`。                                         | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'`  |
| `disabled`      | 禁用态。禁用时不派发 click，也不参与表单提交。                                                             | `boolean`                                                    | `false`    |
| `loading`       | 加载态。与 `disabled` 一样阻断交互，并优先渲染 spinner。                                                   | `boolean`                                                    | `false`    |
| `full`          | 占满父容器宽度。                                                                                           | `boolean`                                                    | `false`    |
| `icon`          | icon 模式：button 为正方形，默认插槽整体作为 icon。                                                        | `boolean`                                                    | `false`    |
| `size`          | button 高度；裸数字按 px 解释，也接受 CSS 长度（如 `32px`、`1.5rem`）。在 `web-ui-button-group` 内被忽略。 | `string`                                                     | `''`       |
| `type`          | 原生 button 的 `type`：`button` / `submit` / `reset`。后两者把 activation 转发给宿主 form。                | `button \| submit \| reset`                                  | `'button'` |
| `aria-label`    | 无障碍名称。icon button 必须提供，否则读屏器只会读出空 button。                                            | `string \| null`                                             | `null`     |
| `aria-disabled` | 值为 `true` 时阻止 click 与表单动作，但保留焦点能力；作为 slot trigger 时同步到内部原生 button。           | `string \| null`                                             | `null`     |
| `aria-expanded` | 展开状态；作为 `web-ui-collapse` trigger 时同步到内部原生 button。                                         | `string \| null`                                             | `null`     |
| `aria-controls` | 被控制内容的 ID；作为 `web-ui-collapse` trigger 时同步到内部原生 button。                                  | `string \| null`                                             | `null`     |

### Slots

| 名称      | 说明                                           |
| --------- | ---------------------------------------------- |
| `default` | button 文字；`icon` 模式下整体作为 icon 内容。 |
| `prefix`  | 文字左侧的 icon 或标识。                       |
| `suffix`  | 文字右侧的 icon 或标识。                       |

### 行为说明

`submit` 和 `reset` 在 composed `click` 事件完成派发后，通过宿主的 form owner 转发到其原生 `<form>`；对这次 click 调用 `preventDefault()` 会取消该动作。内部 button 自身仍没有 form owner，因此 `SubmitEvent.submitter` 为 `null`。button 不向 `FormData` 贡献值。

`disabled`、`loading`、`formDisabled`（包括祖先 `fieldset` 导致的禁用）和 `aria-disabled="true"` 都会阻止 `click` 与表单动作。`aria-disabled` 不会设置原生 `disabled`，因此仍可聚焦。

`icon` 与 `loading` 同时开启时，button 只渲染 spinner，默认插槽 icon 不投影。默认 icon 几何保持正方形，`full` 或显式 width 除外。

### CSS Custom Properties

| 名称                     | 说明                   | 默认值        |
| ------------------------ | ---------------------- | ------------- |
| `--wui-button-width`     | button 宽度            | `max-content` |
| `--wui-button-px`        | 水平内边距             | `12px`        |
| `--wui-button-gap`       | 前缀/默认/后缀插槽间距 | `8px`         |
| `--wui-button-color`     | button 文字颜色        | 随 variant    |
| `--wui-button-bg`        | button 背景颜色        | 随 variant    |
| `--wui-button-bg-hover`  | 悬停背景颜色           | 随 variant    |
| `--wui-button-bg-active` | 按下背景颜色           | 随 variant    |
