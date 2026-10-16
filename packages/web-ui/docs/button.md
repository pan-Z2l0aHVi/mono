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
