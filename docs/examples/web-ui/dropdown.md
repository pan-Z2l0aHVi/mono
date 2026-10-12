---
component: dropdown
tag: web-ui-dropdown
---

下拉菜单：`trigger` 插槽放触发器，其余子元素作为菜单项渲染进浮层面板，支持分隔线、分组标题与多级子菜单。

## 示例

### 基础

菜单项从宿主子元素迁移到浮层面板，`trigger` 必须是可交互元素。

```react
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

### 图标与快捷键

`prefix` / `suffix` 插槽装饰菜单项，`dropdown-header` 给一组项加标题。

```react
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

### 多级子菜单

在菜单项上设置 `submenu` 后，嵌套的子菜单项成为它的下一级。

```react
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

| 名称             | 说明                                    |
| ---------------- | --------------------------------------- |
| `open`           | 菜单可见性。                            |
| `disabled`       | 禁用状态。                              |
| `match-width`    | 面板宽度匹配触发器宽度。                |
| `no-scroll-lock` | 打开时不锁定页面滚动。                  |
| `placement`      | Floating UI 位置，默认 `bottom-start`。 |
| `offset`         | 与触发器的距离（px）。                  |

### Events

| 名称          | 说明                                 |
| ------------- | ------------------------------------ |
| `open-change` | 菜单开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                       |
| --------- | -------------------------- |
| `trigger` | 触发器，请放入可交互元素。 |
