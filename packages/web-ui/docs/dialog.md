---
component: dialog
tag: web-ui-dialog
---

模态对话框，基于原生 `<dialog>` 的 `showModal()`；支持内置标题带、footer 与完全自绘的 `headless` 模式。

## 示例

### 基础

`open` 控制可见性，`heading` 是无 header 插槽时的标题回落，`closable` 渲染内置关闭按钮。

```react
const [open, setOpen] = useState(false)

return (
  <>
    <web-ui-button onClick={() => setOpen(true)}>打开对话框</web-ui-button>
    <web-ui-dialog open={open} heading="确认操作" closable onopen-change={event => setOpen(event.detail.open)}>
      <p>删除后无法恢复，确定继续吗？</p>
      <web-ui-button slot="footer" variant="danger" onClick={() => setOpen(false)}>
        删除
      </web-ui-button>
    </web-ui-dialog>
  </>
)
```

```vue
<template>
  <web-ui-button @click="open = true">打开对话框</web-ui-button>
  <web-ui-dialog :open="open" heading="确认操作" closable @open-change="open = $event.detail.open">
    <p>删除后无法恢复，确定继续吗？</p>
    <web-ui-button slot="footer" variant="danger" @click="open = false">删除</web-ui-button>
  </web-ui-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### 受控关闭

开启 `controlled` 后，Escape 与遮罩点击只请求 `open=false`，在消费方回写前对话框保持打开。

```react
<web-ui-dialog
  open={open}
  controlled
  heading="未保存的更改"
  onopen-change={event => {
    if (event.detail.open === false) requestClose()
    else setOpen(true)
  }}
>
  <p>离开前要先保存吗？</p>
</web-ui-dialog>
```

```vue
<template>
  <web-ui-dialog :open="open" controlled heading="未保存的更改" @open-change="onOpenChange">
    <p>离开前要先保存吗？</p>
  </web-ui-dialog>
</template>

<script setup lang="ts">
function onOpenChange(event: CustomEvent<{ open: boolean }>) {
  if (!event.detail.open) requestClose()
}
</script>
```

### Headless

`headless` 只保留浮层行为，默认插槽渲染为卡片内唯一的滚动层；此时必须用 `dialog-label` 提供可访问名称。

```react
<web-ui-dialog open={open} headless dialog-label="图片详情">
  <div className="my-dialog-content">自定义内容与样式</div>
</web-ui-dialog>
```

```vue
<template>
  <web-ui-dialog :open="open" headless dialog-label="图片详情">
    <div class="my-dialog-content">自定义内容与样式</div>
  </web-ui-dialog>
</template>
```

## API

### Props

| 名称                | 说明                                                       | 类型      | 默认值  |
| ------------------- | ---------------------------------------------------------- | --------- | ------- |
| `open`              | 对话框可见性。                                             | `boolean` | `false` |
| `closable`          | 显示内置关闭按钮。                                         | `boolean` | `false` |
| `no-scroll-lock`    | 打开时不锁定页面滚动。                                     | `boolean` | `false` |
| `no-backdrop-close` | 禁止点击遮罩关闭。                                         | `boolean` | `false` |
| `no-escape-close`   | 禁止按 Escape 关闭。                                       | `boolean` | `false` |
| `controlled`        | Escape 与遮罩仅请求 `open=false`，由消费方回写。           | `boolean` | `false` |
| `heading`           | 标题文字，`header` 插槽为空时的回落（`headless` 下忽略）。 | `string`  | `''`    |
| `headless`          | 只保留浮层行为，不再渲染内置 header 带、内容区与 footer。  | `boolean` | `false` |
| `dialog-label`      | 内部原生 dialog 的 accessible name；`headless` 下必填。    | `string`  | `''`    |

### Events

| 名称          | 说明                                           |
| ------------- | ---------------------------------------------- |
| `open-change` | 开关状态变化，`detail.open` 为请求的目标状态。 |

### Slots

| 名称      | 说明                                           |
| --------- | ---------------------------------------------- |
| `default` | 正文内容。                                     |
| `header`  | 卡片顶部的 chrome 带，有内容时接管 `heading`。 |
| `footer`  | 底部操作区。                                   |

### Methods

| 名称          | 说明                                       |
| ------------- | ------------------------------------------ |
| `showModal()` | 打开对话框，等价于把 `open` 置为 `true`。  |
| `close()`     | 关闭对话框，等价于把 `open` 置为 `false`。 |
