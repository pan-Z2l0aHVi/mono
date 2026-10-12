---
component: drawer
tag: web-ui-drawer
---

侧边抽屉，基于原生 `<dialog>`，自带滑入 / 滑出动画，并可从四周内缘拖拽关闭。

## 示例

### 基础

`placement` 决定滑入方向，`heading` 是无 header 插槽时的标题回落。

```react
const [open, setOpen] = useState(false)

return (
  <>
    <web-ui-button onClick={() => setOpen(true)}>打开抽屉</web-ui-button>
    <web-ui-drawer open={open} placement="right" heading="设置" onopen-change={event => setOpen(event.detail.open)}>
      <p>抽屉正文</p>
    </web-ui-drawer>
  </>
)
```

```vue
<template>
  <web-ui-button @click="open = true">打开抽屉</web-ui-button>
  <web-ui-drawer :open="open" placement="right" heading="设置" @open-change="open = $event.detail.open">
    <p>抽屉正文</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### 拖拽关闭

开启 `draggable` 后，抽屉内缘出现 drag bar，向关闭方向拖过半或快速甩动即关闭。

```react
<web-ui-drawer open={open} placement="bottom" draggable heading="快捷操作">
  <p>向下拖拽关闭</p>
</web-ui-drawer>
```

```vue
<template>
  <web-ui-drawer :open="open" placement="bottom" draggable heading="快捷操作">
    <p>向下拖拽关闭</p>
  </web-ui-drawer>
</template>
```

### 页脚操作

`header` / `footer` 插槽与正文分离，正文滚动时两者保持可见。

```react
<web-ui-drawer open={open} heading="编辑资料">
  <web-ui-button slot="footer" variant="primary">
    保存
  </web-ui-button>
  <p>正文内容</p>
</web-ui-drawer>
```

```vue
<template>
  <web-ui-drawer :open="open" heading="编辑资料">
    <web-ui-button slot="footer" variant="primary">保存</web-ui-button>
    <p>正文内容</p>
  </web-ui-drawer>
</template>
```

## API

### Props

| 名称                | 说明                                                  |
| ------------------- | ----------------------------------------------------- |
| `open`              | 抽屉可见性。                                          |
| `no-scroll-lock`    | 打开时不锁定页面滚动。                                |
| `no-backdrop-close` | 禁止点击遮罩关闭。                                    |
| `controlled`        | 用户关闭仅请求 `open=false`，由消费方回写。           |
| `placement`         | 滑入方向：`right`（默认）、`left`、`top`、`bottom`。  |
| `heading`           | 标题文字，`header` 插槽为空时的回落。                 |
| `closable`          | 显示内置关闭按钮。                                    |
| `headless`          | 仅保留浮层行为，默认插槽不渲染内置抽屉 UI。           |
| `dialog-label`      | 内部原生 dialog 的可访问名称；`headless` 下必须提供。 |
| `draggable`         | 在抽屉内缘显示 drag bar，支持拖拽关闭手势。           |

### Events

| 名称          | 说明                                           |
| ------------- | ---------------------------------------------- |
| `open-change` | 开关状态变化，`detail.open` 为请求的目标状态。 |

### Slots

| 名称      | 说明         |
| --------- | ------------ |
| `default` | 正文内容。   |
| `header`  | 顶部标题区。 |
| `footer`  | 底部操作区。 |
