# Dropdown

dropdown 菜单。`trigger` 插槽放触发器，其余子元素作为菜单项渲染进 overlay 面板；支持分隔线、分组标题与多级子菜单。

## Samples

### Basic

`trigger` 里放可交互元素，其余子元素作为菜单项渲染进 overlay 面板。`divider` 用来分组；`disabled` 的项留在列表里，但无法选中。

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        操作
      </web-ui-button>
      <web-ui-dropdown-item value="edit">编辑</web-ui-dropdown-item>
      <web-ui-dropdown-item value="copy">复制</web-ui-dropdown-item>
      <web-ui-dropdown-item value="paste">粘贴</web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-item value="delete" disabled>
        删除
      </web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">操作</web-ui-button>
    <web-ui-dropdown-item value="edit">编辑</web-ui-dropdown-item>
    <web-ui-dropdown-item value="copy">复制</web-ui-dropdown-item>
    <web-ui-dropdown-item value="paste">粘贴</web-ui-dropdown-item>
    <web-ui-dropdown-divider></web-ui-dropdown-divider>
    <web-ui-dropdown-item value="delete" disabled>删除</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

### Icons and shortcuts

`prefix` / `suffix` 插槽装饰菜单项两侧，`dropdown-header` 给一组项加标题。快捷键只是文本，组件不会解析按键。

```tsx
import { lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        文件
      </web-ui-button>
      <web-ui-dropdown-header>编辑</web-ui-dropdown-header>
      <web-ui-dropdown-item value="copy">
        <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>复制
        <span slot="suffix" className="opacity-40">
          ⌘C
        </span>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item value="delete" disabled>
        <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>删除
        <span slot="suffix" className="opacity-40">
          ⌘⌫
        </span>
      </web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">文件</web-ui-button>
    <web-ui-dropdown-header>编辑</web-ui-dropdown-header>
    <web-ui-dropdown-item value="copy">
      <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>复制
      <span slot="suffix" class="opacity-40">⌘C</span>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item value="delete" disabled>
      <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>删除
      <span slot="suffix" class="opacity-40">⌘⌫</span>
    </web-ui-dropdown-item>
  </web-ui-dropdown>
</template>

<script setup lang="ts">
import { lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
</script>
```

### Multi-level submenu

在菜单项上写 `submenu`，嵌套在它里面的项就成为下一级。悬停或方向键可以进入下一级。

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        文件
      </web-ui-button>
      <web-ui-dropdown-item submenu>
        新建
        <web-ui-dropdown-item submenu>
          办公文档
          <web-ui-dropdown-item value="word">Word 文档</web-ui-dropdown-item>
          <web-ui-dropdown-item value="excel">Excel 表格</web-ui-dropdown-item>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item submenu>
          代码文件
          <web-ui-dropdown-item value="typescript">TypeScript</web-ui-dropdown-item>
          <web-ui-dropdown-item value="python">Python</web-ui-dropdown-item>
        </web-ui-dropdown-item>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item value="export">导出</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">文件</web-ui-button>
    <web-ui-dropdown-item submenu>
      新建
      <web-ui-dropdown-item submenu>
        办公文档
        <web-ui-dropdown-item value="word">Word 文档</web-ui-dropdown-item>
        <web-ui-dropdown-item value="excel">Excel 表格</web-ui-dropdown-item>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item submenu>
        代码文件
        <web-ui-dropdown-item value="typescript">TypeScript</web-ui-dropdown-item>
        <web-ui-dropdown-item value="python">Python</web-ui-dropdown-item>
      </web-ui-dropdown-item>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item value="export">导出</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

### Trigger modes

`trigger` 是手势集合，用空格或逗号分隔，可写 `click`、`hover`、`focus`、`none`，默认 `click`。`hover` 由指针进出开合，指针从触发器移进面板不会收起；`focus` 在键盘聚焦（`:focus-visible`）时展开；手势可以并排写。

`none` 不接受任何手势，也不参与点外面关闭、焦点离开和 Escape；只能由 `open` 属性或 `show()` / `hide()` 控制。`none` 与手势互斥：同时写时按 `none` 处理，并在开发期打印 warning。

`show-delay` / `hide-delay` 只作用于 hover 来源的开合；点击、焦点与程序式调用都立即生效。

```tsx
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-dropdown onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            点击菜单
          </web-ui-button>
          <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
          <web-ui-dropdown-item>复制</web-ui-dropdown-item>
        </web-ui-dropdown>
        <web-ui-dropdown trigger="hover focus" onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            悬停或聚焦
          </web-ui-button>
          <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
          <web-ui-dropdown-item>复制</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-dropdown @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button slot="trigger" variant="secondary">点击菜单</web-ui-button>
        <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
        <web-ui-dropdown-item>复制</web-ui-dropdown-item>
      </web-ui-dropdown>
      <web-ui-dropdown trigger="hover focus" @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button slot="trigger" variant="secondary">悬停或聚焦</web-ui-button>
        <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
        <web-ui-dropdown-item>复制</web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
```

### Controlled open state

`open` 由页面持有。外部按钮直接改它（直接写 `open` 是静默的）；触发器、Escape 与点外面通过 `open-change` 回写。点菜单项不会自动关闭，需要在项的原生 `click` 里回写。

```tsx
import type { WebUiDropdownItem } from '@greypan/web-ui'
import { useCallback, useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState('—')

  // menu item 打开时被迁进 portal panel，React 的 onClick 委托在根容器收不到；这里直接挂原生 click。
  const handleItemRef = useCallback((item: WebUiDropdownItem | null) => {
    if (!item) return
    const element = item
    const close = () => {
      setLast(element.textContent?.trim() || element.value)
      setOpen(false)
    }
    element.addEventListener('click', close)
    return () => element.removeEventListener('click', close)
  }, [])

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => setOpen(value => !value)}>
          {open ? '关闭菜单' : '打开菜单'}
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          状态：{open ? 'open' : 'closed'} · 最近选择：{last}
        </output>
      </div>

      <web-ui-dropdown open={open} onopen-change={event => setOpen(event.detail.open)}>
        <web-ui-button slot="trigger" variant="secondary">
          受控菜单
        </web-ui-button>
        <web-ui-dropdown-item ref={handleItemRef} value="edit">
          编辑
        </web-ui-dropdown-item>
        <web-ui-dropdown-item ref={handleItemRef} value="copy">
          复制
        </web-ui-dropdown-item>
        <web-ui-dropdown-item ref={handleItemRef} value="archive">
          归档
        </web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="open = !open">
        {{ open ? '关闭菜单' : '打开菜单' }}
      </web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        状态：{{ open ? 'open' : 'closed' }} · 最近选择：{{ last }}
      </output>
    </div>

    <web-ui-dropdown :open="open" @open-change="open = $event.detail.open">
      <web-ui-button slot="trigger" variant="secondary">受控菜单</web-ui-button>
      <web-ui-dropdown-item value="edit" @click="select('编辑')">编辑</web-ui-dropdown-item>
      <web-ui-dropdown-item value="copy" @click="select('复制')">复制</web-ui-dropdown-item>
      <web-ui-dropdown-item value="archive" @click="select('归档')">归档</web-ui-dropdown-item>
    </web-ui-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const last = ref('—')

function select(label: string) {
  last.value = label
  open.value = false
}
</script>
```

### Placement

`placement` 默认 `bottom-start`；空间不够时面板会自动翻转或平移。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <web-ui-dropdown placement="bottom-start">
        <web-ui-button slot="trigger" variant="secondary">
          bottom-start（默认）
        </web-ui-button>
        <web-ui-dropdown-item>新建</web-ui-dropdown-item>
        <web-ui-dropdown-item>打开</web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown placement="bottom-end">
        <web-ui-button slot="trigger" variant="secondary">
          bottom-end
        </web-ui-button>
        <web-ui-dropdown-item>新建</web-ui-dropdown-item>
        <web-ui-dropdown-item>打开</web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown placement="top-start">
        <web-ui-button slot="trigger" variant="secondary">
          top-start
        </web-ui-button>
        <web-ui-dropdown-item>新建</web-ui-dropdown-item>
        <web-ui-dropdown-item>打开</web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown placement="top-end">
        <web-ui-button slot="trigger" variant="secondary">
          top-end
        </web-ui-button>
        <web-ui-dropdown-item>新建</web-ui-dropdown-item>
        <web-ui-dropdown-item>打开</web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-start gap-3">
    <web-ui-dropdown placement="bottom-start">
      <web-ui-button slot="trigger" variant="secondary">bottom-start（默认）</web-ui-button>
      <web-ui-dropdown-item>新建</web-ui-dropdown-item>
      <web-ui-dropdown-item>打开</web-ui-dropdown-item>
    </web-ui-dropdown>

    <web-ui-dropdown placement="bottom-end">
      <web-ui-button slot="trigger" variant="secondary">bottom-end</web-ui-button>
      <web-ui-dropdown-item>新建</web-ui-dropdown-item>
      <web-ui-dropdown-item>打开</web-ui-dropdown-item>
    </web-ui-dropdown>

    <web-ui-dropdown placement="top-start">
      <web-ui-button slot="trigger" variant="secondary">top-start</web-ui-button>
      <web-ui-dropdown-item>新建</web-ui-dropdown-item>
      <web-ui-dropdown-item>打开</web-ui-dropdown-item>
    </web-ui-dropdown>

    <web-ui-dropdown placement="top-end">
      <web-ui-button slot="trigger" variant="secondary">top-end</web-ui-button>
      <web-ui-dropdown-item>新建</web-ui-dropdown-item>
      <web-ui-dropdown-item>打开</web-ui-dropdown-item>
    </web-ui-dropdown>
  </div>
</template>
```

### Imperative

`show()` 打开菜单，`hide()` 关闭全部层级。两者都派发 `open-change`。`disabled` 会同时阻止触发器点击与 `show()`。

```tsx
import type { WebUiDropdown } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const menu = useRef<WebUiDropdown>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => menu.current?.show()}>
          调用 show()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => menu.current?.hide()}>
          调用 hide()
        </web-ui-button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <web-ui-dropdown ref={menu}>
          <web-ui-button slot="trigger" variant="secondary">
            命令式菜单
          </web-ui-button>
          <web-ui-dropdown-item value="edit">编辑</web-ui-dropdown-item>
          <web-ui-dropdown-item submenu>
            更多
            <web-ui-dropdown-item value="archive">归档</web-ui-dropdown-item>
          </web-ui-dropdown-item>
        </web-ui-dropdown>

        <web-ui-dropdown disabled>
          <web-ui-button slot="trigger" variant="secondary">
            禁用菜单
          </web-ui-button>
          <web-ui-dropdown-item>不可打开</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="menu?.show()">调用 show()</web-ui-button>
      <web-ui-button variant="secondary" @click="menu?.hide()">调用 hide()</web-ui-button>
    </div>

    <div class="flex flex-wrap items-start gap-3">
      <web-ui-dropdown ref="menu">
        <web-ui-button slot="trigger" variant="secondary">命令式菜单</web-ui-button>
        <web-ui-dropdown-item value="edit">编辑</web-ui-dropdown-item>
        <web-ui-dropdown-item submenu>
          更多
          <web-ui-dropdown-item value="archive">归档</web-ui-dropdown-item>
        </web-ui-dropdown-item>
      </web-ui-dropdown>

      <web-ui-dropdown disabled>
        <web-ui-button slot="trigger" variant="secondary">禁用菜单</web-ui-button>
        <web-ui-dropdown-item>不可打开</web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDropdown } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const menu = useTemplateRef<WebUiDropdown>('menu')
</script>
```

## API

### Props

| 名称             | 说明                                                                                      | 类型        | 默认值           |
| ---------------- | ----------------------------------------------------------------------------------------- | ----------- | ---------------- |
| `open`           | 菜单可见性。                                                                              | `boolean`   | `false`          |
| `disabled`       | 禁用状态。                                                                                | `boolean`   | `false`          |
| `match-width`    | 面板宽度匹配触发器宽度。                                                                  | `boolean`   | `false`          |
| `no-scroll-lock` | 打开时不锁定页面滚动。                                                                    | `boolean`   | `false`          |
| `placement`      | 面板位置，默认 `bottom-start`。                                                           | `Placement` | `'bottom-start'` |
| `offset`         | 与触发器的距离（px）。                                                                    | `number`    | `4`              |
| `trigger`        | 触发手势集合，空格或逗号分隔：`click`、`hover`、`focus`、`none`；读回为逗号分隔的规范串。 | `string`    | `'click'`        |
| `show-delay`     | 悬停打开的延迟（毫秒）；只影响 hover 来源。                                               | `number`    | `200`            |
| `hide-delay`     | 悬停收起的延迟（毫秒）；只影响 hover 来源。                                               | `number`    | `100`            |
| `isOpen`         | 菜单当前是否打开（只读）。                                                                | `boolean`   | —                |

### Events

| 名称          | 说明                                                                                    |
| ------------- | --------------------------------------------------------------------------------------- |
| `open-change` | 手势或 `show()` / `hide()` 改变开合时派发，`detail.open` 是当前状态；写 `open` 不派发。 |

### Slots

| 名称      | 说明                     |
| --------- | ------------------------ |
| `trigger` | 触发器；请放可交互元素。 |

### Methods

| 名称       | 说明                                              |
| ---------- | ------------------------------------------------- |
| `show()`   | 打开菜单并派发 `open-change`；`none` 下同样可用。 |
| `hide()`   | 关闭全部层级并派发 `open-change`。                |
| `toggle()` | 按当前 `open` 切换，并派发 `open-change`。        |

### 行为说明

菜单项：`web-ui-dropdown-item`、`web-ui-dropdown-divider`、`web-ui-dropdown-header`。子菜单在 `web-ui-dropdown-item` 上通过 `submenu` 属性启用。完整键盘导航支持。

菜单能否打开看的是根层还有没有内容可展示：没有菜单项、分隔线或标题（含框架 wrapper 里的）时，点击、键盘手势与悬停都不展开；`hidden` 子树不算内容。`show()` 与写 `open` 仍可空开；关闭态新增内容不会打开菜单。菜单打开期间最后一段内容消失时，立即收起，不播退场过渡。

`hover` 由指针进出开合；指针从触发器移进面板不会收起，离开触发器与面板、且焦点不在其中时按 `hide-delay` 收起。`show-delay` / `hide-delay` 只作用于 hover 来源；点击、焦点与程序式调用都立即生效。Escape、点外面与失焦会收起所有非 `none` 的菜单，不取决于 `trigger` 是否包含 `click` 或 `focus`；`none` 不响应也不拦截它们。

`open` 可以直接赋值；该写入是静默的，不派发 `open-change`。

### trigger ARIA

`aria-haspopup="menu"`、`aria-expanded` 与 `aria-controls`（指向根菜单面板）回写到 `trigger` 插槽的第一个元素。`trigger` 插槽请放可交互元素。
