---
component: dropdown-item
tag: web-ui-dropdown-item
---

`<web-ui-dropdown>` 与 `<web-ui-context-menu>` 的菜单项：`disabled` 让它留在菜单里但不可选中，键盘导航与悬停都会跳过它；`prefix` / `suffix` 插槽放两端的图标与快捷键提示；`submenu` 把嵌套的子菜单挂到它的下一级。它自己不派发对外事件，`value` 也不被菜单消费——那是留给使用方在原生 `click` 里读的标识。

## 示例

### 基础菜单 {#basic}

菜单项是宿主的子元素，打开时被迁移进浮层面板；`disabled` 的项仍在列表里，只是选不中。

```react
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

### 图标与快捷键 {#decorated}

`prefix` / `suffix` 是两个装饰位；`pl` 把左内边距写进项本身，让没有图标的纯文本项与带 14px 图标的项左对齐（8px 内边距 + 14px 图标 + 8px 间隙）。

```react
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

### 带子菜单的项 {#submenu}

`submenu` 把项变成本级菜单的入口：嵌套在它里面的菜单项成为下一级，右侧长出展开箭头，鼠标悬停或方向键都能进入。

```react
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

| 名称       | 说明                                                                 | 类型      | 默认值  |
| ---------- | -------------------------------------------------------------------- | --------- | ------- |
| `disabled` | 禁用项：留在菜单里但不可选中，键盘导航与悬停跳过它。                 | `boolean` | `false` |
| `pl`       | 项的左内边距，写成 CSS 长度；用来对齐有 / 无 `prefix` 图标的两种项。 | `string`  | `''`    |
| `value`    | 项的标识，由使用方在原生 `click` 里读取；菜单自己不消费。            | `string`  | `''`    |
| `submenu`  | 作为子菜单入口：嵌套的菜单项成为下一级，右侧显示展开箭头。           | `boolean` | `false` |

### Slots

| 名称      | 说明                                                           |
| --------- | -------------------------------------------------------------- |
| `prefix`  | 文本左侧的图标或标识。                                         |
| `default` | 项的文本；也是子菜单项的宿主位置。                             |
| `suffix`  | 文本右侧的快捷键提示等；`submenu` 为真时这一位被展开箭头占用。 |

### Methods

| 名称          | 说明                                                     |
| ------------- | -------------------------------------------------------- |
| `focusItem()` | 聚焦菜单项：通过可见元素聚焦，跨 Shadow DOM 时不丢焦点。 |

### 行为说明

角色：`menuitem`。
