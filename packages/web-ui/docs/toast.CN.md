# Toast

命令式 toast。调用 `toast()` 创建一条 toast 并拿到它的 id，再用 `toast.close(id)` 关闭。同一个 `id` 再次调用会更新那一条，不会新建。下面的表分别列出 `toast()` 的 option、命令式入口，以及 `<web-ui-toast>` 元素自身的属性、事件和方法。

## Samples

### Shortcuts

`toast.success` / `info` / `warning` / `error` 是 `toast()` 加 `type` 的快捷写法。每次调用都返回这条 toast 的最终 id。`error` 的默认时长是 `5000`，比其余类型的 `3000` 长。

四个快捷方法默认都出现在 `top-right`。

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

### Full options

`toast()` 接受完整 option：`heading` 是粗体标题，`message` 是正文，`position` 决定出现在屏幕的哪个位置（这里是 `top-center`），`duration` 是自动关闭的毫秒数，`closable` 控制是否渲染关闭 button。

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
              position: 'top-center',
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
    position: 'top-center',
    duration: 4000,
    closable: true
  })
}

onBeforeUnmount(() => toast.clear())
</script>
```

### Merging into one toast

同一个 `id` 的后续调用更新那一条，不会新增。不传 `duration` 时倒计时保持不动，只有显式传入才重新开始计时。`duration: 0` 让这一条不自动关闭。

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

### Closing

每次调用都返回最终 id。`toast.close(id)` 关闭指定的那一条，`toast.clear()` 关闭当前全部。两者对 `duration: 0`、不会自动关闭的 toast 同样有效。

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
| `target`    | 用于查找最近主题的 overlay 容器。                           | `Element`       | —             |
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

命令式入口没有其他必经步骤。`toast()` 自行把 toast 挂载到最近的主题的 overlay 容器（没有主题作用域时回退到全局默认容器）。`target` 用来解析最近的主题作用域。`container` 显式指定挂载容器，优先级高于主题作用域。

同一个 tick 内、尚未挂载的 toast 仍能被同 `id` 的调用改写，最终只产生一条。

悬停会暂停自动关闭计时器。指针离开后续跑剩余时间，不会重新计满。

暂停期间如果漏掉 `pointerleave`（指针拖出窗口，或元素在悬停中被移动、移出），计时也会恢复，不会永久停在屏幕上。

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

// 一条 toast 的完整生命周期
toast.info('上传中 0%', { id: 'upload', duration: 0 })
toast.info('上传中 60%', { id: 'upload' }) // 省略 duration，计时不动
toast.success('上传完成', { id: 'upload', duration: 3000 }) // 换 type，重新开始倒计时
```

每次调用都返回这条 toast 的最终 id，调用方不用区分是新建还是更新。

### upsert 语义

同一 `id` 再次调用的结果，下面每条依次给出目标状态与结果：

- 已挂载 / 返回同一个 id；给出的字段覆盖，未给出的保持原值
- 同 tick 内仍未挂载 / 合并进那条待挂载的 toast，挂载后生效，不产生第二条
- 已关闭或正在退场 / 新建一条；正在退场的那条自行播完退场动画

`duration` 只有显式传入才重启倒计时（悬停暂停期间例外：新值要等指针离开后才开始生效）；`message`、`heading`、`type` 不影响计时。

`toast.error` 的 5000 默认值在创建时作为回退应用，不算显式传入，因此重复调用 `toast.error(msg, { id })` 不会重置倒计时。

`position` 变化会把 toast 移到新位置，并保留剩余计时。如果倒计时已经到期，它会直接退场，不会一直留着。

`container` 与 `target` 以首次调用为准，不支持把已存在的 toast 换到另一个 overlay 容器。

### 关闭语义

`toast.close(id)` 覆盖 toast 出现的每个阶段，包括还没开始显示的两种情况，下面每条依次给出目标状态与结果：

- 已显示 / 播放退场动画，结束后派发 `toast-close`
- 已挂载但尚未显示 / 立即派发 `toast-close`
- 同 tick 内仍未挂载 / 不会出现，也不派发事件
- 已在退场 / 空操作，由那条 toast 自己播完退场

`toast.clear()` 的规则相同：队列里的条目一并取消，已挂载的全部关闭。

### Props

| 名称              | 说明                                                          | 类型            | 默认值        |
| ----------------- | ------------------------------------------------------------- | --------------- | ------------- |
| `type`            | 类型：`success`、`info`、`warning`、`error`。                 | `ToastType`     | `'info'`      |
| `position`        | 屏幕位置。                                                    | `ToastPosition` | `'top-right'` |
| `heading`         | 粗体标题。                                                    | `string`        | `''`          |
| `message`         | 通知文本。                                                    | `string`        | `''`          |
| `duration`        | 自动关闭时间（ms），0 表示不自动关闭；`error` 回退为 `5000`。 | `number`        | `3000`        |
| `no-close-button` | 隐藏关闭 button。                                             | `boolean`       | `false`       |
| `visible`         | 是否可见。                                                    | `boolean`       | `false`       |
| `toastId`         | 合并键；只能通过 property 设置，由 `toast()` 写入。           | `string`        | `''`          |

### Events

| 名称          | 说明                                           |
| ------------- | ---------------------------------------------- |
| `toast-close` | 退场结束后派发，`detail` 含 `id` 与 `reason`。 |

### 元素属性与方法

命令式入口下，`toast()` 会写入 `<web-ui-toast>` 的这些属性：合并键写在 `toastId` 上（只能通过 property 设置），其余与上面的 Props 表一一对应。

元素自身还公开一组实例方法：`show()` 播放入场（把 `visible` 设为 `true`），并在 `duration` 大于 0 时开始计时。

`dismiss(reason?)` 关闭并派发 `toast-close`，已显示时先播退场动画，未显示时立即派发，`reason` 取 `ToastCloseReason`，默认 `'programmatic'`。

`setDuration(ms)` 更新 `duration` 并按新值重排计时，`ms` 为 0 表示不再自动关闭。

`pauseAutoClose()` 记下剩余时间并暂停计时，与 `resumeAutoClose()` 成对使用。

`startAutoClose()` 按当前 `duration` 重排自动关闭计时。

### CSS Custom Properties

| 名称                            | 说明                                                                  | 默认值 |
| ------------------------------- | --------------------------------------------------------------------- | ------ |
| `--wui-toast-viewport-gap`      | Toast 到视口边缘的可见距离                                            | `16px` |
| `--wui-toast-container-padding` | 容器预留的扩散阴影绘制空间                                            | `40px` |
| `--wui-toast-top-offset`        | 顶部 Toast 容器的额外下移量，用于避让固定 header；只影响 `top-*` 位置 | `0px`  |
