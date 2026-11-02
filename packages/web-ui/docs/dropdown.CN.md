# Dropdown

dropdown menu：`trigger` 插槽放 trigger，其余子元素作为 menu item 渲染进 overlay panel，支持 divider、分组标题与多级 submenu。

## Samples

### Basic

`trigger` 放可交互元素，其余子元素作为 menu item 在打开时迁入 overlay panel；`divider` 分组，`disabled` 的项留在列表里但选不中。

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

`prefix` / `suffix` 插槽装饰 menu item 两侧，`dropdown-header` 给一组项加标题；快捷键只是文本，组件不解析按键。

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

在 menu item 上写 `submenu`，嵌套在它里面的 item 成为下一级；悬停或方向键进入，每一级都是独立的 panel。

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

### Controlled open state

`open` 由页面持有：外部按钮直接改它，trigger、Escape 与点外面通过 `open-change` 回写；menu item 点击不会自动关闭，代码在 item 的原生 click 里回写。

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

`placement` 默认 `bottom-start`；空间不够时 panel 会自动翻转或平移。

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

`openMenu()` 打开、`closeAll()` 关闭全部层级；两者都是命令式入口，不派发 `open-change`。`disabled` 会同时挡掉 trigger 点击与 `openMenu()`。

```tsx
import type { WebUiDropdown } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const menu = useRef<WebUiDropdown>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => menu.current?.openMenu()}>
          调用 openMenu()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => menu.current?.closeAll()}>
          调用 closeAll()
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
      <web-ui-button variant="secondary" @click="menu?.openMenu()">调用 openMenu()</web-ui-button>
      <web-ui-button variant="secondary" @click="menu?.closeAll()">调用 closeAll()</web-ui-button>
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

| 名称             | 说明                              | 类型        | 默认值           |
| ---------------- | --------------------------------- | ----------- | ---------------- |
| `open`           | menu 可见性。                     | `boolean`   | `false`          |
| `disabled`       | 禁用状态。                        | `boolean`   | `false`          |
| `match-width`    | panel 宽度匹配 trigger 宽度。     | `boolean`   | `false`          |
| `no-scroll-lock` | 打开时不锁定页面滚动。            | `boolean`   | `false`          |
| `placement`      | panel 位置，默认 `bottom-start`。 | `Placement` | `'bottom-start'` |
| `offset`         | 与 trigger 的距离（px）。         | `number`    | `4`              |

### Events

| 名称          | 说明                                  |
| ------------- | ------------------------------------- |
| `open-change` | menu 开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                        |
| --------- | --------------------------- |
| `trigger` | trigger，请放入可交互元素。 |

### Methods

| 名称         | 说明                                                                  |
| ------------ | --------------------------------------------------------------------- |
| `openMenu()` | 打开 menu；命令式打开不派发 `open-change`，并抑制首项的 accent 高亮。 |
| `closeAll()` | 关闭全部层级；命令式关闭不派发 `open-change`。                        |

### 行为说明

menu item：`web-ui-dropdown-item`、`web-ui-dropdown-divider`、`web-ui-dropdown-header`。submenu 在 `web-ui-dropdown-item` 上通过 `submenu` 属性启用。完整键盘导航支持。

### trigger ARIA

`aria-haspopup="menu"`、`aria-expanded` 与 `aria-controls`（指向根 menu panel）回写到 `trigger` slot 的首个 assigned element。trigger slot 请放入可交互元素。
