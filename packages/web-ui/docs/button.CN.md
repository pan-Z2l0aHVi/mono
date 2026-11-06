# Button

按钮触发一个即时操作：提交表单、打开对话框、切换状态。

它不向 `FormData` 贡献值。`type="submit"` 与 `type="reset"` 把这两个原生动作转发给外层 `<form>`。对外只有原生按钮的 `click`，组件不派发自定义事件。

## Samples

### Variants

`variant` 决定视觉层级。合法值只有 `primary` / `secondary` / `ghost` / `danger` / `glass`，集合外的值回退到 `glass`。`glass` 与页面背景融合，适合工具栏；`primary` 一页只应有一个。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary">Primary</web-ui-button>
      <web-ui-button variant="secondary">Secondary</web-ui-button>
      <web-ui-button variant="ghost">Ghost</web-ui-button>
      <web-ui-button variant="danger">Danger</web-ui-button>
      <web-ui-button variant="glass">Glass</web-ui-button>
      <web-ui-button>没写 variant（同样是 glass）</web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button variant="primary">Primary</web-ui-button>
    <web-ui-button variant="secondary">Secondary</web-ui-button>
    <web-ui-button variant="ghost">Ghost</web-ui-button>
    <web-ui-button variant="danger">Danger</web-ui-button>
    <web-ui-button variant="glass">Glass</web-ui-button>
    <web-ui-button>没写 variant（同样是 glass）</web-ui-button>
  </div>
</template>
```

### Sizes

`size` 接受裸数字或 CSS 长度。裸数字按 px 解释，`size="28"` 即 28px；带单位的写法（`32px`、`1.5rem`）原样使用。它只决定高度，留空时高度取 theme 的 `--wui-control-size`（36px）。

`icon` 模式下宿主是正方形，尺寸随 `size` 一起变。

组内成员的高度由 `<web-ui-button-group>` 统一成 30px，成员自己写的 `size` 在组里不生效。

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary" size="28">
        Small 28
      </web-ui-button>
      <web-ui-button variant="primary">默认 36</web-ui-button>
      <web-ui-button variant="primary" size="48">
        Large 48
      </web-ui-button>
      <web-ui-button icon size="48" aria-label="大号搜索">
        <web-ui-icon icon={lucideSearch} size={20}></web-ui-icon>
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button variant="primary" size="28">Small 28</web-ui-button>
    <web-ui-button variant="primary">默认 36</web-ui-button>
    <web-ui-button variant="primary" size="48">Large 48</web-ui-button>
    <web-ui-button icon size="48" aria-label="大号搜索">
      <web-ui-icon :icon="lucideSearch" :size="20"></web-ui-icon>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Width

宽度有两种设置：`full` 让控件铺满父容器，`--wui-button-width` 给按钮一个固定宽度（默认 `max-content`）。

两者同时设置时 `full` 优先，`--wui-button-width` 被忽略。

标签不折行，容器不够宽时会溢出。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-5">
      <web-ui-button full variant="primary">
        full：占满整行
      </web-ui-button>

      <div className="grid w-full grid-cols-2 gap-2">
        <web-ui-button full variant="primary">
          full：占满这一列
        </web-ui-button>
        <web-ui-button full>full：glass 档</web-ui-button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" className="[--wui-button-width:160px]">
          160px 宽
        </web-ui-button>
        <web-ui-button variant="secondary" size="40" className="[--wui-button-width:220px]">
          40×220
        </web-ui-button>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-5">
    <web-ui-button full variant="primary">full：占满整行</web-ui-button>

    <div class="grid w-full grid-cols-2 gap-2">
      <web-ui-button full variant="primary">full：占满这一列</web-ui-button>
      <web-ui-button full>full：glass 档</web-ui-button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" class="[--wui-button-width:160px]">160px 宽</web-ui-button>
      <web-ui-button variant="secondary" size="40" class="[--wui-button-width:220px]">40×220</web-ui-button>
    </div>
  </div>
</template>
```

### Prefix and suffix

默认插槽是标签文字，`prefix` / `suffix` 命名插槽排在它两侧，三段之间的间距取 `--wui-button-gap`。

空着的一侧不占 `gap`。前后缀不限类型，`<web-ui-icon>` 和 `<span>` 都能投影。

```tsx
import { lucideChevronLeft, lucideChevronRight, lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button variant="secondary">
        <web-ui-icon slot="prefix" icon={lucideSearch} size={16}></web-ui-icon>
        搜索
      </web-ui-button>
      <web-ui-button variant="secondary">
        下一页
        <web-ui-icon slot="suffix" icon={lucideChevronRight} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button variant="primary">
        <web-ui-icon slot="prefix" icon={lucideChevronLeft} size={16}></web-ui-icon>
        返回
        <span slot="suffix" className="opacity-60">
          Enter
        </span>
      </web-ui-button>
      <web-ui-button>
        <span slot="prefix">prefix</span>
        button
        <span slot="suffix">suffix</span>
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button variant="secondary">
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
      搜索
    </web-ui-button>
    <web-ui-button variant="secondary">
      下一页
      <web-ui-icon slot="suffix" :icon="lucideChevronRight" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button variant="primary">
      <web-ui-icon slot="prefix" :icon="lucideChevronLeft" :size="16"></web-ui-icon>
      返回
      <span slot="suffix" class="opacity-60">Enter</span>
    </web-ui-button>
    <web-ui-button>
      <span slot="prefix">prefix</span>
      button
      <span slot="suffix">suffix</span>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideChevronRight, lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Icon mode

`icon` 让宿主成为正方形，默认插槽整体当作图标内容，`prefix` / `suffix` 这时不渲染。

没有可见文字的图标按钮必须写 `aria-label`，否则读屏只念出一个空按钮。

`loading` 优先于图标内容：spinner 取代默认插槽，插槽里的图标不渲染。

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button icon aria-label="搜索">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="primary" aria-label="搜索">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="搜索">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="ghost" aria-label="搜索">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="danger" aria-label="搜索">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="primary" loading aria-label="加载中">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon aria-label="加号">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
        </svg>
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button icon aria-label="搜索">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="primary" aria-label="搜索">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="搜索">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="ghost" aria-label="搜索">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="danger" aria-label="搜索">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="primary" loading aria-label="加载中">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon aria-label="加号">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
      </svg>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Disabled and loading

`disabled` 与 `loading` 都会真正禁用控件：不派发 `click`，也退出 Tab 序。禁用态整体降到四成不透明度，没有悬停与按下态。

非图标模式下 `loading` 在标签之前加一个 spinner，文字与前后缀照常显示，因此宽度会变。需要固定宽度时用图标模式。

`loading` 由页面持有：点「保存」进入加载态，点「结束等待」退出。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [pending, setPending] = useState(false)

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button disabled>Disabled</web-ui-button>
        <web-ui-button variant="primary" disabled>
          Disabled
        </web-ui-button>
        <web-ui-button loading>加载中</web-ui-button>
        <web-ui-button variant="primary" loading>
          加载中
        </web-ui-button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="primary" loading={pending} onClick={() => setPending(true)}>
          保存
        </web-ui-button>
        <web-ui-button variant="secondary" disabled={!pending} onClick={() => setPending(false)}>
          结束等待
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          loading：{pending ? 'true，保存按钮点不动' : 'false'}
        </output>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button disabled>Disabled</web-ui-button>
      <web-ui-button variant="primary" disabled>Disabled</web-ui-button>
      <web-ui-button loading>加载中</web-ui-button>
      <web-ui-button variant="primary" loading>加载中</web-ui-button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary" :loading="pending" @click="pending = true">保存</web-ui-button>
      <web-ui-button variant="secondary" :disabled="!pending" @click="pending = false">结束等待</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        loading：{{ pending ? 'true，保存按钮点不动' : 'false' }}
      </output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const pending = ref(false)
</script>
```

### Click and pressed state

按钮没有自定义事件，监听原生 `click` 即可。这个事件组合并冒泡到宿主，`event.target` 会重定向到宿主，所以 React 与 Vue 都能直接在 `<web-ui-button>` 上写处理函数。

Enter 与空格也产生同一个 `click`。

悬停只在 `(hover: hover) and (pointer: fine)` 的设备上出现，按下态在所有设备上都有。

禁用与加载的按钮不产生点击。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [clicks, setClicks] = useState(0)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary" onClick={() => setClicks(count => count + 1)}>
        按一下
      </web-ui-button>
      <web-ui-button variant="primary" disabled onClick={() => setClicks(count => count + 1)}>
        禁用（点了不计数）
      </web-ui-button>
      <web-ui-button variant="primary" loading onClick={() => setClicks(count => count + 1)}>
        加载（点了不计数）
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">click：{clicks} 次</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button variant="primary" @click="clicks += 1">按一下</web-ui-button>
    <web-ui-button variant="primary" disabled @click="clicks += 1">禁用（点了不计数）</web-ui-button>
    <web-ui-button variant="primary" loading @click="clicks += 1">加载（点了不计数）</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">click：{{ clicks }} 次</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const clicks = ref(0)
</script>
```

### Form submit and reset

`type` 只有 `button` / `submit` / `reset` 三个合法值，非法值规范化成 `button`。

`submit` / `reset` 在这次 `click` 的同步监听全部派发完之后转发给外层 `<form>`。对这次点击调用 `preventDefault()` 即可取消。

`SubmitEvent.submitter` 是 `null`。

「重置」转发 `form.reset()`，`<web-ui-input>` 回到挂载时的初值。

这个表单只提交 `nickname`：按钮不贡献值，外层 `<fieldset disabled>` 会把这几个按钮一起禁用。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={event => {
        event.preventDefault()
        const nickname = new FormData(event.currentTarget).get('nickname')
        const submitter = (event.nativeEvent as SubmitEvent).submitter
        setSubmitted(
          `nickname=${typeof nickname === 'string' && nickname !== '' ? nickname : '(空)'} · submitter=${
            submitter === null ? 'null' : '非 null'
          }`
        )
      }}
    >
      <web-ui-input name="nickname" placeholder="昵称"></web-ui-input>
      <web-ui-button type="submit" variant="primary">
        提交
      </web-ui-button>
      <web-ui-button
        type="submit"
        variant="secondary"
        onClick={event => {
          event.preventDefault()
          setSubmitted('这次 click 被 preventDefault，没有提交')
        }}
      >
        提交但被拦下
      </web-ui-button>
      <web-ui-button type="reset" variant="ghost" onClick={() => setSubmitted('')}>
        重置
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">{submitted === '' ? '尚未提交' : submitted}</output>
    </form>
  )
}
```

```vue
<template>
  <form class="flex flex-wrap items-center gap-3" @submit="onSubmit">
    <web-ui-input name="nickname" placeholder="昵称"></web-ui-input>
    <web-ui-button type="submit" variant="primary">提交</web-ui-button>
    <web-ui-button type="submit" variant="secondary" @click="onCancelledClick">提交但被拦下</web-ui-button>
    <web-ui-button type="reset" variant="ghost" @click="submitted = ''">重置</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ submitted === '' ? '尚未提交' : submitted }}</output>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const submitted = ref('')

function onSubmit(event: Event) {
  event.preventDefault()
  const nickname = new FormData(event.currentTarget as HTMLFormElement).get('nickname')
  const submitter = (event as SubmitEvent).submitter
  submitted.value = `nickname=${
    typeof nickname === 'string' && nickname !== '' ? nickname : '(空)'
  } · submitter=${submitter === null ? 'null' : '非 null'}`
}

function onCancelledClick(event: MouseEvent) {
  event.preventDefault()
  submitted.value = '这次 click 被 preventDefault，没有提交'
}
</script>
```

### CSS variables

表里七个变量都写在 `<web-ui-button>` 宿主上。`--wui-button-width` / `--wui-button-px` / `--wui-button-gap` 挂在宿主的 class 上即可。

`--wui-button-color` / `--wui-button-bg` / `--wui-button-bg-hover` / `--wui-button-bg-active` 由变体声明在宿主上，继承值覆盖不了它。要么写在这枚宿主上，要么写进行内 `style`。

`primary` 与 `secondary` 的悬停 / 激活由 `--wui-button-bg` 派生，只换底色时这两个状态会跟着变深。`danger` 与 `glass` 不派生，换底色时这两个状态要自己补上。

```tsx
import { lucideUpload } from '@greypan/web-ui/icons'
import type { CSSProperties } from 'react'

const successOnly = { '--wui-button-bg': 'var(--wui-color-success)' } as CSSProperties

const fourStates = {
  '--wui-button-color': 'var(--wui-color-on-accent)',
  '--wui-button-bg': 'var(--wui-color-success)',
  '--wui-button-bg-hover': 'var(--wui-color-accent)',
  '--wui-button-bg-active': 'var(--wui-color-warning)'
} as CSSProperties

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" className="[--wui-button-px:28px] [--wui-button-gap:14px]">
        <web-ui-icon slot="prefix" icon={lucideUpload} size={16}></web-ui-icon>
        内边距与插槽间距都放宽
      </web-ui-button>
      <web-ui-button variant="primary" style={successOnly}>
        只换底色
      </web-ui-button>
      <web-ui-button variant="secondary" style={fourStates}>
        四档配色
      </web-ui-button>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button class="[--wui-button-px:28px] [--wui-button-gap:14px]" variant="secondary">
      <web-ui-icon slot="prefix" :icon="lucideUpload" :size="16"></web-ui-icon>
      内边距与插槽间距都放宽
    </web-ui-button>
    <web-ui-button :style="successOnly" variant="primary">只换底色</web-ui-button>
    <web-ui-button :style="fourStates" variant="secondary">四档配色</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideUpload } from '@greypan/web-ui/icons'
import type { CSSProperties } from 'vue'

const successOnly = { '--wui-button-bg': 'var(--wui-color-success)' } as CSSProperties

const fourStates = {
  '--wui-button-color': 'var(--wui-color-on-accent)',
  '--wui-button-bg': 'var(--wui-color-success)',
  '--wui-button-bg-hover': 'var(--wui-color-accent)',
  '--wui-button-bg-active': 'var(--wui-color-warning)'
} as CSSProperties
</script>
```

## API

### Props

| 名称            | 说明                                                                                                               | 类型                                                         | 默认值     |
| --------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------- |
| `variant`       | 视觉变体；集合外的值回退到 `glass`。                                                                               | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'`  |
| `disabled`      | 禁用状态。                                                                                                         | `boolean`                                                    | `false`    |
| `loading`       | 加载态。同样阻断交互，并优先渲染 spinner。                                                                         | `boolean`                                                    | `false`    |
| `full`          | 占满父容器宽度。                                                                                                   | `boolean`                                                    | `false`    |
| `icon`          | 图标模式：宿主成正方形，默认插槽整体作为图标内容。                                                                 | `boolean`                                                    | `false`    |
| `size`          | 按钮高度；裸数字按 px 解释，也接受 CSS 长度（如 `32px`、`1.5rem`）。在 `<web-ui-button-group>` 内被组统一成 30px。 | `string`                                                     | `''`       |
| `type`          | 原生按钮的 `type`；非法值规范化成 `button`。                                                                       | `'button' \| 'submit' \| 'reset'`                            | `'button'` |
| `aria-label`    | 无障碍名称。                                                                                                       | `string \| null`                                             | `null`     |
| `aria-expanded` | 展开状态，供辅助技术读取。                                                                                         | `string \| null`                                             | `null`     |

### Slots

| 名称      | 说明                                                         |
| --------- | ------------------------------------------------------------ |
| `default` | 标签文字；`icon` 模式下整体作为图标内容。                    |
| `prefix`  | 标签左侧的图标或标识；`icon` 模式下不渲染。                  |
| `suffix`  | 标签右侧的图标或标识；空着的一侧不生成盒子，因此不占 `gap`。 |

### 行为说明

`click` 由原生按钮组合并冒泡到宿主，`event.target` 会重定向到宿主。Enter 与空格触发同一次原生激活，所以指针与键盘共用这一个事件。

`disabled`、`loading` 与表单级禁用（祖先 `<fieldset disabled>`）都会真正禁用控件：不产生点击，Tab 序也进不去。

`aria-label` 与 `aria-expanded` 委派到内部原生按钮；`aria-controls` 及其他属性留在宿主上，不会自动复制。

用 `<web-ui-button>` 作折叠触发器时，辅助技术能读到 `aria-expanded`。

`submit` 与 `reset` 在 composed `click` 的同步监听全部派发完之后转发到原生 `<form>`；对这次点击调 `preventDefault()` 会取消该动作。

`SubmitEvent.submitter` 为 `null`。

按钮不向 `FormData` 贡献值（表单状态恒为 `null`）。

禁用只有 `disabled` 一条路径：点击与表单动作都不发生。`aria-disabled` 不读取也不转发，写上去只留在宿主，对行为没有影响。

`icon` 与 `loading` 同时开启时只渲染 spinner，默认插槽不投影；非图标模式下 spinner 排在标签之前，与前后缀并存。

`variant` 与 `type` 的非法值分别回退到 `glass` 与 `button`。

默认形状是正方形，由 `icon` 决定；`full` 或显式设置 `--wui-button-width` 时除外。

### 布局

宿主是 inline-flex 盒，高度由内部按钮决定、不继承页面行高；`full` 时宽度铺到 100%。

高度取 `--wui-control-size`（`36px`，`size` 覆盖它），圆角是胶囊，水平内边距取 `--wui-button-px`。

标签不折行，宽度不足时溢出。字号取 `--wui-font-size`。

光标固定为 `default`，禁用时是 `not-allowed`；禁用态不透明度 0.4。

焦点环使用 `--wui-focus-ring-width` / `--wui-color-focus-ring`；指针点击时不显示，键盘 Tab 回来时恢复。

内部按钮暴露为 `::part(button)`。

### CSS Custom Properties

| 名称                     | 说明                                                                                                          | 默认值               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------- |
| `--wui-button-width`     | 按钮宽度；`full` 时被 `100%` 接管。                                                                           | `max-content`        |
| `--wui-button-px`        | 水平内边距。                                                                                                  | `var(--wui-space-3)` |
| `--wui-button-gap`       | 前缀 / 标签 / 后缀三段之间的间距。                                                                            | `var(--wui-space-2)` |
| `--wui-button-color`     | 按钮文字颜色，随变体变化。                                                                                    | 随变体               |
| `--wui-button-bg`        | 按钮背景颜色，随变体变化。                                                                                    | 随变体               |
| `--wui-button-bg-hover`  | 悬停背景颜色，只在 `(hover: hover) and (pointer: fine)` 生效；primary / secondary 由 `--wui-button-bg` 派生。 | 随变体               |
| `--wui-button-bg-active` | 按下背景颜色，`:active` 且非禁用时生效，不挑指针设备；primary / secondary 由 `--wui-button-bg` 派生。         | 随变体               |
