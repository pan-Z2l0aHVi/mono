# Checkbox

[English](./checkbox.md) | 简体中文

单个复选框，支持 Enter / Space 切换；与原生 `<form>` 集成，选中时把 `value` 提交进 `FormData`。

## 示例

### 基础用法

`checked` 是控件状态，默认插槽是标签文字；指示器、间距与右侧文案都是触发区，点哪儿都算一次切换。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [channels, setChannels] = useState(['email'])

  function toggle(channel: string) {
    setChannels(current =>
      current.includes(channel) ? current.filter(item => item !== channel) : [...current, channel]
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-checkbox checked={channels.includes('email')} onChange={() => toggle('email')}>
        邮件通知
      </web-ui-checkbox>
      <web-ui-checkbox checked={channels.includes('sms')} onChange={() => toggle('sms')}>
        短信通知
      </web-ui-checkbox>
      <output className="text-sm text-(--wui-color-text-secondary)">
        已选择：{channels.join('、') || '还没有选中项'}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-checkbox :checked="channels.includes('email')" @change="toggle('email')">邮件通知</web-ui-checkbox>
    <web-ui-checkbox :checked="channels.includes('sms')" @change="toggle('sms')">短信通知</web-ui-checkbox>
    <output class="text-sm text-(--wui-color-text-secondary)"
      >已选择：{{ channels.join('、') || '还没有选中项' }}</output
    >
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const channels = ref(['email'])

function toggle(channel: string) {
  channels.value = channels.value.includes(channel)
    ? channels.value.filter(item => item !== channel)
    : [...channels.value, channel]
}
</script>
```

### 禁用

`disabled` 关掉交互，按下没有反应，校验也不生效。组级禁用写在 `<web-ui-checkbox-group>` 上，见下面的多选组。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-checkbox checked disabled>
        邮件通知（已选中，禁用）
      </web-ui-checkbox>
      <web-ui-checkbox disabled>短信通知（禁用）</web-ui-checkbox>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-checkbox :checked="true" disabled>邮件通知（已选中，禁用）</web-ui-checkbox>
    <web-ui-checkbox disabled>短信通知（禁用）</web-ui-checkbox>
  </div>
</template>
```

### 表单值

`name` 是字段名、`value` 是选中时提交的值：同一字段名可以挂多项，每个选中项各占一条 `FormData` 条目，未选中的不进表单。`required` 让原生校验在未勾选时拦下提交。

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      ref={formRef}
      className="flex flex-col items-start gap-3"
      onSubmit={event => {
        event.preventDefault()
        const fields: string[] = []
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === 'string') fields.push(`${name}=${value}`)
        }
        setSubmitted(fields.join(' · '))
      }}
    >
      <web-ui-checkbox name="channel" value="email">
        邮件
      </web-ui-checkbox>
      <web-ui-checkbox name="channel" value="sms">
        短信
      </web-ui-checkbox>
      <web-ui-checkbox name="agreement" value="yes" required>
        我已阅读并同意服务条款
      </web-ui-checkbox>
      <div className="flex items-center gap-3">
        <web-ui-button type="submit">提交</web-ui-button>
        <web-ui-button
          onClick={() => {
            formRef.current?.reset()
            setSubmitted('')
          }}
        >
          重置
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          {submitted === '' ? '尚未提交' : submitted}
        </output>
      </div>
    </form>
  )
}
```

```vue
<template>
  <form ref="form" class="flex flex-col items-start gap-3" @submit="onSubmit">
    <web-ui-checkbox name="channel" value="email">邮件</web-ui-checkbox>
    <web-ui-checkbox name="channel" value="sms">短信</web-ui-checkbox>
    <web-ui-checkbox name="agreement" value="yes" required>我已阅读并同意服务条款</web-ui-checkbox>
    <div class="flex items-center gap-3">
      <web-ui-button type="submit">提交</web-ui-button>
      <web-ui-button @click="reset">重置</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">{{ submitted === '' ? '尚未提交' : submitted }}</output>
    </div>
  </form>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'

const submitted = ref('')
const form = useTemplateRef('form')

function onSubmit(event: Event) {
  event.preventDefault()
  const fields: string[] = []
  for (const [name, value] of new FormData(event.currentTarget as HTMLFormElement)) {
    if (typeof value === 'string') fields.push(`${name}=${value}`)
  }
  submitted.value = fields.join(' · ')
}

function reset() {
  form.value?.reset()
  submitted.value = ''
}
</script>
```

多个独立复选框要收敛成一个 `string[]`、并由组统一派发事件与提交时，用 `<web-ui-checkbox-group>`，见下面的多选组。

## API

### 属性

| 名称       | 说明                 | 类型      | 默认值  |
| ---------- | -------------------- | --------- | ------- |
| `checked`  | 选中状态。           | `boolean` | `false` |
| `value`    | 选中时提交的表单值。 | `string`  | `''`    |
| `name`     | 表单字段名。         | `string`  | `''`    |
| `disabled` | 禁用状态。           | `boolean` | `false` |
| `required` | 必填校验。           | `boolean` | `false` |

### 事件

| 名称     | 说明                                              |
| -------- | ------------------------------------------------- |
| `input`  | 用户切换选中状态时派发：点击，或按 Enter / 空格。 |
| `change` | 与 `input` 在同一次用户操作里一起派发。           |

### Slot

| 名称      | 说明                                         |
| --------- | -------------------------------------------- |
| `default` | 标签文本；为空时收掉指示器与标签之间的间距。 |

### 行为说明

宿主暴露 `checkbox` 语义，`aria-checked`、`aria-disabled` 与 `tabindex` 随状态同步；Enter/Space 键盘切换。

未选中的项不写进 `FormData`；`value` 为空时提交 `'on'`，与原生复选框一致。

组内成员自己派发的 `input` / `change` 不会传出去，事件由组在宿主上统一派发一次，所以宿主外面只听到一组事件。

### 布局

宿主高度由内容撑开，不继承页面行高；`--wui-selection-control-size`（`18px`）决定指示器宽高，与相邻文字按 `vertical-align: middle` 对齐。

`<web-ui-radio>` 共用同一套规则。

默认插槽没画出东西时（空着，或只放了视觉隐藏的无障碍名，如 `.sr-only` 的 span），指示器与标签之间的间距收起，宿主宽度等于指示器。

空不空按渲染宽度判定，有指派但不画盒的无障碍名也算空；不要用 `display: none` 收掉标签，那会把它从无障碍树里拿掉。

### 选中动画

勾选时对勾从左端画出，取消时沿原路收回；`motion="reduced"` 时直接切换，挂载时已勾选的控件显示静态勾。

对勾颜色取 `--wui-color-on-control`，按 `<web-ui-icon>` 默认的 18px 渲染，不随 `--wui-selection-control-size` 放大。

### 未激活态

未选中指示器的底色取 `--wui-color-surface-control`（与中性按钮使用同一种控件底色），深色模式下也能和 `--wui-color-page` 分辨开。

触发区内任意位置（指示器、间距或右侧插槽中的标签）悬停时叠加状态层。

悬停只在 `(hover: hover) and (pointer: fine)` 设备上生效；没有按下态，已选中和禁用态保持各自底色。

`<web-ui-radio>` 共用同一套状态。
