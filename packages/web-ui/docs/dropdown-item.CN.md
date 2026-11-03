# Dropdown Item

`<web-ui-dropdown>` 与 `<web-ui-context-menu>` 的 menu item。`disabled` 让它留在 menu 里但不能选中，键盘导航与悬停都会跳过它。`prefix` / `suffix` 插槽放两端的 icon 与快捷键提示。`submenu` 把嵌套的 submenu 挂到下一级。

它自己不派发对外事件。menu 不读取 `value`；它留给调用方在原生 `click` 里读取。

## Samples

### Basic menu

menu item 是宿主的子元素，渲染进 overlay panel。`disabled` 的项仍在列表里，只是无法选中。

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        操作
      </web-ui-button>
      <web-ui-dropdown-item value="edit">编辑</web-ui-dropdown-item>
      <web-ui-dropdown-item value="copy">复制</web-ui-dropdown-item>
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
    <web-ui-dropdown-item value="delete" disabled>删除</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

### Icons and shortcuts

`prefix` / `suffix` 是两个装饰插槽。`pl` 设置项的左内边距，用来让纯文本项与带 icon 的项左对齐。

```tsx
import { lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        文件
      </web-ui-button>
      <web-ui-dropdown-item>
        <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>复制
        <span slot="suffix" className="opacity-40">
          ⌘C
        </span>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item disabled>
        <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>删除
      </web-ui-dropdown-item>
      <web-ui-dropdown-item pl="30px">重命名</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">文件</web-ui-button>
    <web-ui-dropdown-item>
      <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>复制
      <span slot="suffix" class="opacity-40">⌘C</span>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item disabled>
      <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>删除
    </web-ui-dropdown-item>
    <web-ui-dropdown-item pl="30px">重命名</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>

<script setup lang="ts">
import { lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
</script>
```

### Items with a submenu

`submenu` 把项变成下一级 menu 的入口。嵌套在它里面的 menu item 成为下一级，右侧显示展开箭头，鼠标悬停或方向键都可以进入。

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown>
      <web-ui-button slot="trigger" variant="secondary">
        更多
      </web-ui-button>
      <web-ui-dropdown-item value="undo">撤销</web-ui-dropdown-item>
      <web-ui-dropdown-item submenu>
        导出为
        <web-ui-dropdown-item value="pdf">PDF</web-ui-dropdown-item>
        <web-ui-dropdown-item value="png">PNG</web-ui-dropdown-item>
      </web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">更多</web-ui-button>
    <web-ui-dropdown-item value="undo">撤销</web-ui-dropdown-item>
    <web-ui-dropdown-item submenu>
      导出为
      <web-ui-dropdown-item value="pdf">PDF</web-ui-dropdown-item>
      <web-ui-dropdown-item value="png">PNG</web-ui-dropdown-item>
    </web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

## API

### Props

| 名称       | 说明                                                                  | 类型      | 默认值  |
| ---------- | --------------------------------------------------------------------- | --------- | ------- |
| `disabled` | 禁用项：留在 menu 里但不可选中，键盘导航与悬停跳过它。                | `boolean` | `false` |
| `pl`       | 项的左内边距，写成 CSS 长度；用来对齐有 / 无 `prefix` icon 的两种项。 | `string`  | `''`    |
| `value`    | 项的标识，由调用方在原生 `click` 里读取；menu 自己不读取。            | `string`  | `''`    |
| `submenu`  | 作为 submenu 入口：嵌套的 menu item 成为下一级，右侧显示展开箭头。    | `boolean` | `false` |

### Slots

| 名称      | 说明                                                             |
| --------- | ---------------------------------------------------------------- |
| `prefix`  | 文本左侧的 icon 或标识。                                         |
| `default` | 项的文本；也是 submenu item 的宿主位置。                         |
| `suffix`  | 文本右侧的快捷键提示等；`submenu` 为真时这个位置被展开箭头占用。 |

### Methods

| 名称          | 说明                                       |
| ------------- | ------------------------------------------ |
| `focusItem()` | 聚焦 menu item；跨组件边界时焦点不会丢失。 |

### 行为说明

角色：`menuitem`。
