---
component: empty
tag: web-ui-empty
---

空状态占位：`title` 与 `description` 提供文案，`icon` / `action` 插槽补上图形与操作入口，`size` 是唯一缩放旋钮。

## 示例

### 基础

`title` 与 `description` 覆盖标题和描述两个主要文案位。

```react
<web-ui-empty title="暂无数据" description="创建第一条记录后这里会显示列表"></web-ui-empty>
```

```vue
<template>
  <web-ui-empty title="暂无数据" description="创建第一条记录后这里会显示列表"></web-ui-empty>
</template>
```

### 自定义图标与操作

`icon` 插槽替换默认图形，`action` 插槽放操作按钮；`size` 驱动图标盒、留白与字号。

```react
<web-ui-empty title="还没有文件" description="上传或新建一个文件开始" size={72}>
  <web-ui-icon slot="icon" icon={lucideFolderOpen} size={31}></web-ui-icon>
  <web-ui-button slot="action" variant="primary">
    新建文件
  </web-ui-button>
</web-ui-empty>
```

```vue
<template>
  <web-ui-empty title="还没有文件" description="上传或新建一个文件开始" :size="72">
    <web-ui-icon slot="icon" :icon="lucideFolderOpen" :size="31"></web-ui-icon>
    <web-ui-button slot="action" variant="primary">新建文件</web-ui-button>
  </web-ui-empty>
</template>

<script setup lang="ts">
import { lucideFolderOpen } from '@greypan/web-ui/icons'
</script>
```

## API

### Props

| 名称          | 说明                                          | 类型     | 默认值 |
| ------------- | --------------------------------------------- | -------- | ------ |
| `title`       | 标题文字。                                    | `string` | `''`   |
| `description` | 描述文字。                                    | `string` | `''`   |
| `size`        | 版面缩放基准（px）；非法值或非正数回落为 56。 | `number` | `56`   |

### Slots

| 名称          | 说明                                |
| ------------- | ----------------------------------- |
| `icon`        | 图形区内容，替代默认图标。          |
| `default`     | 标题内容，覆盖 `title` 属性。       |
| `description` | 描述内容，覆盖 `description` 属性。 |
| `action`      | 操作区内容，例如主按钮。            |
