---
component: button-group
tag: web-ui-button-group
---

把若干个 `<web-ui-button>` 并成一组：组只负责成员之间的视觉连体（共享一块 glass 底、相邻 button 之间画分割线）与排列方向，不管选中态，也不改变成员各自的事件与表单行为。成员自己的 `size` 在组内被忽略，一律按 30px 高渲染。

## Samples

### Horizontal group

组给整组套一块 glass 底（`.wui-glass` 画在组的内层盒子上），并在相邻两枚成员之间补一条分割线，末尾那枚不补。

成员的 `variant` 在这里只剩文字色的意义：成员内部那层 `button.is-grouped` 把 `--wui-button-bg` 写成 `transparent`、把 hover / active 换成共用的 state layer。

元素自身的声明恒胜过从 variant 继承来的值，所以 `secondary` / `ghost` / `glass` 三档在组内观感一致（`glass` 那一档入组后连自己那块玻璃底也不画，`wui-glass` 只在没有组上下文时才加），只有 `danger` 的红字留得下来。

`primary` 则只剩 `var(--wui-color-on-accent)` 那身白字，落在浅色玻璃上几乎读不出来——组内请用 `secondary` 或 `ghost`。

```tsx
export default function Demo() {
  return (
    <web-ui-button-group>
      <web-ui-button variant="secondary">左</web-ui-button>
      <web-ui-button variant="secondary">中</web-ui-button>
      <web-ui-button variant="secondary">右</web-ui-button>
    </web-ui-button-group>
  )
}
```

```vue
<template>
  <web-ui-button-group>
    <web-ui-button variant="secondary">左</web-ui-button>
    <web-ui-button variant="secondary">中</web-ui-button>
    <web-ui-button variant="secondary">右</web-ui-button>
  </web-ui-button-group>
</template>
```

### Member content

成员可以是 icon-only、纯文字，或者用 `prefix` / `suffix` 夹一个 icon，组只把宿主盒子排成一行并居中：`align-items: center` 是写死的，成员高度又统一成 30px，所以混排天然对齐，没有任何一枚被拉伸或压窄。

icon-only 成员照旧要写 `aria-label`，否则读屏只念出一个空 button。

非 `<web-ui-button>` 的节点也会照常投影进这块玻璃里，但不参与末位与分割线的计算——组只按 `web-ui-button` 认成员。

```tsx
import { lucideChevronLeft, lucideChevronRight } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">icon-only 成员</span>
        <web-ui-button-group>
          <web-ui-button icon variant="secondary" aria-label="上一页">
            <web-ui-icon icon={lucideChevronLeft} size={16}></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="下一页">
            <web-ui-icon icon={lucideChevronRight} size={16}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">icon 走 prefix / suffix</span>
        <web-ui-button-group>
          <web-ui-button variant="secondary">
            <web-ui-icon slot="prefix" icon={lucideChevronLeft} size={16}></web-ui-icon>
            上一页
          </web-ui-button>
          <web-ui-button variant="secondary">
            下一页
            <web-ui-icon slot="suffix" icon={lucideChevronRight} size={16}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">文字与 icon 混排</span>
        <web-ui-button-group>
          <web-ui-button icon variant="secondary" aria-label="上一页">
            <web-ui-icon icon={lucideChevronLeft} size={16}></web-ui-icon>
          </web-ui-button>
          <web-ui-button variant="secondary">第 1 / 3 页</web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="下一页">
            <web-ui-icon icon={lucideChevronRight} size={16}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">icon-only 成员</span>
      <web-ui-button-group>
        <web-ui-button icon variant="secondary" aria-label="上一页">
          <web-ui-icon :icon="lucideChevronLeft" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="下一页">
          <web-ui-icon :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">icon 走 prefix / suffix</span>
      <web-ui-button-group>
        <web-ui-button variant="secondary">
          <web-ui-icon slot="prefix" :icon="lucideChevronLeft" :size="16"></web-ui-icon>
          上一页
        </web-ui-button>
        <web-ui-button variant="secondary">
          下一页
          <web-ui-icon slot="suffix" :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">文字与 icon 混排</span>
      <web-ui-button-group>
        <web-ui-button icon variant="secondary" aria-label="上一页">
          <web-ui-icon :icon="lucideChevronLeft" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button variant="secondary">第 1 / 3 页</web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="下一页">
          <web-ui-icon :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideChevronRight } from '@greypan/web-ui/icons'
</script>
```

### Vertical group

`direction` 决定横排还是竖排，默认 `horizontal`，合法值只有这两个，集合外的值一律回退成 `horizontal`。

这个属性只作为展示上下文（`{ direction, isLast }`）下发给成员，组不改写成员的任何属性。

竖排时玻璃盒子最小宽 `--wui-control-size`（页面值，默认 36px）、高度改由成员撑开。成员仍按组内统一的 30px 渲染，所以纯图标成员是 30px 方形、两侧各留 3px，而不是被撑成 36px 方形；文字成员的 label 不折行，仍可撑宽轨道。

分割线这时画在成员下方，同一条 `--wui-button-group-divider-length` 那次动的是宽度。

```tsx
import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-button-group direction="vertical">
      <web-ui-button icon variant="secondary" aria-label="放大">
        <web-ui-icon icon={lucidePlus} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="缩小">
        <web-ui-icon icon={lucideMinus} size={16}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="搜索">
        <web-ui-icon icon={lucideSearch} size={16}></web-ui-icon>
      </web-ui-button>
    </web-ui-button-group>
  )
}
```

```vue
<template>
  <web-ui-button-group direction="vertical">
    <web-ui-button icon variant="secondary" aria-label="放大">
      <web-ui-icon :icon="lucidePlus" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="缩小">
      <web-ui-icon :icon="lucideMinus" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="搜索">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
  </web-ui-button-group>
</template>

<script setup lang="ts">
import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Member gap

button-group 没有自己的 gap token：成员之间的间距与玻璃盒子的内衬同读 theme 的间距阶 `--wui-space-1`（默认 4px），所以这一条一动，间距和内衬一起变。

它由 `<web-ui-theme>` 宿主声明在自己那一棵子树上——写在 theme 元素之外的祖先上到不了组，写在组宿主自己身上则恒胜（元素自身的声明胜过继承值）。

另一条得知道：分割线钉在成员宿主的 `right: -2px`（竖排换成 `bottom: -2px`），4px 间距时正好落在两枚成员正中，把 `--wui-space-1` 调大之后它不跟着走，会偏向左边那一枚。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">--wui-space-1：4px（默认）</span>
        <web-ui-button-group>
          <web-ui-button variant="secondary">左</web-ui-button>
          <web-ui-button variant="secondary">中</web-ui-button>
          <web-ui-button variant="secondary">右</web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">--wui-space-1：12px，分割线不跟着走</span>
        <web-ui-button-group className="[--wui-space-1:12px]">
          <web-ui-button variant="secondary">左</web-ui-button>
          <web-ui-button variant="secondary">中</web-ui-button>
          <web-ui-button variant="secondary">右</web-ui-button>
        </web-ui-button-group>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">--wui-space-1：4px（默认）</span>
      <web-ui-button-group>
        <web-ui-button variant="secondary">左</web-ui-button>
        <web-ui-button variant="secondary">中</web-ui-button>
        <web-ui-button variant="secondary">右</web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">--wui-space-1：12px，分割线不跟着走</span>
      <web-ui-button-group class="[--wui-space-1:12px]">
        <web-ui-button variant="secondary">左</web-ui-button>
        <web-ui-button variant="secondary">中</web-ui-button>
        <web-ui-button variant="secondary">右</web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>
```

### Divider

分割线由「非末尾」的那枚成员自己渲染，带 `aria-hidden`，末位成员没有那一条。

短边恒为 1px，长边取 `--wui-button-group-divider-length`（默认 20px）：横排时这个值是高度，竖排时是宽度；颜色取全局的 `--wui-color-border`，不属于本组件的变量表。

theme 不声明这条变量，也只有分割线一处消费点，所以写在组宿主上一个 class 就够；写在单独某一枚成员上，则只影响它自己右侧（或下方）那一条。

```tsx
import { lucideMinus, lucidePlus } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">横排：分割线 12px</span>
        <web-ui-button-group className="[--wui-button-group-divider-length:12px]">
          <web-ui-button variant="secondary">左</web-ui-button>
          <web-ui-button variant="secondary">中</web-ui-button>
          <web-ui-button variant="secondary">右</web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">竖排：同一条变量给的是宽度</span>
        <web-ui-button-group className="[--wui-button-group-divider-length:32px]" direction="vertical">
          <web-ui-button icon variant="secondary" aria-label="放大">
            <web-ui-icon icon={lucidePlus} size={16}></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="缩小">
            <web-ui-icon icon={lucideMinus} size={16}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">横排：分割线 12px</span>
      <web-ui-button-group class="[--wui-button-group-divider-length:12px]">
        <web-ui-button variant="secondary">左</web-ui-button>
        <web-ui-button variant="secondary">中</web-ui-button>
        <web-ui-button variant="secondary">右</web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">竖排：同一条变量给的是宽度</span>
      <web-ui-button-group class="[--wui-button-group-divider-length:32px]" direction="vertical">
        <web-ui-button icon variant="secondary" aria-label="放大">
          <web-ui-icon :icon="lucidePlus" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="缩小">
          <web-ui-icon :icon="lucideMinus" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { lucideMinus, lucidePlus } from '@greypan/web-ui/icons'
</script>
```

### Member events

组不拦截成员的 `click`：`GroupController` 只在宿主上以 capture 监听 `change`，而 button-group 用的是纯展示型上下文，连 `handleChange` 都没实现，于是成员的点击原样冒泡过组宿主。

`event.target` 就是那一枚成员宿主——一个 handler 接住整组，用 `data-id` 区分是哪一枚（button 只把 `aria-label` 委派给内部 button，其余属性留在宿主上、不往 shadow 里复制，`data-*` 于是可以放心当身份标记）。

`disabled` 与 `loading` 的成员照样不产生 click，读数不动。

入组也不改表单行为：`type="submit"` 的成员仍然提交外层 `<form>`，所以点「保存」先读到 `点了 保存`，紧接着被 submit 事件改写。

button-group 自己没有 `disabled`：要整组禁用，把组放进 `<fieldset disabled>`（成员经表单级禁用一起变灰），或者逐枚写。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [log, setLog] = useState('还没有点击')

  return (
    <form
      className="flex flex-wrap items-center gap-4"
      onSubmit={event => {
        event.preventDefault()
        setLog('外层 form 收到了 submit')
      }}
    >
      <web-ui-input name="note" placeholder="备注"></web-ui-input>
      <web-ui-button-group
        onClick={event => {
          const id = (event.target as HTMLElement).dataset.id
          if (id) setLog(`点了 ${id}`)
        }}
      >
        <web-ui-button variant="secondary" type="submit" data-id="保存">
          保存
        </web-ui-button>
        <web-ui-button variant="secondary" data-id="复制">
          复制
        </web-ui-button>
        <web-ui-button variant="secondary" loading data-id="处理中">
          处理中
        </web-ui-button>
        <web-ui-button variant="danger" disabled data-id="删除">
          删除
        </web-ui-button>
      </web-ui-button-group>
      <output className="text-sm text-(--wui-color-text-secondary)">{log}</output>
    </form>
  )
}
```

```vue
<template>
  <form class="flex flex-wrap items-center gap-4" @submit="onSubmit">
    <web-ui-input name="note" placeholder="备注"></web-ui-input>
    <web-ui-button-group @click="onGroupClick">
      <web-ui-button variant="secondary" type="submit" data-id="保存">保存</web-ui-button>
      <web-ui-button variant="secondary" data-id="复制">复制</web-ui-button>
      <web-ui-button variant="secondary" loading data-id="处理中">处理中</web-ui-button>
      <web-ui-button variant="danger" disabled data-id="删除">删除</web-ui-button>
    </web-ui-button-group>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ log }}</output>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const log = ref('还没有点击')

function onGroupClick(event: MouseEvent) {
  const id = (event.target as HTMLElement).dataset.id
  if (id) log.value = `点了 ${id}`
}

function onSubmit(event: Event) {
  event.preventDefault()
  log.value = '外层 form 收到了 submit'
}
</script>
```

## API

### Props

| 名称        | 说明             | 类型                         | 默认值         |
| ----------- | ---------------- | ---------------------------- | -------------- |
| `direction` | 成员的排列方向。 | `'horizontal' \| 'vertical'` | `'horizontal'` |

### Slots

| 名称      | 说明                                                |
| --------- | --------------------------------------------------- |
| `default` | 组内的 `<web-ui-button>` 成员；其他节点也照常投影。 |

### 行为说明

组经 `@lit/context` 向成员下发一份只读的展示上下文 `{ direction, isLast }`，只有这一个下行通道：不持有选中态、值或禁用态，不改写成员的任何属性，也不替成员做排他选择。`direction` 传入集合外的值时回退成 `horizontal`。

成员的 `size` 在组内被忽略，高度统一成 30px；成员被移出组时上下文清空、恢复独立控件语义（自己按 variant 画底、按自己的 `size` 定高）。跨组移动是先断连清空、再向新组订阅，所以分割线与末位判定跟着新成员表重算。

`GroupController` 在宿主上以 capture 监听 `change`，但 button-group 用的是展示型生命周期（只有 `sync` / `disconnect`），没有 `handleChange`，因此成员的 `click` 一律原样冒泡出组宿主，`event.target` 是那一枚成员宿主。

组件自己不派发任何自定义事件，也没有 `disabled` / `required` 之类的组级状态：整组禁用要靠祖先 `<fieldset disabled>`（成员的表单级禁用一起生效）或逐枚写。

分割线由非末尾成员渲染，带 `aria-hidden`；末位成员没有那一条。成员数量或顺序变化由 light DOM 的 `MutationObserver` 与 `slotchange` 触发重算，所以 React 的条件渲染与 Vue 的 `v-if` 留下的注释节点都能被跟住。

### 布局

宿主是 inline-block，玻璃盒子 `.wui-button-group-inner` 是 flex：横排取 `row` + `width: max-content` + `height: var(--wui-control-size)`（36px）。

竖排由 `:host([direction='vertical'])` 换成 `column`，把定宽换成 `min-width: var(--wui-control-size)`、高度交给 `auto`，内衬也跟着转到上下。

两个方向都写死 `align-items: center`，成员既不被拉伸也不被压窄；成员之间的间距与盒子的内衬同取 `--wui-space-1`（4px）。

整圈的 `border-radius` 取 `--wui-radius-control`（theme 给的是 `calc(infinity * 1px)`，也就是胶囊），玻璃描边环的光泽半径则另由盒子写成 `calc(var(--wui-control-size) / 2)`，与同一枚圆角同源。

`--wui-control-size` 是本组宽高与那个光泽半径的来源，但它盖不住成员高度：成员那 30px 是以 inline style 写在各自内部 button 上的，所以 36px 的盒子里上下各留 3px。

### CSS Custom Properties

| 名称                                | 说明                                                             | 默认值 |
| ----------------------------------- | ---------------------------------------------------------------- | ------ |
| `--wui-button-group-divider-length` | 相邻成员之间分割线的长边；短边恒为 1px，横排给高度、竖排给宽度。 | `20px` |
