---
component: button
tag: web-ui-button
---

按钮用于触发一个即时操作：提交表单、打开对话框、切换状态。它不贡献表单值，
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

默认插槽是按钮文字；`prefix` / `suffix` 放在文字两侧，图标模式（`icon`）下默认插槽整体作为图标。

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

### 图标模式

`icon` 让按钮变成正方形图标按钮，此时 `loading` 优先于插槽内容，只渲染 spinner。

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

### 按钮组

`<web-ui-button-group>` 把多个按钮并成一组并画出相邻分割线；成员按钮的 `size` 在组内被忽略。

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

| 名称         | 说明                                                                                        | 类型                                                         | 默认值     |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| `variant`    | 视觉变体：`primary` / `secondary` / `ghost` / `danger` / `glass`。                          | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'`  |
| `disabled`   | 禁用态。禁用时不派发 click，也不参与表单提交。                                              | `boolean`                                                    | `false`    |
| `loading`    | 加载态。与 `disabled` 一样阻断交互，并优先渲染 spinner。                                    | `boolean`                                                    | `false`    |
| `full`       | 占满父容器宽度。                                                                            | `boolean`                                                    | `false`    |
| `icon`       | 图标模式：按钮为正方形，默认插槽整体作为图标。                                              | `boolean`                                                    | `false`    |
| `size`       | 按钮高度（CSS 长度，如 `28`、`32px`）。在 `web-ui-button-group` 内被忽略。                  | `string`                                                     | `''`       |
| `type`       | 原生 button 的 `type`：`button` / `submit` / `reset`。后两者把 activation 转发给宿主 form。 | `button \| submit \| reset`                                  | `'button'` |
| `aria-label` | 无障碍名称。图标按钮必须提供，否则读屏器只会读出空按钮。                                    | `string \| null`                                             | `null`     |

### Slots

| 名称      | 说明                                      |
| --------- | ----------------------------------------- |
| `default` | 按钮文字；`icon` 模式下整体作为图标内容。 |
| `prefix`  | 文字左侧的图标或标识。                    |
| `suffix`  | 文字右侧的图标或标识。                    |

### 行为说明

`submit` 和 `reset` 在 composed `click` 事件完成派发后，通过宿主的 form owner 转发到其原生 `<form>`；对这次 click 调用 `preventDefault()` 会取消该动作。内部按钮自身仍没有 form owner，因此 `SubmitEvent.submitter` 为 `null`。按钮不向 `FormData` 贡献值。

禁用、加载和 `formDisabled` 状态（包括祖先 `fieldset` 导致的禁用）都会阻止 `click` 事件。

`icon` 与 `loading` 同时开启时，按钮只渲染 spinner，默认插槽图标不投影。默认 icon 几何保持正方形，`full` 或显式 width 除外。

### CSS Custom Properties

| 名称                     | 说明                   | 默认值        |
| ------------------------ | ---------------------- | ------------- |
| `--wui-button-width`     | 按钮宽度               | `max-content` |
| `--wui-button-px`        | 水平内边距             | `12px`        |
| `--wui-button-gap`       | 前缀/默认/后缀插槽间距 | `8px`         |
| `--wui-button-color`     | 按钮文字颜色           | 随 variant    |
| `--wui-button-bg`        | 按钮背景颜色           | 随 variant    |
| `--wui-button-bg-hover`  | 悬停背景颜色           | 随 variant    |
| `--wui-button-bg-active` | 按下背景颜色           | 随 variant    |
