---
component: empty
tag: web-ui-empty
---

empty state 占位：`title` 与 `description` 提供文案，`icon` / `action` 插槽补上图形与操作入口，`size` 是唯一缩放旋钮。

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

### 自定义 icon 与操作

`icon` 插槽替换默认图形，`action` 插槽放操作 button；`size` 驱动 icon 盒、留白与字号。

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
| `icon`        | 图形区内容，替代默认 icon。         |
| `default`     | 标题内容，覆盖 `title` 属性。       |
| `description` | 描述内容，覆盖 `description` 属性。 |
| `action`      | 操作区内容，例如主 button。         |

### 行为说明

`size` 是整个空态的单一旋钮：它驱动 icon 盒、`min-height`、内边距与标题/描述字号，因此大 icon 不再配 medium 留白：

列依次为 size / icon 盒 / 字形 / min-height / 内边距 块/行 / 标题 / 描述：

- `40` / `40px` / `17px` / `171px` / `23px/17px` / `14px` / `13px`
- `56` / `56px` / `24px` / `240px` / `32px/24px` / `16px` / `14px`
- `72` / `72px` / `31px` / `309px` / `41px/31px` / `16px` / `14px`

派生规则是 `min-height: round(size * 30 / 7)`、`padding-block: round(size * 4 / 7)`、`padding-inline: round(size * 3 / 7)`，默认字形是 `round(size * 3 / 7)`。

字号只有一档台阶而不是连续缩放：低于 `56` 时标题 `14px`、描述 `13px`，`56` 及以上为 `16px` 与 `14px`。更大的空态靠留白撑开，而不是靠字变大。

每一项都覆盖 `size` 派生的值，因此八个属性始终优先——包括两个字号。默认值取默认 `size` 为 `56` 时的取值。

### 从 'small' | 'medium' | 'large' 枚举迁移

`size` 现在是数字。被删除的档位是手调值，这套比例只能逼近而复现不了——`small` 原本是 `160px` 高、`20px 16px` 内边距，`large` 原本是 `320px` 与 `48px 32px`。段间距与内容宽度从未跟随档位。

列依次为 旧值 / 新值 / 默认字形：

- `small` / `40` / `17`
- `medium` / `56` / `24`
- `large` / `72` / `31`

### CSS Custom Properties

| 名称                                | 说明                         | 默认值      |
| ----------------------------------- | ---------------------------- | ----------- |
| `--wui-empty-min-height`            | 最小高度                     | `240px`     |
| `--wui-empty-padding`               | 内边距                       | `32px 24px` |
| `--wui-empty-icon-size`             | icon 容器尺寸，优先于 `size` | `56px`      |
| `--wui-empty-content-width`         | 标题/描述/操作区最大宽度     | `480px`     |
| `--wui-empty-title-margin-top`      | icon 与标题之间的间距        | `16px`      |
| `--wui-empty-title-font-size`       | 标题字号                     | `16px`      |
| `--wui-empty-description-font-size` | 描述字号                     | `14px`      |
| `--wui-empty-action-margin-top`     | 操作区上方的间距             | `20px`      |
