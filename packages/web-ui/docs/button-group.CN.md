# Button Group

[English](./button-group.md) | 简体中文

把若干个 `<web-ui-button>` 并成一组。组只负责两件事：让相邻的按钮连成整体（共享一块 glass 底，相邻按钮之间画分割线），以及决定排列方向。它不管选中态，也不改变成员各自的事件与表单行为。成员自己的 `size` 在组内被忽略，所有成员都按 30px 高渲染。

## 示例

### 水平 group

整组共享一块 glass 底，相邻成员之间有分割线，末尾那枚没有。

成员的 `variant` 在这里只剩文字色的意义：背景透明，悬停 / 激活使用共用的状态层。

因此 `secondary` / `ghost` / `glass` 三种在组内看起来一样，只有 `danger` 的红字保留。

`primary` 只剩白字，落在浅色玻璃上几乎读不出来，组内请用 `secondary` 或 `ghost`。

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

### 成员内容

成员可以是纯图标、纯文字，或用 `prefix` / `suffix` 夹一个图标；成员高度统一成 30px 并居中对齐，混排不会被拉伸或压窄。

纯图标成员照旧要写 `aria-label`，否则读屏只念出一个空按钮。

非 `<web-ui-button>` 的节点也照常投影，但不参与末位与分割线的计算。

```tsx
import { lucideChevronLeft, lucideChevronRight } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">icon-only 成员</span>
        <web-ui-button-group>
          <web-ui-button icon variant="secondary" aria-label="上一页">
            <web-ui-icon icon={lucideChevronLeft}></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="下一页">
            <web-ui-icon icon={lucideChevronRight}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">icon 使用 prefix / suffix</span>
        <web-ui-button-group>
          <web-ui-button variant="secondary">
            <web-ui-icon slot="prefix" icon={lucideChevronLeft}></web-ui-icon>
            上一页
          </web-ui-button>
          <web-ui-button variant="secondary">
            下一页
            <web-ui-icon slot="suffix" icon={lucideChevronRight}></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
      </div>

      <div className="flex flex-col items-start gap-2">
        <span className="text-xs text-(--wui-color-text-secondary)">文字与 icon 混排</span>
        <web-ui-button-group>
          <web-ui-button icon variant="secondary" aria-label="上一页">
            <web-ui-icon icon={lucideChevronLeft}></web-ui-icon>
          </web-ui-button>
          <web-ui-button variant="secondary">第 1 / 3 页</web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="下一页">
            <web-ui-icon icon={lucideChevronRight}></web-ui-icon>
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
          <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="下一页">
          <web-ui-icon :icon="lucideChevronRight"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">icon 使用 prefix / suffix</span>
      <web-ui-button-group>
        <web-ui-button variant="secondary">
          <web-ui-icon slot="prefix" :icon="lucideChevronLeft"></web-ui-icon>
          上一页
        </web-ui-button>
        <web-ui-button variant="secondary">
          下一页
          <web-ui-icon slot="suffix" :icon="lucideChevronRight"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">文字与 icon 混排</span>
      <web-ui-button-group>
        <web-ui-button icon variant="secondary" aria-label="上一页">
          <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
        </web-ui-button>
        <web-ui-button variant="secondary">第 1 / 3 页</web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="下一页">
          <web-ui-icon :icon="lucideChevronRight"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideChevronRight } from '@greypan/web-ui/icons'
</script>
```

### 垂直 group

`direction` 决定横排还是竖排，默认 `horizontal`。合法值只有这两个，集合外的值回退成 `horizontal`。

这个属性只决定排列方向，组不改写成员的任何属性。

竖排时最小宽为 `--wui-control-size`（36px），高度由成员撑开。成员仍按 30px 渲染，纯图标成员是 30px 方形、两侧各留 3px；文字成员的标签不折行，可以撑宽轨道。

分割线这时画在成员下方，`--wui-button-group-divider-length` 控制的是宽度。

```tsx
import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-button-group direction="vertical">
      <web-ui-button icon variant="secondary" aria-label="放大">
        <web-ui-icon icon={lucidePlus}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="缩小">
        <web-ui-icon icon={lucideMinus}></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary" aria-label="搜索">
        <web-ui-icon icon={lucideSearch}></web-ui-icon>
      </web-ui-button>
    </web-ui-button-group>
  )
}
```

```vue
<template>
  <web-ui-button-group direction="vertical">
    <web-ui-button icon variant="secondary" aria-label="放大">
      <web-ui-icon :icon="lucidePlus"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="缩小">
      <web-ui-icon :icon="lucideMinus"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="搜索">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
    </web-ui-button>
  </web-ui-button-group>
</template>

<script setup lang="ts">
import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### 成员间距

按钮组没有自己的间距 token：成员间距与玻璃盒子内衬都取主题的 `--wui-space-1`（4px），改一处两者一起变。

写在 `<web-ui-theme>` 之外的祖先上到不了组；写在组宿主自己身上则优先。

分割线不随 `--wui-space-1` 移动：间距调大后它会偏向左边那一枚。

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
        <span className="text-xs text-(--wui-color-text-secondary)">--wui-space-1：12px，分割线不跟随</span>
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
      <span class="text-xs text-(--wui-color-text-secondary)">--wui-space-1：12px，分割线不跟随</span>
      <web-ui-button-group class="[--wui-space-1:12px]">
        <web-ui-button variant="secondary">左</web-ui-button>
        <web-ui-button variant="secondary">中</web-ui-button>
        <web-ui-button variant="secondary">右</web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>
```

### 分隔线

分割线由除末位之外的成员渲染，带 `aria-hidden`；末位成员没有分割线。

短边恒为 1px，长边取 `--wui-button-group-divider-length`（默认 20px）：横排控制高度，竖排控制宽度；颜色取全局 `--wui-color-border`。

写在组宿主上一个 class 即可；写在某一枚成员上只影响它自己右侧（或下方）那一条。

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
            <web-ui-icon icon={lucidePlus}></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="secondary" aria-label="缩小">
            <web-ui-icon icon={lucideMinus}></web-ui-icon>
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
          <web-ui-icon :icon="lucidePlus"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="缩小">
          <web-ui-icon :icon="lucideMinus"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { lucideMinus, lucidePlus } from '@greypan/web-ui/icons'
</script>
```

### 成员事件

组不拦截成员的 `click`，点击原样冒泡过组宿主。

`event.target` 是那一枚成员宿主，所以一个处理函数就能接住整组，用 `data-id` 区分是哪一枚。`data-*` 留在宿主上，可以放心当身份标记。

`disabled` 与 `loading` 的成员照样不产生点击。

入组也不改表单行为：`type="submit"` 的成员仍然提交外层 `<form>`。

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

### 属性

| 名称        | 说明             | 类型                         | 默认值         |
| ----------- | ---------------- | ---------------------------- | -------------- |
| `direction` | 成员的排列方向。 | `'horizontal' \| 'vertical'` | `'horizontal'` |

### Slot

| 名称      | 说明                                                |
| --------- | --------------------------------------------------- |
| `default` | 组内的 `<web-ui-button>` 成员；其他节点也照常投影。 |

### 行为说明

组不持有选中态、值或禁用态，不改写成员的任何属性，也不替成员做排他选择。`direction` 传入集合外的值时回退成 `horizontal`。

成员的 `size` 在组内被忽略，高度统一成 30px；成员被移出组时恢复独立控件的表现（按变体画背景，按自己的 `size` 定高）。

成员的 `click` 原样冒泡出组宿主，`event.target` 是那一枚成员宿主。

组件自己不派发任何自定义事件，也没有 `disabled` / `required` 之类的组级状态：整组禁用要靠祖先 `<fieldset disabled>`（成员的表单级禁用一起生效）或逐枚写。

分割线由非末尾成员渲染，带 `aria-hidden`；成员增删或顺序变化后分割线与末位判定会自动重算。

### 布局

宿主是 inline-block，玻璃盒子是 flex：横排为 `row`、宽 `max-content`、高 `var(--wui-control-size)`（36px）；竖排改为 `column`，宽度至少 `--wui-control-size`，高度由内容撑开，内衬转到上下。

两个方向都居中对齐，成员间距与盒子内衬同取 `--wui-space-1`（4px），整体圆角取 `--wui-radius-control`（胶囊）。

`--wui-control-size` 决定组的宽高，但不能决定成员高度：成员固定 30px，所以 36px 的盒子里上下各留 3px。

### CSS 自定义属性

| 名称                                | 说明                                                             | 默认值 |
| ----------------------------------- | ---------------------------------------------------------------- | ------ |
| `--wui-button-group-divider-length` | 相邻成员之间分割线的长边；短边恒为 1px，横排给高度、竖排给宽度。 | `20px` |
