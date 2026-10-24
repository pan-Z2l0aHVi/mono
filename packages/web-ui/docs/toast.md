---
component: toast
tag: web-ui-toast
---

命令式 toast：通过 `toast()` 创建一条并拿到它的 id，用 `toast.close(id)` 关闭；同一个 `id` 再次调用是更新那一条，而不是新建。下面的表分别列 `toast()` 的 option、命令式入口，以及 `<web-ui-toast>` 元素自身的属性、事件与方法。

## 示例

### 快捷方法 {#shortcuts}

`toast.success` / `info` / `warning` / `error` 是 `toast()` 加 `type` 的快捷写法，每次调用返回这条 toast 的最终 id；`error` 的默认时长是 `5000`，比其余类型的 `3000` 长。

四条都落在默认的 `top-right`。

示例卸载时 `toast.clear()`，避免留下的 toast 影响页面上其他示例。

```tsx
import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  useEffect(() => () => toast.clear(), [])

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={() => setLast(toast.success('操作成功'))}>success</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.info('提示信息'))}>info</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.warning('请注意'))}>warning</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.error('出错了'))}>error</web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">最近创建的 id：{last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="showSuccess">success</web-ui-button>
      <web-ui-button @click="showInfo">info</web-ui-button>
      <web-ui-button @click="showWarning">warning</web-ui-button>
      <web-ui-button @click="showError">error</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">最近创建的 id：{{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const last = ref('—')

function showSuccess() {
  last.value = toast.success('操作成功')
}

function showInfo() {
  last.value = toast.info('提示信息')
}

function showWarning() {
  last.value = toast.warning('请注意')
}

function showError() {
  last.value = toast.error('出错了')
}

onBeforeUnmount(() => toast.clear())
</script>
```

### 完整 option {#options}

`toast()` 接受完整 option：`heading` 是粗体标题，`message` 是正文，`position` 决定落进哪个角的容器（这里是 `bottom-right`），`duration` 是自动关闭的毫秒数，`closable` 控制是否渲染关闭 button。返回的 id 写进读数。

```tsx
import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

export default function Demo() {
  const [id, setId] = useState('—')

  useEffect(() => () => toast.clear(), [])

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button
        onClick={() => {
          setId(
            toast({
              heading: '已保存',
              message: '更改已写入云端',
              type: 'info',
              position: 'bottom-right',
              duration: 4000,
              closable: true
            })
          )
        }}
      >
        创建完整 option 的 toast
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        id：{id} · 位置：bottom-right · 4 秒后自动关闭
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="notify">创建完整 option 的 toast</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      id：{{ id }} · 位置：bottom-right · 4 秒后自动关闭
    </output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const id = ref('—')

function notify() {
  id.value = toast({
    heading: '已保存',
    message: '更改已写入云端',
    type: 'info',
    position: 'bottom-right',
    duration: 4000,
    closable: true
  })
}

onBeforeUnmount(() => toast.clear())
</script>
```

### 合并同一条 {#upsert}

同一个 `id` 的后续调用更新那一条，不会新增。第一步显式传 `duration: 0`，不自动关闭；后两步不传 `duration`，倒计时保持不动；最后一步显式传 `3000` 才重新开始计时。

```tsx
import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

const UPLOAD_ID = 'demo-upload'

export default function Demo() {
  const [step, setStep] = useState('尚未开始')

  useEffect(() => () => toast.clear(), [])

  function start() {
    setStep('0%')
    toast.info('上传中 0%', { id: UPLOAD_ID, duration: 0 })
  }

  function progress() {
    setStep('60%')
    toast.info('上传中 60%', { id: UPLOAD_ID })
  }

  function finish() {
    setStep('完成')
    toast.success('上传完成', { id: UPLOAD_ID, duration: 3000 })
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={start}>开始上传</web-ui-button>
        <web-ui-button onClick={progress}>进度 60%</web-ui-button>
        <web-ui-button onClick={finish}>完成</web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        id：{UPLOAD_ID} · 当前：{step}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="start">开始上传</web-ui-button>
      <web-ui-button @click="progress">进度 60%</web-ui-button>
      <web-ui-button @click="finish">完成</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">id：{{ UPLOAD_ID }} · 当前：{{ step }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const UPLOAD_ID = 'demo-upload'
const step = ref('尚未开始')

function start() {
  step.value = '0%'
  toast.info('上传中 0%', { id: UPLOAD_ID, duration: 0 })
}

function progress() {
  step.value = '60%'
  toast.info('上传中 60%', { id: UPLOAD_ID })
}

function finish() {
  step.value = '完成'
  toast.success('上传完成', { id: UPLOAD_ID, duration: 3000 })
}

onBeforeUnmount(() => toast.clear())
</script>
```

### 关闭 {#close}

每次调用都返回最终 id；`toast.close(id)` 关掉指定的一条，`toast.clear()` 收走当前全部。这里先建一条 `duration: 0`、不会自动关闭的 toast，再分别用两种方式关闭，`<output>` 记录最后一次操作。

```tsx
import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

const DEMO_ID = 'demo-close'

export default function Demo() {
  const [last, setLast] = useState('—')

  useEffect(() => () => toast.clear(), [])

  function create() {
    setLast(`创建 ${toast.info('这条 toast 不会自动关闭', { id: DEMO_ID, duration: 0 })}`)
  }

  function closeOne() {
    toast.close(DEMO_ID)
    setLast(`toast.close(${DEMO_ID})`)
  }

  function clearAll() {
    toast.clear()
    setLast('toast.clear()')
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={create}>创建一条</web-ui-button>
        <web-ui-button variant="secondary" onClick={closeOne}>
          关闭这一条
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={clearAll}>
          清空全部
        </web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">最近操作：{last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="create">创建一条</web-ui-button>
      <web-ui-button variant="secondary" @click="closeOne">关闭这一条</web-ui-button>
      <web-ui-button variant="secondary" @click="clearAll">清空全部</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">最近操作：{{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const DEMO_ID = 'demo-close'
const last = ref('—')

function create() {
  last.value = `创建 ${toast.info('这条 toast 不会自动关闭', { id: DEMO_ID, duration: 0 })}`
}

function closeOne() {
  toast.close(DEMO_ID)
  last.value = `toast.close(${DEMO_ID})`
}

function clearAll() {
  toast.clear()
  last.value = 'toast.clear()'
}

onBeforeUnmount(() => toast.clear())
</script>
```

## API

### Options

| 名称        | 说明                                                        | 类型            | 默认值        |
| ----------- | ----------------------------------------------------------- | --------------- | ------------- |
| `message`   | 通知文本。                                                  | `string`        | —             |
| `type`      | 类型：`success`、`info`、`warning`、`error`。               | `ToastType`     | `'info'`      |
| `duration`  | 自动关闭时间（ms），0 表示不自动关闭；`error` 默认 `5000`。 | `number`        | `3000`        |
| `closable`  | 展示关闭 button。                                           | `boolean`       | `true`        |
| `id`        | 合并键：同一个 `id` 再次调用是更新那一条。                  | `string`        | 自动生成      |
| `heading`   | 粗体标题。                                                  | `string`        | `''`          |
| `position`  | 屏幕位置。                                                  | `ToastPosition` | `'top-right'` |
| `target`    | 用于查找最近 theme-owned overlay root。                     | `Element`       | —             |
| `container` | 显式挂载容器（最高优先级）。                                | `HTMLElement`   | —             |

### Methods

| 名称                               | 说明                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `toast(options)`                   | 创建或更新一条 toast，返回这条 toast 的最终 id。                       |
| `toast.success(message, options?)` | 创建一条 `success` 类型的 toast。                                      |
| `toast.info(message, options?)`    | 创建一条 `info` 类型的 toast。                                         |
| `toast.warning(message, options?)` | 创建一条 `warning` 类型的 toast。                                      |
| `toast.error(message, options?)`   | 创建一条 `error` 类型的 toast；它的默认时长是 `5000`，比其余类型更长。 |
| `toast.close(id)`                  | 关闭指定 id 的那条 toast，覆盖它出现的每个阶段。                       |
| `toast.clear()`                    | 一次关闭当前全部 toast。                                               |

### 行为说明

命令式入口之下没有别的必经步骤：`toast()` 自行把 toast 元素挂到最近的 theme-owned overlay root（没有主题作用域时回退到全局 fallback root），`target` 用来解析最近的主题作用域，`container` 显式指定挂载容器并优先于主题作用域。

同一个微任务里的多条 toast 先入队、再一次性挂载，因此待挂载的条目在落地前还能被同 id 的调用改写。

悬停暂停自动关闭计时器（使用 `pointerenter`/`pointerleave`），指针离开后**续跑剩余时间**，而不是重新计满。

暂停期间漏掉 `pointerleave`（指针拖出窗口、元素在悬停中被搬迁或摘出）时，由 document 级 `pointerover`/`pointerout`/`pointerleave` 兜底恢复，不会永久停在屏幕上。

```ts
import { toast } from '@greypan/web-ui'

// 创建
toast.success('操作成功')
toast.error('出错了', { duration: 5000 })
toast.info('提示信息')
toast.warning('请注意')

// 带 option
const id = toast({ message: '自定义', type: 'info', position: 'bottom-right', duration: 4000, closable: true })

// 关闭
toast.close(id)
toast.clear()

// upsert：同一 id 再次调用是更新那一条，而不是再建一条
toast.error('网络连接中断，正在重试…', { id: 'network' })
toast.error('网络连接中断（第 2 次重试）', { id: 'network' })

// 一条 toast 走完整个生命周期
toast.info('上传中 0%', { id: 'upload', duration: 0 })
toast.info('上传中 60%', { id: 'upload' }) // 省略 duration，计时不动
toast.success('上传完成', { id: 'upload', duration: 3000 }) // 换 type，重新开始倒计时
```

每次调用都返回这条 toast 的最终 id，调用方无需区分新建还是更新。

### upsert 语义

同一 `id` 再次调用的结果：

列依次为 目标状态 / 结果：

- 已挂载 / 返回同一个 id；给出的字段覆盖，未给出的保持原值
- 同 tick 内仍在待挂载 / patch 待挂载的 options，挂载后生效，不产生第二条
- 已关闭或正在退场 / 新建一条；正在离场的那条自行走完退场动画

`duration` 只有显式传入才重启倒计时（悬停暂停期间是例外：只记新值不点火，指针离开后按新时长计满）；`message`、`heading`、`type` 是普通属性，不碰计时。

`toast.error` 的 5000 默认值在**创建时**兜底，不算显式传入，因此重复调用 `toast.error(msg, { id })` 不会重置倒计时。

`position` 变化会把元素搬到新容器并保住剩余计时（支持 `moveBefore` 的引擎直接搬，其余走暂停/续跑降级）；若倒计时在主线程被占用期间已经到期，降级路径会在续跑时直接退场，而不是让它一直挂着。

`container` 与 `target` 以首次调用为准，不支持把已存在的 toast 换到另一个 overlay root。

### 关闭语义

`toast.close(id)` 覆盖 toast 出现的每个阶段，包括「还没开始显示」的两种：

列依次为 目标状态 / 结果：

- 已显示 / 播放退场动画，结束后派发 `toast-close`
- 已挂载、`show()` 未跑 / 没有退场动画可播，立即派发 `toast-close`
- 同 tick 仍在待挂载 / 挂载前出队：不会出现，也不派发事件
- 已在退场 / 空操作，由那条 toast 自己走完退场

`toast.clear()` 的口径相同：队列条目一并取消，已挂载的全部关闭。

### Props

| 名称              | 说明                                                                     | 类型            | 默认值        |
| ----------------- | ------------------------------------------------------------------------ | --------------- | ------------- |
| `type`            | 类型：`success`、`info`、`warning`、`error`。                            | `ToastType`     | `'info'`      |
| `position`        | 屏幕位置。                                                               | `ToastPosition` | `'top-right'` |
| `heading`         | 粗体标题。                                                               | `string`        | `''`          |
| `message`         | 通知文本。                                                               | `string`        | `''`          |
| `duration`        | 自动关闭时间（ms），0 表示不自动关闭；`error` 由 manager 兜底为 `5000`。 | `number`        | `3000`        |
| `no-close-button` | 隐藏关闭 button。                                                        | `boolean`       | `false`       |
| `visible`         | 是否可见。                                                               | `boolean`       | `false`       |
| `toastId`         | 合并键；只作为属性存在（`attribute: false`），由 manager 写入。          | `string`        | `''`          |

### Events

| 名称          | 说明                                           |
| ------------- | ---------------------------------------------- |
| `toast-close` | 退场结束后派发，`detail` 含 `id` 与 `reason`。 |

### 元素属性与方法

命令式入口下，`<web-ui-toast>` 的属性由 manager 写入：合并键落在 `toastId` 上（只作为属性存在，`attribute: false`），其余属性与上面的 Props 表一一对应。

元素自身还公开一组实例方法：`show()` 播放入场（`visible` 置真）并在 `duration` 大于 0 时开始计时。

`dismiss(reason?)` 关闭并派发 `toast-close`，已显示时先播退场动画，未显示时立即派发，`reason` 取 `ToastCloseReason`，默认 `'programmatic'`。

`setDuration(ms)` 更新 `duration` 并按新值重排计时，`ms` 为 0 表示不再自动关闭。

`pauseAutoClose()` 记下剩余时间并停表，与 `resumeAutoClose()` 成对续跑。

`startAutoClose()` 按当前 `duration` 重排自动关闭计时。

### CSS Custom Properties

| 名称                            | 说明                       | 默认值 |
| ------------------------------- | -------------------------- | ------ |
| `--wui-toast-viewport-gap`      | Toast 到视口边缘的可见距离 | `16px` |
| `--wui-toast-container-padding` | 容器预留的扩散阴影绘制空间 | `40px` |
