# Empty

空状态占位：`title` 和 `description` 提供文案，`icon` / `action` 插槽补上图形和操作入口。除 `title` 与 `description` 之外没有其它属性，图形、文案、留白的尺寸和颜色都用 `--wui-empty-*` 变量设置。

## Samples

### Basic

`title` 和 `description` 是两个主要文案位，两个都写是这套空态最常见的用法。默认图形（`andrsrxn:inbox`）随组件提供，边长和颜色各有一枚变量。

```tsx
export default function Demo() {
  return <web-ui-empty title="暂无数据" description="创建第一条记录后，这里会显示列表。"></web-ui-empty>
}
```

```vue
<template>
  <web-ui-empty title="暂无数据" description="创建第一条记录后，这里会显示列表。"></web-ui-empty>
</template>
```

### Collapsing copy slots

标题、描述、操作区三段各自按「有没有内容」决定是否占位。只给 `title` 就没有描述行，只给 `description` 就没有标题行，三段都空着时只剩图形区。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-empty title="没有权限"></web-ui-empty>
      <web-ui-empty description="这一段只有描述，标题位不会占位。"></web-ui-empty>
      <web-ui-empty></web-ui-empty>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-empty title="没有权限"></web-ui-empty>
    <web-ui-empty description="这一段只有描述，标题位不会占位。"></web-ui-empty>
    <web-ui-empty></web-ui-empty>
  </div>
</template>
```

### Action area

`action` 插槽用于放恢复入口。它没有对应的属性可写，只接受插槽内容。一段空态通常只需要一个主操作。

```tsx
export default function Demo() {
  return (
    <web-ui-empty title="没有搜索结果" description="换个关键词，或者把筛选条件放宽一点。">
      <web-ui-button slot="action" variant="primary">
        清空筛选
      </web-ui-button>
    </web-ui-empty>
  )
}
```

```vue
<template>
  <web-ui-empty title="没有搜索结果" description="换个关键词，或者把筛选条件放宽一点。">
    <web-ui-button slot="action" variant="primary">清空筛选</web-ui-button>
  </web-ui-empty>
</template>
```

### Slot content

四个插槽可以替换整组内容：`icon` 替换图形，默认插槽替换标题，`description` 替换描述，`action` 替换操作区。插槽内容会覆盖同名属性，所以写了插槽就不必再写 `title` / `description`。多个操作请自己套一层容器，操作区只负责它上方的那段间距。

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-empty className="[--wui-empty-icon-size:51px]">
      <web-ui-icon slot="icon" icon={lucideSearch} size={51}></web-ui-icon>
      <strong>没有匹配的条目</strong>
      <span slot="description">试试更短的关键词，或者换一个筛选条件。</span>
      <div slot="action" className="flex items-center justify-center gap-3">
        <web-ui-button variant="secondary">清空筛选</web-ui-button>
        <web-ui-button variant="primary">返回列表</web-ui-button>
      </div>
    </web-ui-empty>
  )
}
```

```vue
<template>
  <web-ui-empty class="[--wui-empty-icon-size:51px]">
    <web-ui-icon slot="icon" :icon="lucideSearch" :size="51"></web-ui-icon>
    <strong>没有匹配的条目</strong>
    <span slot="description">试试更短的关键词，或者换一个筛选条件。</span>
    <div slot="action" class="flex items-center justify-center gap-3">
      <web-ui-button variant="secondary">清空筛选</web-ui-button>
      <web-ui-button variant="primary">返回列表</web-ui-button>
    </div>
  </web-ui-empty>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
```

### Size and color

没有 `size` 属性：图形边长、两行字号、颜色和留白是四组独立变量。要整体放大就一起写，只放大图形会留下与字号不匹配的空白。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-empty
        className="[--wui-empty-icon-size:24px] [--wui-empty-title-font-size:14px] [--wui-empty-description-font-size:13px] [--wui-empty-min-height:120px] [--wui-empty-padding:20px_16px]"
        title="紧凑空态"
      ></web-ui-empty>
      <web-ui-empty title="默认空态"></web-ui-empty>
      <web-ui-empty
        className="[--wui-empty-icon-size:64px] [--wui-empty-title-font-size:20px] [--wui-empty-icon-color:var(--wui-color-accent)] [--wui-empty-icon-opacity:1]"
        title="醒目空态"
        description="颜色与深浅是两枚变量：换掉颜色，再让图形回到整颗原色。"
      ></web-ui-empty>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-empty
      class="[--wui-empty-icon-size:24px] [--wui-empty-title-font-size:14px] [--wui-empty-description-font-size:13px] [--wui-empty-min-height:120px] [--wui-empty-padding:20px_16px]"
      title="紧凑空态"
    ></web-ui-empty>
    <web-ui-empty title="默认空态"></web-ui-empty>
    <web-ui-empty
      class="[--wui-empty-icon-size:64px] [--wui-empty-title-font-size:20px] [--wui-empty-icon-color:var(--wui-color-accent)] [--wui-empty-icon-opacity:1]"
      title="醒目空态"
      description="颜色与深浅是两枚变量：换掉颜色，再让图形回到整颗原色。"
    ></web-ui-empty>
  </div>
</template>
```

### Long copy

标题和描述都按内容宽度换行，长词用 `overflow-wrap: anywhere` 断开。因此粘贴的链接或长标识符不会把盒子撑宽，也不会溢出到相邻段落之外。

```tsx
export default function Demo() {
  return (
    <web-ui-empty
      title="这一段标题写得很长，用来确认它在内容宽度里换行而不是把盒子顶宽"
      description="描述同样是一段长文案，里面放一个不会自然断开的长标识符 https://example.com/a-very-long-shared-resource-path-that-does-not-fit，用来看 overflow-wrap 的行为。"
    ></web-ui-empty>
  )
}
```

```vue
<template>
  <web-ui-empty
    title="这一段标题写得很长，用来确认它在内容宽度里换行而不是把盒子顶宽"
    description="描述同样是一段长文案，里面放一个不会自然断开的长标识符 https://example.com/a-very-long-shared-resource-path-that-does-not-fit，用来看 overflow-wrap 的行为。"
  ></web-ui-empty>
</template>
```

### Overriding one variable at a time

单枚变量也能单独修改：`--wui-empty-icon-size` 是盒与图形共用的边长，`--wui-empty-content-width` 和两个段间距只能通过变量调整。

```tsx
export default function Demo() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <web-ui-empty
        className="[--wui-empty-min-height:120px] [--wui-empty-padding:16px_12px]"
        title="压住高度与内边距"
        description="这两枚够把空态从占位块压成一条提示。"
      ></web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-icon-size:56px] [--wui-empty-icon-color:var(--wui-color-accent)]"
        title="图形放大并换色"
        description="只换颜色不碰 opacity，图形仍是默认的淡一档。"
      ></web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-content-width:300px] [--wui-empty-action-margin-top:4px]"
        title="内容宽度收到 300px"
        description="标题、描述与操作区共用这一个宽度。"
      >
        <web-ui-button slot="action" variant="secondary">
          看看间距
        </web-ui-button>
      </web-ui-empty>

      <web-ui-empty
        className="[--wui-empty-title-color:var(--wui-color-accent)] [--wui-empty-description-color:var(--wui-color-text-tertiary)] [--wui-empty-title-font-size:20px]"
        title="标题与描述各自换色"
        description="颜色与字号是四条互不相干的通道。"
      ></web-ui-empty>
    </div>
  )
}
```

```vue
<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <web-ui-empty
      class="[--wui-empty-min-height:120px] [--wui-empty-padding:16px_12px]"
      title="压住高度与内边距"
      description="这两枚够把空态从占位块压成一条提示。"
    ></web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-icon-size:56px] [--wui-empty-icon-color:var(--wui-color-accent)]"
      title="图形放大并换色"
      description="只换颜色不碰 opacity，图形仍是默认的淡一档。"
    ></web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-content-width:300px] [--wui-empty-action-margin-top:4px]"
      title="内容宽度收到 300px"
      description="标题、描述与操作区共用这一个宽度。"
    >
      <web-ui-button slot="action" variant="secondary">看看间距</web-ui-button>
    </web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-title-color:var(--wui-color-accent)] [--wui-empty-description-color:var(--wui-color-text-tertiary)] [--wui-empty-title-font-size:20px]"
      title="标题与描述各自换色"
      description="颜色与字号是四条互不相干的通道。"
    ></web-ui-empty>
  </div>
</template>
```

## API

### Props

| 名称          | 说明       | 类型     | 默认值 |
| ------------- | ---------- | -------- | ------ |
| `title`       | 标题文字。 | `string` | `''`   |
| `description` | 描述文字。 | `string` | `''`   |

### Slots

| 名称          | 说明                                |
| ------------- | ----------------------------------- |
| `icon`        | 图形区内容，替代默认图标。          |
| `default`     | 标题内容，覆盖 `title` 属性。       |
| `description` | 描述内容，覆盖 `description` 属性。 |
| `action`      | 操作区内容，例如主按钮。            |

### 行为说明

图形盒与图形同尺寸，图形与标题之间的距离就是 `--wui-empty-title-margin-top`（默认 12px）。

图形边长、两行字号、颜色和留白各是一组变量，互不联动。要把空态整体放大，就得同时写几枚变量；只写 `--wui-empty-icon-size` 会得到一个图形很大、标题很小的空态。

默认图形是 `andrsrxn:inbox`，颜色只由 `--wui-empty-icon-color` 决定，不会被图形资产里的固定颜色覆盖。

颜色和深浅是两枚变量：`--wui-empty-icon-color` 设置的是实色，更淡的效果由 `--wui-empty-icon-opacity`（默认 `0.75`）负责。要让图形回到完整颜色，写 `--wui-empty-icon-opacity: 1`。

`--wui-empty-icon-opacity` 只作用于默认图形，`icon` 插槽里的内容不会跟着变淡。

三段文案位各自判定：标题段先看默认插槽有没有内容，再看 `title`；描述段先看 `description` 插槽，再看 `description` 属性；操作区段只接受 `action` 插槽。

判断的是「有没有内容」，而不是「内容画不画得出来」，所以只放一个 `.sr-only` 的 span 也会让那一段照常占位。图形区不参与这套判定，永远占位；三段文案都空着时就只剩图形。

`action` 插槽里的多个元素不会自己排成一排，操作区只负责它上方那段间距。

`icon` 插槽的图形要自己带尺寸：组件只把插槽内容摆进 `--wui-empty-icon-size` 那个盒里居中，不去测量它，也不缩放它。默认边长 `40px`，换 `web-ui-icon` 时按同一数值写它的 `size`，或者把 `--wui-empty-icon-size` 一起调整。

`title` 会同时作为原生 tooltip 在悬停时显示。不想要这层提示就用默认插槽放标题，效果等价，只是不会被当成 tooltip 文本。

### 尺寸预设

`size` 不是受支持的属性。图形、`min-height`、内边距和两行字号各由一枚变量控制。下面的预设把成组的值一起写出来。

每行依次是尺寸、图形、`min-height`、内边距、标题字号、描述字号。

- `40` / `29px` / `171px` / `23px 17px` / `14px` / `13px`
- `56`（默认）/ `40px` / `240px` / `32px 24px` / `16px` / `14px`
- `72` / `51px` / `309px` / `41px 31px` / `16px` / `14px`

### CSS Custom Properties

| 名称                                | 说明                       | 默认值                       |
| ----------------------------------- | -------------------------- | ---------------------------- |
| `--wui-empty-min-height`            | 最小高度                   | `240px`                      |
| `--wui-empty-padding`               | 内边距                     | `32px 24px`                  |
| `--wui-empty-icon-size`             | 图形边长，盒与图形同尺寸   | `40px`                       |
| `--wui-empty-icon-color`            | 图形颜色（实色，不含透明） | `--wui-color-text-secondary` |
| `--wui-empty-icon-opacity`          | 图形整体深浅               | `0.75`                       |
| `--wui-empty-content-width`         | 标题/描述/操作区最大宽度   | `480px`                      |
| `--wui-empty-title-margin-top`      | 图标与标题之间的间距       | `12px`                       |
| `--wui-empty-title-font-size`       | 标题字号                   | `16px`                       |
| `--wui-empty-title-color`           | 标题颜色                   | `--wui-color-text`           |
| `--wui-empty-description-font-size` | 描述字号                   | `14px`                       |
| `--wui-empty-description-color`     | 描述颜色                   | `--wui-color-text-secondary` |
| `--wui-empty-action-margin-top`     | 操作区上方的间距           | `20px`                       |
