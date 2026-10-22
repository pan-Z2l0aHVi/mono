---
component: spinner
tag: web-ui-spinner
---

加载旋转器，声明式放在页面里，或用静态 `WebUiSpinner.show()` / `hide()` 做阻塞式加载。

## 示例

### 基础

`size` 是像素尺寸，宿主带 `role="status"` 与 `aria-label="加载中"`。

```react
<web-ui-spinner size={16}></web-ui-spinner>
<web-ui-spinner size={24}></web-ui-spinner>
<web-ui-spinner size={32}></web-ui-spinner>
```

```vue
<template>
  <web-ui-spinner :size="16"></web-ui-spinner>
  <web-ui-spinner :size="24"></web-ui-spinner>
  <web-ui-spinner :size="32"></web-ui-spinner>
</template>
```

### 描述文字

`description` 属性或 `description` 插槽在旋转器旁显示说明。

```react
<web-ui-spinner size={32} description="正在加载数据"></web-ui-spinner>
```

```vue
<template>
  <web-ui-spinner :size="32">
    <span slot="description">正在加载数据</span>
  </web-ui-spinner>
</template>
```

### 阻塞式加载

`WebUiSpinner.show()` 显示全屏加载，期间会拦截指针交互并锁定页面滚动；`duration` 到期自动关闭，`hide()` 立即隐藏。

```react
import { WebUiSpinner } from '@greypan/web-ui'

WebUiSpinner.show({ size: 64, description: '正在同步云端文件' })
WebUiSpinner.show({ duration: 2000 })
WebUiSpinner.hide()
```

```vue
<script setup lang="ts">
import { WebUiSpinner } from '@greypan/web-ui'

function sync() {
  WebUiSpinner.show({ size: 64, description: '正在同步云端文件', duration: 2000 })
}
</script>
```

## API

### Props

| 名称          | 说明         | 类型     | 默认值 |
| ------------- | ------------ | -------- | ------ |
| `size`        | 尺寸（px）。 | `number` | `24`   |
| `description` | 描述文字。   | `string` | `''`   |

### Slots

| 名称          | 说明                                |
| ------------- | ----------------------------------- |
| `description` | 描述插槽，替代 `description` 属性。 |

### Methods

| 名称                          | 说明                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `WebUiSpinner.show(options?)` | 挂载一个全屏实例并返回它；期间拦截指针交互并锁定页面滚动。`size` / `description` 覆盖默认外观，`duration` 大于 0 时到期调用 `hide()`。 |
| `WebUiSpinner.hide()`         | 拆掉计时器并移除 `show()` 挂载的实例。                                                                                                 |

### 行为说明

角色：`status`，`aria-label="加载中"`。

### 静态 API

```ts
import { WebUiSpinner } from '@greypan/web-ui'

WebUiSpinner.show() // 显示
WebUiSpinner.show({ size: 32, duration: 2000 }) // 带 option 显示
WebUiSpinner.hide() // 隐藏
```

`WebUiSpinner.show(options?: { size?: number; duration?: number; description?: string })`

### CSS Custom Properties

| 名称                     | 说明                                         | 默认值  |
| ------------------------ | -------------------------------------------- | ------- |
| `--wui-spinner-size`     | 尺寸，由 `size` 属性写入                     | `24px`  |
| `--wui-duration-spinner` | 叶片追光周期；reduce 下放慢到 `1600ms`，不停 | `800ms` |
