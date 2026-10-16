---
component: toast
tag: web-ui-toast
---

Toast 通知。常规用法是命令式 API `toast()`：同一 `id` 的再次调用是更新那一条，而不是新建。

## 示例

### 快捷方法

`toast.success` / `info` / `warning` / `error` 是四种类型的常用写法，`error` 的默认时长比其余更长。

```react
import { toast } from '@greypan/web-ui'

toast.success('操作成功')
toast.info('提示信息')
toast.warning('请注意')
toast.error('出错了', { duration: 5000 })
```

```vue
<script setup lang="ts">
import { toast } from '@greypan/web-ui'

toast.success('操作成功')
toast.error('出错了', { duration: 5000 })
</script>
```

### 合并同一条

给同一个 `id` 再次调用即更新它，适合进度或重试这类连续状态；`duration` 只有显式传入才重启倒计时。

```react
import { toast } from '@greypan/web-ui'

toast.info('上传中 0%', { id: 'upload', duration: 0 })
toast.info('上传中 60%', { id: 'upload' })
toast.success('上传完成', { id: 'upload', duration: 3000 })
```

```vue
<script setup lang="ts">
import { toast } from '@greypan/web-ui'

function upload() {
  toast.info('上传中 0%', { id: 'upload', duration: 0 })
  toast.info('上传中 60%', { id: 'upload' })
  toast.success('上传完成', { id: 'upload', duration: 3000 })
}
</script>
```

### 直接使用元素

单个 Toast 元素可声明式使用，`heading` 与 `message` 是两级文案，`no-close-button` 隐藏关闭按钮。

```react
<web-ui-toast type="success" heading="已保存" message="更改已写入云端" duration={3000} visible></web-ui-toast>
```

```vue
<template>
  <web-ui-toast type="success" heading="已保存" message="更改已写入云端" :duration="3000" visible></web-ui-toast>
</template>
```

## API

### Props

| 名称              | 说明                                          | 类型            | 默认值        |
| ----------------- | --------------------------------------------- | --------------- | ------------- |
| `toastId`         | 这条 toast 的合并键（property）。             | `string`        | `''`          |
| `type`            | 类型：`success`、`info`、`warning`、`error`。 | `ToastType`     | `'info'`      |
| `position`        | 屏幕位置，默认 `top-right`。                  | `ToastPosition` | `'top-right'` |
| `heading`         | 粗体标题。                                    | `string`        | `''`          |
| `message`         | 通知文本。                                    | `string`        | `''`          |
| `duration`        | 自动关闭时间（ms），0 表示不自动关闭。        | `number`        | `3000`        |
| `no-close-button` | 隐藏关闭按钮。                                | `boolean`       | `false`       |
| `visible`         | 当前是否可见。                                | `boolean`       | `false`       |

### Events

| 名称          | 说明                                           |
| ------------- | ---------------------------------------------- |
| `toast-close` | 退场结束后派发，`detail` 含 `id` 与 `reason`。 |
