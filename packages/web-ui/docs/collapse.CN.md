# Collapse

collapse panel 把 trigger 与内容放在同一个元素里：trigger 放在默认插槽，要收起的内容放在 `content` 插槽。

用户点击 trigger 时，组件先更新 `open`，再派发一次 `open-change`。调用方把 `detail.open` 写回页面状态后，页面状态才与面板一致。

## Samples

### Basic

`open` 是唯一状态源，`content` 插槽放要收起的内容，默认插槽放 trigger。

点击 trigger 时，组件先更新 `open` 再派发 `open-change`，所以 handler 只需要把 `detail.open` 写回页面状态。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          展开详情
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">content 插槽支持任意节点：文字、表单、图片，甚至另一条 collapse。</p>
          </div>
        </div>
      </web-ui-collapse>
      <output className="text-sm text-(--wui-color-text-secondary)">回写后的 open：{String(open)}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        展开详情
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">content 插槽支持任意节点：文字、表单、图片，甚至另一条 collapse。</p>
        </div>
      </div>
    </web-ui-collapse>
    <output class="text-sm text-(--wui-color-text-secondary)">回写后的 open：{{ open }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### Without binding open

组件自己会切换 `open`，所以完全不绑定也能用，只要提供默认插槽与 `content` 插槽。静态写 `open` 表示初始就展开。挂载时已经是 `open` 的面板直接显示展开状态，不播放进入动画。静态值只在挂载时生效一次，之后组件继续自己切换这个属性，页面不参与。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          初始收起
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">没有绑定 open：点 trigger 由组件自己把属性写到位。</p>
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse open>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          初始展开
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">挂载时已带 open，直接显示展开状态；再点一次才播放收起动画。</p>
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        初始收起
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">没有绑定 open：点 trigger 由组件自己把属性写到位。</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse :open="true">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        初始展开
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">挂载时已带 open，直接显示展开状态；再点一次才播放收起动画。</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>
```

### Trigger types

交互语义来自默认插槽中的元素：原生 `<button>` 与 `<web-ui-button>` 自带 Enter / Space 激活和焦点。组件把 `aria-expanded` 写回默认插槽中的第一个元素，并在 `disabled` 时给该元素加上 `disabled`。

不回写 `aria-controls`：展开关系由 `aria-expanded` 表达，`<web-ui-button>` 会把它同步到实际的 button 元素。

整个默认插槽都是可点击区域，点击任意位置都算一次开合，所以不要把说明文字放进来。

纯文本 trigger 可点击，但不能聚焦、没有键盘激活。

```tsx
import { lucideChevronDown } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          原生 button
        </button>
        <div slot="content">
          <div className="p-3 text-sm">Enter / Space 与焦点都由这个原生 button 自己提供。</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        <web-ui-button variant="secondary" full>
          web-ui-button
        </web-ui-button>
        <div slot="content">
          <div className="p-3 text-sm">
            自定义元素也能当 trigger；展开状态会同步到它内部原生 button，供辅助技术读取。
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        <web-ui-button variant="secondary" full>
          <web-ui-icon slot="prefix" icon={lucideChevronDown} size={14}></web-ui-icon>带 prefix icon 的 trigger
        </web-ui-button>
        <div slot="content">
          <div className="p-3 text-sm">被指派的第一件东西仍然是那个 button；展开状态会同步到它内部原生 button。</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse>
        纯文本 trigger
        <div slot="content">
          <div className="p-3 text-sm">反面写法：鼠标点得动，但不可聚焦、没有键盘激活。</div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        原生 button
      </button>
      <div slot="content">
        <div class="p-3 text-sm">Enter / Space 与焦点都由这个原生 button 自己提供。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      <web-ui-button variant="secondary" full>web-ui-button</web-ui-button>
      <div slot="content">
        <div class="p-3 text-sm">自定义元素也能当 trigger；展开状态会同步到它内部原生 button，供辅助技术读取。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      <web-ui-button variant="secondary" full>
        <web-ui-icon slot="prefix" :icon="lucideChevronDown" :size="14"></web-ui-icon>
        带 prefix icon 的 trigger
      </web-ui-button>
      <div slot="content">
        <div class="p-3 text-sm">被指派的第一件东西仍然是那个 button；展开状态会同步到它内部原生 button。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse>
      纯文本 trigger
      <div slot="content">
        <div class="p-3 text-sm">反面写法：鼠标点得动，但不可聚焦、没有键盘激活。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronDown } from '@greypan/web-ui/icons'
</script>
```

### Disabled

`disabled` 让点击被忽略，并给 trigger 元素加上 `disabled`；取消禁用时移除该 attribute，回到 trigger 原本的禁用状态。它不改变已经展开的面板。`open` 与 `disabled` 同时存在时内容仍然可见，因为 `disabled` 只影响触发，不影响当前状态。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [disabled, setDisabled] = useState(true)

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-checkbox checked={disabled} onChange={event => setDisabled(event.currentTarget.checked)}>
        禁用第一条的 trigger
      </web-ui-checkbox>

      <web-ui-collapse disabled={disabled}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          随开关禁用
        </button>
        <div slot="content">
          <div className="p-3 text-sm">取消勾选就能展开；勾选后点它不动，但这条的内容本来就没展开。</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse open disabled>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          已展开且禁用
        </button>
        <div slot="content">
          <div className="p-3 text-sm">禁用不会把已展开的内容收掉：这条一直可见，点 trigger 无效。</div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-checkbox :checked="disabled" @change="disabled = $event.target.checked">
      禁用第一条的 trigger
    </web-ui-checkbox>

    <web-ui-collapse :disabled="disabled">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        随开关禁用
      </button>
      <div slot="content">
        <div class="p-3 text-sm">取消勾选就能展开；勾选后点它不动，但这条的内容本来就没展开。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse :open="true" disabled>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        已展开且禁用
      </button>
      <div slot="content">
        <div class="p-3 text-sm">禁用不会把已展开的内容收掉：这条一直可见，点 trigger 无效。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const disabled = ref(true)
</script>
```

### Events and methods

`open-change` 只在用户手势后派发，`detail.open` 是组件已经进入的状态。

右边的三个按钮调用元素实例的 `show()` / `close()` / `toggle()`，它们修改同一个 `open`，动画仍然播放，但不派发事件。

```tsx
import type { WebUiCollapse } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const panel = useRef<WebUiCollapse>(null)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('还没有派发')

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button variant="secondary" onClick={() => panel.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => panel.current?.close()}>
          close()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => panel.current?.toggle()}>
          toggle()
        </web-ui-button>
      </div>

      <web-ui-collapse
        ref={panel}
        onopen-change={event => {
          setCount(current => current + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          点击 trigger 开合
        </button>
        <div slot="content">
          <div className="p-3 text-sm">上面三个按钮能让面板开合，却不产生计数。</div>
        </div>
      </web-ui-collapse>

      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{count} 次 · 最后一次 detail.open = {last}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button variant="secondary" @click="panel?.show()">show()</web-ui-button>
      <web-ui-button variant="secondary" @click="panel?.close()">close()</web-ui-button>
      <web-ui-button variant="secondary" @click="panel?.toggle()">toggle()</web-ui-button>
    </div>

    <web-ui-collapse ref="panel" @open-change="onOpenChange">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        点击 trigger 开合
      </button>
      <div slot="content">
        <div class="p-3 text-sm">上面三个按钮能让面板开合，却不产生计数。</div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change：{{ count }} 次 · 最后一次 detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiCollapse, WebUiEvent } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const panel = useTemplateRef<WebUiCollapse>('panel')
const count = ref(0)
const last = ref('还没有派发')

function onOpenChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
```

### Closed state and scroll position

两个示例都停在关闭状态，可见高度都是 0，区别在于内容如何退出。

默认行为下，关闭后内容不渲染，滚动位置随之丢失。`keep-mounted` 时内容保持挂载但不可交互，滚动位置和尺寸都保留；代价是关闭状态的内容仍留在页面中。

`keep-mounted` 不会让关闭状态占用高度。滚动位置在收起后保留；默认行为下再次展开则回到顶部。

```tsx
export default function Demo() {
  const rows = Array.from({ length: 20 }, (_, index) => `列表项 ${index + 1}`)

  return (
    <div className="flex w-full flex-col items-start gap-4 sm:flex-row">
      <web-ui-collapse className="w-full sm:max-w-xs">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          默认关闭状态
        </button>
        <div slot="content">
          <div className="max-h-32 overflow-y-auto p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse keepMounted className="w-full sm:max-w-xs">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          keep-mounted 关闭状态
        </button>
        <div slot="content">
          <div className="max-h-32 overflow-y-auto p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col items-start gap-4 sm:flex-row">
    <web-ui-collapse class="w-full sm:max-w-xs">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        默认关闭状态
      </button>
      <div slot="content">
        <div class="max-h-32 overflow-y-auto p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse keep-mounted class="w-full sm:max-w-xs">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        keep-mounted 关闭状态
      </button>
      <div slot="content">
        <div class="max-h-32 overflow-y-auto p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const rows = Array.from({ length: 20 }, (_, index) => `列表项 ${index + 1}`)
</script>
```

### Peek preview

`peek` 让关闭状态保留固定长度而不是 0，露出的部分用来提示下面还有内容。它的关闭状态行为与 `keep-mounted` 相同：露出的部分同样不可点击，Tab 也进不去，要交互必须先展开。

内容比 `peek` 短时，收起高度就等于内容高度，不留空白。

`peek` 取任何 CSS 长度，写 `rem` 时跟随根字号缩放。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse peek="80px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 80px（内容比它长）
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 8 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：关闭时只露出前 80px，露出的这一截也点不动。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse peek="200px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px（内容比它短）
        </button>
        <div slot="content">
          <div className="p-3 text-sm">内容不足 200px：收起高度取内容实际高度，不会被撑到 200px。</div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse peek="80px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 80px（内容比它长）
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in longRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="200px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px（内容比它短）
      </button>
      <div slot="content">
        <div class="p-3 text-sm">内容不足 200px：收起高度取内容实际高度，不会被撑到 200px。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const longRows = Array.from(
  { length: 8 },
  (_, index) => `段落 ${index + 1}：关闭时只露出前 80px，露出的这一截也点不动。`
)
</script>
```

### Edge fade

露出区域的裁剪边缘有一段透明度渐隐，同一区域还叠加背景模糊，长度根据 `peek` 计算：默认比例为 0.4，上限为 `--wui-collapse-peek-edge-max`（`112px`）。

`--wui-collapse-peek-edge-ratio` 调整渐隐区相对 `peek` 的比例，结果不会超过 `--wui-collapse-peek-edge-max`。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse peek="200px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px · 默认比例 0.4
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 6 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：末端那 80px（200px × 0.4）是渐隐加模糊的区域。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse peek="200px" className="[--wui-collapse-peek-edge-ratio:0.7]">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px · 比例 0.7，被上限夹住
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 6 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：200px × 0.7 = 140px，实际按 112px 上限画。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse peek="200px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px · 默认比例 0.4
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in derivedRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="200px" class="[--wui-collapse-peek-edge-ratio:0.7]">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px · 比例 0.7，被上限夹住
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in cappedRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const derivedRows = Array.from(
  { length: 6 },
  (_, index) => `段落 ${index + 1}：末端那 80px（200px × 0.4）是渐隐加模糊的区域。`
)
const cappedRows = Array.from(
  { length: 6 },
  (_, index) => `段落 ${index + 1}：200px × 0.7 = 140px，实际按 112px 上限画。`
)
</script>
```

### CSS variables

`--wui-collapse-peek-edge` 显式指定渐变长度，覆盖默认值；`--wui-collapse-peek-edge-blur` 是同一区域背景模糊的半径；`--wui-collapse-peek-edge-color` 是裁剪边缘处的渐变起点色（默认页面底色），向内容方向淡到全透明。

`peek` 写成百分比时不产生渐隐；这种写法需要显式设置 `--wui-collapse-peek-edge` 才会出现渐隐区。

```tsx
import type { CSSProperties } from 'react'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse
        peek="160px"
        style={
          {
            '--wui-collapse-peek-edge': '28px',
            '--wui-collapse-peek-edge-blur': '10px'
          } as CSSProperties
        }
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          显式长度 28px · 模糊 10px
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 5 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：渐隐区长度由 token 设为 28px，模糊半径为 10px。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse
        peek="160px"
        style={{ '--wui-collapse-peek-edge-color': 'var(--wui-color-border)' } as CSSProperties}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          边缘颜色取共享 border 色
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 5 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：裁剪边缘的底色换成 border 色，区域从边缘向内淡出。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse
      peek="160px"
      :style="{
        '--wui-collapse-peek-edge': '28px',
        '--wui-collapse-peek-edge-blur': '10px'
      }"
    >
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        显式长度 28px · 模糊 10px
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in blurRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="160px" :style="{ '--wui-collapse-peek-edge-color': 'var(--wui-color-border)' }">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        边缘颜色取共享 border 色
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in edgeColorRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const blurRows = Array.from(
  { length: 5 },
  (_, index) => `段落 ${index + 1}：渐隐区长度由 token 设为 28px，模糊半径为 10px。`
)
const edgeColorRows = Array.from(
  { length: 5 },
  (_, index) => `段落 ${index + 1}：裁剪边缘的底色换成 border 色，区域从边缘向内淡出。`
)
</script>
```

### Horizontal

`horizontal` 把动画轴从高度换成宽度，内容沿宽度展开，trigger 与内容排在同一行。宿主是 block 盒子，需要一行排列时在宿主上添加 flex，例如 `flex items-center gap-2`。

换了动画轴之后 `peek` 也变成宽度，换成 `horizontal` 后渐隐区域落在右边缘。

代价是动画期间内容随宽度变化 reflow。

```tsx
import { radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col items-start gap-4">
      <web-ui-collapse horizontal className="flex items-center gap-2">
        <button
          type="button"
          className="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2"
        >
          <web-ui-icon className="align-[-2px]" icon={radixIconsPanelLeftMinimized} size={14}></web-ui-icon>
          展开侧栏
        </button>
        <div slot="content">
          <div className="w-64 whitespace-nowrap p-3 text-sm">内容区沿宽度展开，trigger 留在同一行。</div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse horizontal peek="120px" className="flex items-center gap-2">
        <button
          type="button"
          className="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2"
        >
          水平 peek
        </button>
        <div slot="content">
          <div className="w-64 whitespace-nowrap p-3 text-sm">关闭时沿宽度露出 120px，渐隐带在右边缘。</div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col items-start gap-4">
    <web-ui-collapse horizontal class="flex items-center gap-2">
      <button type="button" class="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2">
        <web-ui-icon class="align-[-2px]" :icon="radixIconsPanelLeftMinimized" :size="14"></web-ui-icon>
        展开侧栏
      </button>
      <div slot="content">
        <div class="w-64 whitespace-nowrap p-3 text-sm">内容区沿宽度展开，trigger 留在同一行。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse horizontal peek="120px" class="flex items-center gap-2">
      <button type="button" class="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2">
        水平 peek
      </button>
      <div slot="content">
        <div class="w-64 whitespace-nowrap p-3 text-sm">关闭时沿宽度露出 120px，渐隐带在右边缘。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'
</script>
```

### Nested

内层 collapse 放在外层的 `content` 插槽里。展开内层时，外层高度随内容增加。

两条折叠互不干扰，点击内层 trigger 不会同时开合外层。

但 `open-change` 带有 `bubbles` 和 `composed`，内层的通知会经过外层宿主，所以外层绑定 handler 时要按 `event.target === event.currentTarget` 过滤，否则内层开合会被当成外层开合。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [outer, setOuter] = useState(false)
  const [inner, setInner] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse
        open={outer}
        onopen-change={event => {
          // 内层的 open-change 会冒泡经过外层宿主：只认派发给自己这一条的。
          if (event.target === event.currentTarget) setOuter(event.detail.open)
        }}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          外层 collapse
        </button>
        <div slot="content">
          <div className="p-3">
            <p className="m-0 mb-2 text-sm">外层内容，里面再套一条。</p>
            <web-ui-collapse open={inner} onopen-change={event => setInner(event.detail.open)}>
              <button
                type="button"
                className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
              >
                内层 collapse
              </button>
              <div slot="content">
                <div className="p-3 text-sm">内层展开后外层随之变高，两层各自持有 open。</div>
              </div>
            </web-ui-collapse>
          </div>
        </div>
      </web-ui-collapse>

      <output className="text-sm text-(--wui-color-text-secondary)">
        外层 {String(outer)} · 内层 {String(inner)}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse :open="outer" @open-change="onOuterChange">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        外层 collapse
      </button>
      <div slot="content">
        <div class="p-3">
          <p class="m-0 mb-2 text-sm">外层内容，里面再套一条。</p>
          <web-ui-collapse :open="inner" @open-change="inner = $event.detail.open">
            <button
              type="button"
              class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
            >
              内层 collapse
            </button>
            <div slot="content">
              <div class="p-3 text-sm">内层展开后外层随之变高，两层各自持有 open。</div>
            </div>
          </web-ui-collapse>
        </div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">外层 {{ outer }} · 内层 {{ inner }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiCollapse, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const outer = ref(false)
const inner = ref(false)

function onOuterChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  // 内层的 open-change 会冒泡经过外层宿主：只认派发给自己这一条的。
  if (event.target === event.currentTarget) outer.value = event.detail.open
}
</script>
```

### Multiple instances

三条面板各自持有 `open`，页面用一个数组作为状态源：每条的 `open` 写成「它是否在数组里」，写回使用 `open-change` 的 `detail.open`。勾选「同时只留一条」后，由页面保证互斥。collapse 不负责分组，互斥由调用方管理状态，不是组件属性。

同页多实例各自持有 `open` 与各自的 ARIA 回写，互不干扰。

```tsx
import { useState } from 'react'

const sections = [
  { title: '发货', body: '工作日 18:00 前下单当天发出。' },
  { title: '退换', body: '签收后 7 天内可申请退换。' },
  { title: '发票', body: '下单时勾选发票，电子票 3 个工作日内开出。' }
]

export default function Demo() {
  const [open, setOpen] = useState(['发货'])
  const [exclusive, setExclusive] = useState(true)

  function setAt(title: string, value: boolean) {
    setOpen(current => {
      if (!value) return current.filter(item => item !== title)
      return exclusive ? [title] : [...current, title]
    })
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-checkbox checked={exclusive} onChange={event => setExclusive(event.currentTarget.checked)}>
        同时只留一条
      </web-ui-checkbox>

      {sections.map(item => (
        <web-ui-collapse
          key={item.title}
          open={open.includes(item.title)}
          onopen-change={event => setAt(item.title, event.detail.open)}
        >
          <button
            type="button"
            className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            {item.title}
          </button>
          <div slot="content">
            <div className="p-3 text-sm">{item.body}</div>
          </div>
        </web-ui-collapse>
      ))}

      <output className="text-sm text-(--wui-color-text-secondary)">展开中：{open.join('、') || '一条都没有'}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-checkbox :checked="exclusive" @change="exclusive = $event.target.checked">同时只留一条</web-ui-checkbox>

    <web-ui-collapse
      v-for="item in sections"
      :key="item.title"
      :open="open.includes(item.title)"
      @open-change="setAt(item.title, $event.detail.open)"
    >
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        {{ item.title }}
      </button>
      <div slot="content">
        <div class="p-3 text-sm">{{ item.body }}</div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">展开中：{{ open.join('、') || '一条都没有' }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sections = [
  { title: '发货', body: '工作日 18:00 前下单当天发出。' },
  { title: '退换', body: '签收后 7 天内可申请退换。' },
  { title: '发票', body: '下单时勾选发票，电子票 3 个工作日内开出。' }
]

const open = ref(['发货'])
const exclusive = ref(true)

function setAt(title: string, value: boolean) {
  if (!value) {
    open.value = open.value.filter(item => item !== title)
    return
  }
  open.value = exclusive.value ? [title] : [...open.value, title]
}
</script>
```

### Content height changes

展开高度由内容决定：内容变高或变矮时，面板随之伸缩，加一行、删一行都立即生效。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(true)
  const [rows, setRows] = useState(['第 1 行'])

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button
          variant="secondary"
          onClick={() => setRows(current => [...current, `第 ${current.length + 1} 行`])}
        >
          加一行
        </web-ui-button>
        <web-ui-button
          variant="secondary"
          disabled={rows.length === 1}
          onClick={() => setRows(current => current.slice(0, -1))}
        >
          删一行
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">行数：{rows.length}</output>
      </div>

      <web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          展开着改内容
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button variant="secondary" @click="addRow">加一行</web-ui-button>
      <web-ui-button variant="secondary" :disabled="rows.length === 1" @click="removeRow">删一行</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">行数：{{ rows.length }}</output>
    </div>

    <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        展开着改内容
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(true)
const rows = ref(['第 1 行'])

function addRow() {
  rows.value = [...rows.value, `第 ${rows.value.length + 1} 行`]
}

function removeRow() {
  if (rows.value.length > 1) rows.value = rows.value.slice(0, -1)
}
</script>
```

## API

### Props

| 名称           | 说明                                                                                                          | 类型             | 默认值  |
| -------------- | ------------------------------------------------------------------------------------------------------------- | ---------------- | ------- |
| `open`         | 展开状态，唯一状态源。用户点 trigger 时组件自己把它改到位，再派发 `open-change`；静态写在模板里只决定初始值。 | `boolean`        | `false` |
| `disabled`     | 禁用触发：点击忽略，给 trigger 元素加上 `disabled`；已展开内容保持现状。                                      | `boolean`        | `false` |
| `horizontal`   | 水平方向：沿宽度展开，默认沿高度。                                                                            | `boolean`        | `false` |
| `keep-mounted` | 关闭后内容保持挂载但不可交互，保留滚动位置与尺寸。                                                            | `boolean`        | `false` |
| `peek`         | 关闭时露出的尺寸（CSS 长度，如 `120px`、`6rem`）。设置后行为与 `keep-mounted` 相同。                          | `string \| null` | `null`  |

### Events

| 名称          | 说明                                                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `open-change` | 用户手势开合后的通知：`detail.open` 是组件已经设置的状态，调用方回写 `open` 让页面状态与实际一致。`show()` / `close()` / `toggle()` 与直接写 `open` 都不派发。事件 `bubbles` 且 `composed`，会经过祖先宿主，绑在祖先上要按 `event.target` 过滤。 |

### Slots

| 名称      | 说明                                                                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `default` | trigger。整个 slot 都是可点击区域，点任何一处都算一次开合；`aria-expanded` 回写到插槽中的第一个元素，`disabled` 时给该元素加上 `disabled`。`<web-ui-button>` 会把两者同步到内部 `button`，所以放可交互元素。 |
| `content` | collapse content。关闭态内容不可交互；`keep-mounted` 时保持挂载，`peek` 时露出头部一段。                                                                                                                     |

### Methods

| 名称       | 说明                                                           |
| ---------- | -------------------------------------------------------------- |
| `show()`   | 展开：把 `open` 置为 `true`；程序式变更不派发 `open-change`。  |
| `close()`  | 收起：把 `open` 置为 `false`；程序式变更不派发 `open-change`。 |
| `toggle()` | 按当前 `open` 切换展开 / 收起。                                |

### 行为说明

挂载时已经带 `open` attribute 的面板直接显示展开状态，不播放进入动画；之后的变化才有过渡。展开高度始终由内容决定，内容变高或变矮时，面板随之伸缩。

时长取 `--wui-duration-collapse-enter` / `--wui-duration-collapse-exit`（200ms / 160ms，由 `<web-ui-theme>` 定义）；主题 `motion="reduced"` 或系统 `prefers-reduced-motion` 下不播放动画，直接进入最终状态。

`open-change` 只在用户手势后派发（带有 `bubbles` 和 `composed`）；`show()` / `close()` / `toggle()` 与直接写 `open` 都不派发事件。

不回写不会被回退，但页面状态会与面板不一致。

嵌套时点击互不干扰：内层 trigger 的点击不会同时开合外层。内层的 `open-change` 会经过外层宿主，所以外层绑定监听时要按 `event.target === event.currentTarget` 过滤。

### trigger 语义

交互语义来自默认插槽中的元素：原生 `<button>`、`<web-ui-button>` 或其他可交互元素自带 Enter / Space 激活与焦点。

collapse 把 `aria-expanded` 写回默认插槽中的第一个元素，`disabled` 时给该元素加上 `disabled`；`<web-ui-button>` 会把两者同步到实际的 button 元素。

不回写 `aria-controls`：展开关系由 `aria-expanded` 表达。

trigger 请使用可交互元素：纯 `<span>` 可点击但没有键盘 / 焦点语义。

默认插槽的全部内容都是点击区域：放进默认插槽的说明文字被点击时同样算一次开合。组件只写回插槽中的第一个元素，所以可交互元素要放在最前面。

### 关闭状态语义

关闭后内容默认不渲染，不可见也不可交互，内容自身的滚动位置随之丢失。

`keep-mounted` 让内容保持挂载但不可交互，滚动位置与尺寸都保留；关闭状态的内容仍留在页面中，但不占可见高度。

`peek` 的行为与 `keep-mounted` 相同。开合动画进行中，内容同样不可交互。

### peek 预览

设置 `peek` 后，关闭状态下沿动画轴露出内容的头部 `peek` 长度（`horizontal` 时为宽度），而不是收拢到 0。

它的行为与 `keep-mounted` 相同：内容保持挂载，但全部不可聚焦、不可点击，露出的部分也一样。

内容本身不足 `peek` 时按内容实际尺寸收起，不留空白。

```html
<web-ui-collapse peek="120px">
  <button type="button">点击切换</button>
  <div slot="content">很长的内容：关闭时只露出前 120px</div>
</web-ui-collapse>
```

### 边缘渐隐

露出区域的裁剪边缘有一段透明度渐隐（`horizontal` 时改为右边），同一区域还叠加背景模糊，让被裁掉的部分柔和过渡到背景，而不是直接切断。渐变长度根据 `peek` 计算，没有额外属性可以调整；需要修改时使用 CSS 变量。

比例设为 `0` 即关闭渐隐。`peek` 用 `rem` 时渐变长度跟随根字号缩放。

已知限制：`peek` 取百分比时不会出现渐隐，此时请用 `--wui-collapse-peek-edge` 显式指定长度。

```html
<!-- 调强渐隐：比例 0.5 → 120px peek 配 60px 渐隐 -->
<web-ui-collapse peek="120px" style="--wui-collapse-peek-edge-ratio: 0.5">
  <button type="button">点击切换</button>
  <div slot="content">很长的内容：120px 露出区域的底部渐隐更强</div>
</web-ui-collapse>
```

### CSS Custom Properties

| 名称                             | 说明                                       | 默认值                        |
| -------------------------------- | ------------------------------------------ | ----------------------------- |
| `--wui-collapse-peek-edge-ratio` | 渐变长度占 `peek` 的比例                   | `0.4`                         |
| `--wui-collapse-peek-edge-max`   | 长度上限，避免大 `peek` 算出过长的模糊区域 | `112px`                       |
| `--wui-collapse-peek-edge`       | 显式指定长度，覆盖默认计算值               | —                             |
| `--wui-collapse-peek-edge-color` | 裁剪边缘处的渐变起点色                     | `var(--wui-color-page, #fff)` |
| `--wui-collapse-peek-edge-blur`  | 同一渐变区域的背景模糊半径                 | `4px`                         |

### 已知限制

`horizontal` 动画期间内容随宽度变化 reflow。
