# Dropdown Item

[English](./dropdown-item.md) | 简体中文

`<web-ui-dropdown>` 与 `<web-ui-context-menu>` 的菜单项。`disabled` 让它留在菜单里但不能选中，键盘导航与悬停都会跳过它。`prefix` / `suffix` 插槽放两端的图标与快捷键提示。`submenu` 把嵌套的子菜单挂到下一级。

它自己不派发对外事件。菜单不读取 `value`；它留给调用方在原生 `click` 里读取。

## 示例

### 基础菜单

菜单项是宿主的子元素，渲染进 overlay 面板。`disabled` 的项仍在列表里，只是无法选中。

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

### 图标和快捷键

`prefix` / `suffix` 是两个装饰插槽。`pl` 设置项的左内边距，用来让纯文本项与带图标的项左对齐。

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

### 含子菜单的选项

`submenu` 把项变成下一级菜单的入口。嵌套在它里面的菜单项成为下一级，右侧显示展开箭头，鼠标悬停或方向键都可以进入。

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

### 自定义尺寸

用 `--wui-dropdown-item-height` 设置菜单项高度，未设置时回退到 `--wui-menu-item-height`（默认 32px）。变量可设置在 dropdown 或单个菜单项上。

```tsx
export default function Demo() {
  return (
    <web-ui-dropdown style={{ '--wui-dropdown-item-height': '44px' }}>
      <web-ui-button slot="trigger">Menu</web-ui-button>
      <web-ui-dropdown-item>Action</web-ui-dropdown-item>
    </web-ui-dropdown>
  )
}
```

```vue
<template>
  <web-ui-dropdown style="--wui-dropdown-item-height: 44px"
    ><web-ui-button slot="trigger">Menu</web-ui-button
    ><web-ui-dropdown-item>Action</web-ui-dropdown-item></web-ui-dropdown
  >
</template>
```

## API

### 属性

| 名称       | 说明                                                                 | 类型      | 默认值  |
| ---------- | -------------------------------------------------------------------- | --------- | ------- |
| `disabled` | 禁用项：留在菜单里但不可选中，键盘导航与悬停跳过它。                 | `boolean` | `false` |
| `pl`       | 项的左内边距，写成 CSS 长度；用来对齐有 / 无 `prefix` 图标的两种项。 | `string`  | `''`    |
| `value`    | 项的标识，由调用方在原生 `click` 里读取；菜单自己不读取。            | `string`  | `''`    |
| `submenu`  | 作为子菜单入口：嵌套的菜单项成为下一级，右侧显示展开箭头。           | `boolean` | `false` |

### Slot

| 名称      | 说明                                                             |
| --------- | ---------------------------------------------------------------- |
| `prefix`  | 文本左侧的图标或标识。                                           |
| `default` | 项的文本；也是子菜单项的宿主位置。                               |
| `suffix`  | 文本右侧的快捷键提示等；`submenu` 为真时这个位置被展开箭头占用。 |

### 方法

| 名称          | 说明                                   |
| ------------- | -------------------------------------- |
| `focusItem()` | 聚焦菜单项；跨组件边界时焦点不会丢失。 |

### 行为说明

角色：`menuitem`。键盘焦点与悬停使用同一档背景加深，文字颜色保持不变。
