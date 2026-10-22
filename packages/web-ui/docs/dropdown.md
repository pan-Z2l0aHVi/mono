---
component: dropdown
tag: web-ui-dropdown
---

dropdown menu：`trigger` 插槽放 trigger，其余子元素作为 menu item 渲染进 overlay panel，支持 divider、分组标题与多级 submenu。

## 示例

### 基础

menu item 从宿主子元素迁移到 overlay panel，`trigger` 必须是可交互元素。

```tsx
<web-ui-dropdown>
  <web-ui-button slot="trigger" variant="secondary">
    操作
  </web-ui-button>
  <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
  <web-ui-dropdown-item>复制</web-ui-dropdown-item>
  <web-ui-dropdown-divider></web-ui-dropdown-divider>
  <web-ui-dropdown-item disabled>删除</web-ui-dropdown-item>
</web-ui-dropdown>
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">操作</web-ui-button>
    <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
    <web-ui-dropdown-item>复制</web-ui-dropdown-item>
    <web-ui-dropdown-divider></web-ui-dropdown-divider>
    <web-ui-dropdown-item disabled>删除</web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

### icon 与快捷键

`prefix` / `suffix` 插槽装饰 menu item，`dropdown-header` 给一组项加标题。

```tsx
<web-ui-dropdown>
  <web-ui-button slot="trigger" variant="secondary">
    文件
  </web-ui-button>
  <web-ui-dropdown-header>编辑</web-ui-dropdown-header>
  <web-ui-dropdown-item>
    <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>复制
    <span slot="suffix" className="opacity-40">
      ⌘C
    </span>
  </web-ui-dropdown-item>
  <web-ui-dropdown-item disabled>
    <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>删除
  </web-ui-dropdown-item>
</web-ui-dropdown>
```

```vue
<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">文件</web-ui-button>
    <web-ui-dropdown-header>编辑</web-ui-dropdown-header>
    <web-ui-dropdown-item>
      <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>复制
      <span slot="suffix" class="opacity-40">⌘C</span>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item disabled>
      <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>删除
    </web-ui-dropdown-item>
  </web-ui-dropdown>
</template>

<script setup lang="ts">
import { lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
</script>
```

### 多级 submenu

在 menu item 上设置 `submenu` 后，嵌套的 submenu item 成为它的下一级。

```tsx
<web-ui-dropdown>
  <web-ui-button slot="trigger" variant="secondary">
    更多
  </web-ui-button>
  <web-ui-dropdown-item value="undo">撤销</web-ui-dropdown-item>
  <web-ui-dropdown-item submenu>
    导出为
    <web-ui-dropdown-item value="pdf">PDF</web-ui-dropdown-item>
    <web-ui-dropdown-item value="png">PNG</web-ui-dropdown-item>
    <web-ui-dropdown-item value="svg">SVG</web-ui-dropdown-item>
  </web-ui-dropdown-item>
</web-ui-dropdown>
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
      <web-ui-dropdown-item value="svg">SVG</web-ui-dropdown-item>
    </web-ui-dropdown-item>
  </web-ui-dropdown>
</template>
```

## API

### Props

| 名称             | 说明                                    | 类型        | 默认值           |
| ---------------- | --------------------------------------- | ----------- | ---------------- |
| `open`           | menu 可见性。                           | `boolean`   | `false`          |
| `disabled`       | 禁用状态。                              | `boolean`   | `false`          |
| `match-width`    | panel 宽度匹配 trigger 宽度。           | `boolean`   | `false`          |
| `no-scroll-lock` | 打开时不锁定页面滚动。                  | `boolean`   | `false`          |
| `placement`      | Floating UI 位置，默认 `bottom-start`。 | `Placement` | `'bottom-start'` |
| `offset`         | 与 trigger 的距离（px）。               | `number`    | `4`              |

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
