---
component: checkbox
tag: web-ui-checkbox
---

单个 checkbox，支持 Enter / Space 切换；与原生 `<form>` 集成，选中时把 `value` 提交进 `FormData`。

## 示例

### 基础 {#basic}

`checked` 是控件状态，默认插槽是 label 文字；indicator、间距与右侧文案都是触发区，点哪儿都算一次切换。

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

### 禁用 {#disabled}

`disabled` 关掉交互，按下不动、校验也让路；组级禁用写在 `<web-ui-checkbox-group>` 上，见下面的多选组。

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

### 表单值 {#form}

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

多个独立 checkbox 要收敛成一个 `string[]`、并由组统一派发事件与提交时，用 `<web-ui-checkbox-group>`，见下面的多选组。

## API

### Props

| 名称       | 说明                 | 类型      | 默认值  |
| ---------- | -------------------- | --------- | ------- |
| `checked`  | 选中状态。           | `boolean` | `false` |
| `value`    | 选中时提交的表单值。 | `string`  | `''`    |
| `name`     | 表单字段名。         | `string`  | `''`    |
| `disabled` | 禁用状态。           | `boolean` | `false` |
| `required` | 必填校验。           | `boolean` | `false` |

### Events

| 名称     | 说明                                              |
| -------- | ------------------------------------------------- |
| `input`  | 用户切换选中状态时派发：点击，或按 Enter / 空格。 |
| `change` | 与 `input` 在同一次用户操作里一起派发。           |

### Slots

| 名称      | 说明                                                   |
| --------- | ------------------------------------------------------ |
| `default` | label 文本；为空时收掉 indicator 与 label 之间的间距。 |

### 行为说明

Shadow DOM 内的交互 `<span>` 声明 `role="checkbox"`，并同步 `aria-checked`、`aria-disabled` 和 `tabindex`。Enter/Space 键盘切换。

未选中的项不写进 `FormData`；`getFormValue` 在 `value` 为空时退回 `'on'`，与原生 checkbox 一致。

组内成员（`<web-ui-checkbox-group>` 的直接子项）自己派发的 `input` / `change` 不冒泡、不跨 shadow 边界，事件由组在宿主上统一派发一次，所以宿主外面只听到一组事件，不会为每个成员各听一遍。

### 布局

宿主是 inline-flex 盒，高度由内容撑开、不继承页面行高，因此不会在 indicator 上下留出多余缝隙；`--wui-selection-control-size`（`18px`）决定 indicator 宽高，宿主与相邻文字的对齐固定为 `vertical-align: middle`。

`<web-ui-radio>` 共用同一套契约。

indicator 与 label 之间的 10px 归 label 所有：default slot 没画出东西时（空着，或里面只放了一个视觉隐藏的无障碍名，例如 `.sr-only` 的 span）这段间距一并收起，宿主宽度就等于 indicator。

空不空按 label 盒子的渲染宽度判定，而不是按 slot 被指派了节点判定——无障碍名正是「有指派、不画盒」的那一种；也不能用 `display: none` 收掉 label，那会把这个名字从无障碍树里拿掉。

### 选中动画

对勾是 `@/icons` 里的描边资产，由嵌套的 `<web-ui-icon>` 渲染在 `<web-ui-svg-draw-lines>` 内，并带 `no-autoplay`，所以挂载时就已勾选的控件显示静态勾。

勾选时线条从左侧尖端起按恒定笔速画出，时长取 `--wui-duration-trigger`（默认 160ms），在切换当下从已生效的主题解析，和 indicator 底色那条 transition 落在同一拍；取消时沿同一条路径收回到空白，而不是只淡出；主题范围为 `motion="reduced"` 时两者都跳过，两个状态直接切换。

描边颜色是 `--wui-color-on-control`，经 `<web-ui-icon>` 的 `--wui-icon-color` 传下去，因为勾选后它背后就是 `--wui-color-accent`。

这个结构带来两条约束：资产必须保持描边（`fill: none` + `stroke: currentColor`），换成实心 icon dash 动画照跑却什么都不画，勾会直接出现；并且它按 `<web-ui-icon>` 自己的默认 18px 渲染，宿主够不到 icon shadow root 里的 `<svg>`，因此不随 `--wui-selection-control-size` 放大。

### 未激活态

未选中 indicator 的底色取 `--wui-color-surface-control`（与中性 button 同一档控件底），深色模式下也能和 `--wui-color-page` 分辨开。

触发区内任意位置（indicator、间距或右侧 slot label）被 hover 时，该底色再叠 6% 状态层。

hover 只在 `(hover: hover) and (pointer: fine)` 设备上生效；没有按下态，已选中和禁用态保持各自底色。

`<web-ui-radio>` 共用同一套状态。
