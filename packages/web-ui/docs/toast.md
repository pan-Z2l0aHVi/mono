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

单个 Toast 元素可声明式使用，`heading` 与 `message` 是两级文案；`toastId`（合并键）、`visible`（是否可见）与 `no-close-button`（隐藏关闭按钮）是元素自身的属性，下表列的是 `toast()` 的选项。

```react
<web-ui-toast type="success" heading="已保存" message="更改已写入云端" duration={3000} visible></web-ui-toast>
```

```vue
<template>
  <web-ui-toast type="success" heading="已保存" message="更改已写入云端" :duration="3000" visible></web-ui-toast>
</template>
```

## API

### Options

| 名称        | 说明                                                        | 类型            | 默认值        |
| ----------- | ----------------------------------------------------------- | --------------- | ------------- |
| `message`   | 通知文本。                                                  | `string`        | `—`           |
| `type`      | 类型：`success`、`info`、`warning`、`error`。               | `ToastType`     | `'info'`      |
| `duration`  | 自动关闭时间（ms），0 表示不自动关闭；`error` 默认 `5000`。 | `number`        | `3000`        |
| `closable`  | 展示关闭按钮。                                              | `boolean`       | `true`        |
| `id`        | 合并键：同一个 `id` 再次调用是更新那一条。                  | `string`        | 自动生成      |
| `heading`   | 粗体标题。                                                  | `string`        | `''`          |
| `position`  | 屏幕位置。                                                  | `ToastPosition` | `'top-right'` |
| `target`    | 用于查找最近 theme-owned overlay root。                     | `Element`       | `—`           |
| `container` | 显式挂载容器（最高优先级）。                                | `HTMLElement`   | `—`           |

### Events

| 名称          | 说明                                           |
| ------------- | ---------------------------------------------- |
| `toast-close` | 退场结束后派发，`detail` 含 `id` 与 `reason`。 |

### Methods

| 名称                | 说明                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `startAutoClose()`  | 按当前 `duration` 重排自动关闭计时；`duration` 为 0 时只拆掉已有计时器，不再装新的。                                                            |
| `setDuration(ms)`   | 更新 `duration` 并按新值重排计时；悬停暂停期间只记新值，指针离开后按新时长计满，`ms` 为 0 表示不再自动关闭。                                    |
| `pauseAutoClose()`  | 记下剩余时间并停表，供不支持 `moveBefore` 的引擎在搬迁节点前调用。                                                                              |
| `resumeAutoClose()` | 与 `pauseAutoClose()` 成对，按记下的剩余时间续跑；已到期则立即退场，悬停尚未结束时只交还剩余时间。                                              |
| `show()`            | 播放入场（`visible` 置真）并在 `duration` 大于 0 时开始计时；由 toast manager 在挂载后调用。                                                    |
| `dismiss(reason?)`  | 关闭并派发 `toast-close`：已显示时先播退场动画，未显示（尚未入场或从未显示）时立即派发；`reason` 取 `ToastCloseReason`，默认 `'programmatic'`。 |
