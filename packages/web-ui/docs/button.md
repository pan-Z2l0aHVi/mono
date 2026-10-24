---
component: button
tag: web-ui-button
---

button 触发一个即时操作：提交表单、打开 dialog、切换状态。它不向 `FormData` 贡献值，`type="submit"` / `type="reset"` 把这两个原生动作转发给宿主的 `<form>`；对外只有从 shadow 内原生 button 冒出来的 `click`，组件自己不派发任何自定义事件。

## 示例

### 变体 {#variants}

`variant` 决定视觉层级，合法值只有 `primary` / `secondary` / `ghost` / `danger` / `glass`，集合外的值一律回退到 `glass`。`glass` 与页面背景融合，适合工具栏；`primary` 一页只应有一个。

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

### 尺寸 {#sizes}

`size` 接受裸数字或 CSS 长度：裸数字按 px 解释（`size="28"` 即 `--wui-control-size: 28px`），带单位的写法（`32px`、`1.5rem`）原样使用；只决定高度；留空时高度由 theme 的 `--wui-control-size`（36px）给出。`icon` 模式下 `min-width` 与高度同值，所以那枚正方形跟着一起变。组内成员的高度由 `<web-ui-button-group>` 统一成 30px，自己写的 `size` 在组里不起作用。

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

### 宽度 {#width}

宽度只有两条路：`full` 让宿主变成 block 并把内部 button 铺满父容器，`--wui-button-width` 给内部 button 一个确定宽度（默认 `max-content`）。两条同时写时 `full` 赢——`:host([full]) button` 那条把宽度直接写成 `100%`，不看这个变量。label 一律 `white-space: nowrap`，容器不够宽时是溢出而不是折行。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-64 flex-col gap-2">
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
    <div class="flex w-64 flex-col gap-2">
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

### 前后缀 {#prefix-suffix}

默认插槽是 label 文字（内部包一层 span），`prefix` / `suffix` 命名插槽排在它两侧，三段之间的间距走 `--wui-button-gap`。没有指派节点的 slot 不生成盒子，所以空着的一侧不会留下半个 `gap`；前后缀不限类型，`<web-ui-icon>` 和 `<span>` 都能投影。

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

### icon 模式 {#icon}

`icon` 把内边距归零、`min-width` 与高度同值，宿主于是是一个正方形；默认插槽整体当作 icon 内容，不再包那层 label span，`prefix` / `suffix` 这时不渲染。没有可见文字的 icon button 必须写 `aria-label`，否则读屏只念出一个空 button。`loading` 优先于 icon 内容：spinner 取代默认插槽，slot 里的 icon 不投影，所以同一枚按钮加载前后不会出现两个图形。

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

### 禁用与加载 {#disabled-loading}

`disabled` 与 `loading` 都会把内部原生 button 真的置为 disabled：既不派发 `click`，也退出 tab 序，两个标记同时写还是同一个结果。禁用态整块降到四成不透明度并让出 hover / 按下态。非 icon 模式下 `loading` 在 label 之前加一个 spinner，文字与前后缀照常投影——宽度因此会变，需要稳定宽度就走 icon 模式。下面这枚由页面自己举着 `loading`：点「保存」进入加载态，点「结束等待」退回。

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

### 点击与按下态 {#click}

button 没有自定义事件，宿主要接的就是原生 `click`：它在 shadow 内的原生 button 上产生，组合并冒泡出来，`event.target` 重定向到宿主，所以 React 与 Vue 都能在 `<web-ui-button>` 上直接写 handler。键盘 Enter / 空格走同一次原生 activation，指针与键盘共用这一个 handler。按住期间画的是 `:active` 按下态；hover 只在 `(hover: hover) and (pointer: fine)` 的设备上画，按下态不挑设备。禁用与加载那两枚不产生 click，所以计数不动。

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

### 表单提交与重置 {#form}

`type` 只有 `button` / `submit` / `reset` 三个合法值，非法值规范化成 `button`。后两者在这次 composed `click` 的同步监听派发完之后，读宿主 ElementInternals 的 form owner 再转发 `requestSubmit()` / `reset()`，所以对这次 click 调 `preventDefault()` 就能取消这次动作——下面那枚「提交但被拦下」就是这么做的。内部 button 自己没有 form owner，于是 `SubmitEvent.submitter` 是 `null`（读数里能看到）。「重置」转发的是 `form.reset()`，所以 `<web-ui-input>` 回到挂载时的初值，读数由这次 click 自己的 handler 清掉。这个 form 提交出来的只有 `nickname`：button 不贡献值，外层 `<fieldset disabled>` 会连这几枚一起禁用。

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

### CSS 变量 {#theming}

表里这七个变量都写在 `<web-ui-button>` 宿主自己身上。`--wui-button-width` / `--wui-button-px` / `--wui-button-gap` 三条别处没人声明，挂在宿主上的一个 class 就够（下面第一枚）。`--wui-button-color` / `--wui-button-bg` / `--wui-button-bg-hover` / `--wui-button-bg-active` 这四条由 `:host([variant='...'])` 声明在宿主自己身上，继承来的值盖不住元素自身的声明，所以要么写在这枚宿主上、要么直接写进行内 `style`——这里走行内 `style`，四档一次给全。另有一层派生关系值得知道：`primary` 与 `secondary` 两档的 hover / active 都是从 `--wui-button-bg` 经 `color-mix(... , black)` 派生的（primary 取 88% / 76%，secondary 取 92% / 82%），只换 `--wui-button-bg` 那两档跟着一起变深（第二枚就是这样，按住它能看到）；`danger` 与 `glass` 不走这条派生，换了底色得自己补上那两档。第三枚把四档各指到一枚现成 token 上，是为了让悬停与按下各跳成一种看得出来颜色，真实页面不会这么配。

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
        只换底色，hover 与按下跟着变深
      </web-ui-button>
      <web-ui-button variant="secondary" style={fourStates}>
        四档配色各指一枚 token
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
    <web-ui-button :style="successOnly" variant="primary">只换底色，hover 与按下跟着变深</web-ui-button>
    <web-ui-button :style="fourStates" variant="secondary">四档配色各指一枚 token</web-ui-button>
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

| 名称            | 说明                                                                                                                  | 类型                                                         | 默认值     |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| `variant`       | 视觉变体；集合外的值回退到 `glass`。                                                                                  | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'`  |
| `disabled`      | 禁用状态，内部原生 button 一起禁用。                                                                                  | `boolean`                                                    | `false`    |
| `loading`       | 加载态。同样阻断交互，并优先渲染 spinner。                                                                            | `boolean`                                                    | `false`    |
| `full`          | 占满父容器宽度。                                                                                                      | `boolean`                                                    | `false`    |
| `icon`          | icon 模式：宿主成正方形，默认插槽整体作为 icon 内容。                                                                 | `boolean`                                                    | `false`    |
| `size`          | button 高度；裸数字按 px 解释，也接受 CSS 长度（如 `32px`、`1.5rem`）。在 `<web-ui-button-group>` 内被组统一成 30px。 | `string`                                                     | `''`       |
| `type`          | 原生 button 的 `type`；非法值规范化成 `button`。                                                                      | `'button' \| 'submit' \| 'reset'`                            | `'button'` |
| `aria-label`    | 无障碍名称，透传给内部原生 button。                                                                                   | `string \| null`                                             | `null`     |
| `aria-disabled` | 值为 `true` 时阻止 click 与表单动作，但保留焦点能力；透传给内部原生 button。                                          | `string \| null`                                             | `null`     |
| `aria-expanded` | 展开状态；透传给内部原生 button，供辅助技术读取。                                                                     | `string \| null`                                             | `null`     |

### Slots

| 名称      | 说明                                                             |
| --------- | ---------------------------------------------------------------- |
| `default` | label 文字（内部包一层 span）；`icon` 模式下整体作为 icon 内容。 |
| `prefix`  | label 左侧的 icon 或标识；`icon` 模式下不渲染。                  |
| `suffix`  | label 右侧的 icon 或标识；空着的一侧不生成盒子，因此不占 `gap`。 |

### 行为说明

`click` 由 shadow 内的原生 button 派发，组合并冒泡到宿主，`event.target` 重定向到宿主；Enter 与 空格 走同一次原生 activation，所以指针与键盘共用这一个事件。`disabled`、`loading` 与表单级禁用（祖先 `<fieldset disabled>`）都会把内部 button 真的置为 disabled，click 不再产生、tab 也进不来。`aria-label`、`aria-disabled` 与 `aria-expanded` 显式委派到内部原生 button；`aria-controls` 及其他属性留在宿主上，不会自动复制，因为 IDREF 不能跨 shadow root 解析。用 `<web-ui-button>` 作 collapse trigger 时，辅助技术可在暴露为 button 的内部节点读取 `aria-expanded`。

`submit` 与 `reset` 在 composed `click` 的同步监听全部派发完之后，经宿主的 form owner 转发到原生 `<form>`；对这次 click 调 `preventDefault()` 会取消该动作。内部 button 自身没有 form owner，因此 `SubmitEvent.submitter` 为 `null`。button 不向 `FormData` 贡献值（form state 恒为 `null`）。

`aria-disabled="true"` 会阻止 `click` 与表单动作，但不会设置原生 `disabled`，因此内部 button 仍可聚焦。

`icon` 与 `loading` 同时开启时只渲染 spinner，默认插槽不投影；非 icon 模式下 spinner 排在 label 之前，与前后缀并存。`variant` 与 `type` 的非法值分别回退到 `glass` 与 `button`。默认形状保持正方形由 `icon` 决定，`full` 或显式 `--wui-button-width` 除外。

### 布局

宿主是 inline-flex 盒，把内部 button 双向居中，高度由内部 button 决定、不继承页面行高；`full` 时改成 block 并把宽度铺到 100%。内部 button 高度取 `--wui-control-size`（`36px`，`size` 覆盖它），圆角取 `--wui-radius-control`（胶囊），水平内边距取 `--wui-button-px`，`icon` 模式下内边距归零、`min-width` 与高度同值。label `white-space: nowrap` 且容器 `overflow: clip`，宽度不足时溢出而不是折行。字号靠 `font: inherit` 从宿主继承再取 `--wui-font-size`，避免 UA 给原生 button 换上 Arial。cursor 由组件固定成 `default`（不跟成 `pointer`），禁用时宿主另加一层 `not-allowed`；禁用态的不透明度是 0.4。焦点环画在内部 button 的 `:focus-visible` 上（`--wui-focus-ring-width` / `--wui-color-focus-ring`），指针点击期间由 `data-wui-pointer-focus` 压成透明，键盘 Tab 回来时恢复。内部 button 暴露为 `::part(button)`。

### CSS Custom Properties

| 名称                     | 说明                                                                                                              | 默认值               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------- |
| `--wui-button-width`     | button 宽度；`full` 时被 `100%` 接管。                                                                            | `max-content`        |
| `--wui-button-px`        | 水平内边距。                                                                                                      | `var(--wui-space-3)` |
| `--wui-button-gap`       | 前缀 / label / 后缀三段之间的间距。                                                                               | `var(--wui-space-2)` |
| `--wui-button-color`     | button 文字颜色，由 `:host([variant='...'])` 声明。                                                               | 随 variant           |
| `--wui-button-bg`        | button 背景颜色，由 `:host([variant='...'])` 声明。                                                               | 随 variant           |
| `--wui-button-bg-hover`  | 悬停背景颜色，只在 `(hover: hover) and (pointer: fine)` 生效；primary / secondary 两档由 `--wui-button-bg` 派生。 | 随 variant           |
| `--wui-button-bg-active` | 按下背景颜色，`:active` 且非禁用时生效，不挑指针设备；同样由 `--wui-button-bg` 派生（danger / glass 除外）。      | 随 variant           |
