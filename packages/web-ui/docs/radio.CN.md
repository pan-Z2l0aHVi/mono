# Radio

单个单选 button，与 `<web-ui-checkbox>` 共用选择控件的盒契约；`<web-ui-radio-group>` 负责在一组 option 之间保持单选。

## Samples

### Basic

默认插槽是 label 文字。单选控件自己只会「选中且保持」，点击已选中的一项不会取消它，所以独立使用时由页面持有这个值，`checked` 写成比较结果。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [plan, setPlan] = useState('basic')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-radio checked={plan === 'basic'} onChange={() => setPlan('basic')}>
        基础版
      </web-ui-radio>
      <web-ui-radio checked={plan === 'pro'} onChange={() => setPlan('pro')}>
        专业版
      </web-ui-radio>
      <output className="text-sm text-(--wui-color-text-secondary)">当前方案：{plan}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-radio :checked="plan === 'basic'" @change="plan = 'basic'">基础版</web-ui-radio>
    <web-ui-radio :checked="plan === 'pro'" @change="plan = 'pro'">专业版</web-ui-radio>
    <output class="text-sm text-(--wui-color-text-secondary)">当前方案：{{ plan }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const plan = ref('basic')
</script>
```

### Disabled

`disabled` 关掉交互：已选中的一项停在选中态，按下不动、校验也让路；组级禁用写在 `<web-ui-radio-group>` 上，见下面的单选组。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-radio checked disabled>
        企业版（已选中，禁用）
      </web-ui-radio>
      <web-ui-radio disabled>旗舰版（禁用）</web-ui-radio>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-radio :checked="true" disabled>企业版（已选中，禁用）</web-ui-radio>
    <web-ui-radio disabled>旗舰版（禁用）</web-ui-radio>
  </div>
</template>
```

### Form value

选中的那一项以 `name` 为字段名、`value` 为值进入 `FormData`，未选中的不进；`value` 留空时提交 `'on'`。同名的两项独立存在时谁被点谁就提交，保持单选是页面的事——要交给组件做就用 `<web-ui-radio-group>`。

```tsx
import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')
  const [size, setSize] = useState('m')

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
      <web-ui-radio name="size" value="s" checked={size === 's'} onChange={() => setSize('s')}>
        小
      </web-ui-radio>
      <web-ui-radio name="size" value="m" checked={size === 'm'} onChange={() => setSize('m')}>
        中
      </web-ui-radio>
      <web-ui-radio name="size" value="l" checked={size === 'l'} onChange={() => setSize('l')}>
        大
      </web-ui-radio>
      <div className="flex items-center gap-3">
        <web-ui-button type="submit">提交</web-ui-button>
        <web-ui-button
          onClick={() => {
            formRef.current?.reset()
            setSubmitted('')
            setSize('m')
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
    <web-ui-radio name="size" value="s" :checked="size === 's'" @change="size = 's'">小</web-ui-radio>
    <web-ui-radio name="size" value="m" :checked="size === 'm'" @change="size = 'm'">中</web-ui-radio>
    <web-ui-radio name="size" value="l" :checked="size === 'l'" @change="size = 'l'">大</web-ui-radio>
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
const size = ref('m')
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
  size.value = 'm'
}
</script>
```

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

| 名称     | 说明                                                              |
| -------- | ----------------------------------------------------------------- |
| `input`  | 用户点选该项时派发：点击，或按 Enter / 空格；已是选中态时不派发。 |
| `change` | 与 `input` 在同一次用户操作里一起派发。                           |

### Slots

| 名称      | 说明                                                   |
| --------- | ------------------------------------------------------ |
| `default` | label 文本；为空时收掉 indicator 与 label 之间的间距。 |

### 行为说明

Shadow DOM 内的交互 `<span>` 声明 `role="radio"`，并同步 `aria-checked`、`aria-disabled` 和 `tabindex`。Enter/Space 键盘切换。

点击只把该项置为选中，不会取消自己，也不会取消兄弟项；同页面的单选由宿主状态或 `<web-ui-radio-group>` 维持。

`required` 在未选中时拦截原生提交（`valueMissing`），组内成员把这个判定交给组。

组内成员自己派发的 `input` / `change` 不冒泡、不跨 shadow 边界，事件由组在宿主上统一派发一次。

### 布局

与 `<web-ui-checkbox>` 共用同一套选择控件盒契约，包括「label 没有画出东西时收起间距」这一条——宿主高度由内容撑开、不继承页面行高，indicator 宽高走 `--wui-selection-control-size`，与相邻文字按 `vertical-align: middle` 对齐。
