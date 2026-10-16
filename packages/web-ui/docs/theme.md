---
component: theme
tag: web-ui-theme
---

主题提供者：在自己的子树内定义基础、颜色、层级、阴影与动效 token，并作为该子树的 theme-owned overlay root。

## 示例

### 基础

`appearance` 选择配色方案，未设置时主题保持 inactive 但解析输出使用默认的 `light`。

```react
<web-ui-theme appearance="dark">
  <web-ui-button variant="primary">暗色主题下的按钮</web-ui-button>
</web-ui-theme>
```

```vue
<template>
  <web-ui-theme appearance="dark">
    <web-ui-button variant="primary">暗色主题下的按钮</web-ui-button>
  </web-ui-theme>
</template>
```

### 跟随系统与动效范围

`appearance="system"` 跟随 `prefers-color-scheme`；`motion` 定义当前范围的动效偏好，`reduced` 归零转场、两个无限加载循环只放慢。

```react
<web-ui-theme appearance="system" motion="reduced">
  {children}
</web-ui-theme>
```

```vue
<template>
  <web-ui-theme appearance="system" motion="reduced">
    <slot />
  </web-ui-theme>
</template>
```

### 绑定解析后的外观

`resolved-appearance` 是只读的派生输出，可以放心把选择器绑到它上面，无需再维护第二份主题状态。

```react
<div style={{ colorScheme: 'light dark' }}>
  <web-ui-theme appearance={appearance}>
    <div className="hero">当前外观由 resolved-appearance 选择器控制</div>
  </web-ui-theme>
</div>
```

```vue
<template>
  <web-ui-theme :appearance="appearance">
    <div class="hero">当前外观由 resolved-appearance 选择器控制</div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const appearance = ref<'light' | 'dark' | 'system'>('system')
</script>
```

## API

### Props

| 名称                  | 说明                                                        | 类型                           | 默认值     |
| --------------------- | ----------------------------------------------------------- | ------------------------------ | ---------- |
| `appearance`          | 配色方案：`light`、`dark` 或 `system`。                     | `ThemeAppearance \| undefined` | —          |
| `resolved-appearance` | 解析后的配色方案，只读反射输出。                            | `ResolvedThemeAppearance`      | `'light'`  |
| `motion`              | 当前嵌套主题范围的动效偏好：`full`、`reduced` 或 `system`。 | `ThemeMotion`                  | `'system'` |

### Slots

| 名称      | 说明                 |
| --------- | -------------------- |
| `default` | 主题作用域内的内容。 |

### Methods

| 名称               | 说明                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| `getOverlayRoot()` | 返回该主题拥有的 theme-owned overlay root；未设置 `appearance` 时返回 `undefined`。 |
