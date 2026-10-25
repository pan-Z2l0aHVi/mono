---
component: empty
tag: web-ui-empty
---

empty state 占位：`title` 与 `description` 提供文案，`icon` / `action` 插槽补上图形与操作入口，`size` 是唯一缩放旋钮。

## 示例

### 基础 {#basic}

`title` 与 `description` 是两个主要文案位，两个都写就是这套空态最常见的形状。图形区先按 `size` 派生出默认 icon 画出来。

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

### 文案位收起 {#partial}

标题、描述、操作区三段各自按「有没有内容」决定占不占位：只给 `title` 就没有描述行，只给 `description` 就没有标题行，三段都空着时只剩图形区。

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

### 操作区 {#action}

`action` 插槽放恢复入口，它没有对应的属性可写，只认插槽内容。一段空态通常只要一个主操作，按钮再多就该换成下面的组合写法。

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

### 插槽内容 {#slots}

四个插槽换掉整组内容：`icon` 换图形，默认插槽换标题，`description` 换描述，`action` 换操作区。插槽内容覆盖同名属性，所以写了插槽就不必再写 `title` / `description`。多个操作套一层自己的容器，操作区只负责它上方的那段间距。

```tsx
import { lucideSearch } from '@greypan/web-ui/icons'

export default function Demo() {
  return (
    <web-ui-empty size={72}>
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
  <web-ui-empty :size="72">
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

### 尺寸 {#sizes}

`size` 是唯一的缩放旋钮：它一起决定图形盒、`min-height`、内边距与两行文案的字号，所以大空态不是只把 icon 放大。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <web-ui-empty size={40} title="40 的空态"></web-ui-empty>
      <web-ui-empty size={56} title="56 的空态（默认）"></web-ui-empty>
      <web-ui-empty size={72} title="72 的空态"></web-ui-empty>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <web-ui-empty :size="40" title="40 的空态"></web-ui-empty>
    <web-ui-empty :size="56" title="56 的空态（默认）"></web-ui-empty>
    <web-ui-empty :size="72" title="72 的空态"></web-ui-empty>
  </div>
</template>
```

### 长文案 {#long-copy}

标题与描述都按内容宽度换行，长词用 `overflow-wrap: anywhere` 断开，因此一段复制链接或长标识符不会把盒子顶宽，也不会溢出到兄弟段落之外。

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

### CSS 变量 {#css-vars}

八枚 `--wui-empty-*` 始终压在上面：`size` 派生出来的那几项（icon 盒、`min-height`、内边距、两行字号）逐项被覆盖，另外三枚（内容宽度与两个段间距）本来就不随 `size` 动，写变量是改它们的唯一入口。只需要调个别度量时就逐项覆盖，不必回去改 `size`。

注意 `--wui-empty-icon-size` 只改图形盒，默认字形仍按 `size` 派生。

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
        className="[--wui-empty-icon-size:80px] [--wui-empty-title-margin-top:4px]"
        size={40}
        title="图形盒撑到 80px"
        description="字形还是按 size 的 5/7 画，所以图形周围会多出空白。"
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
        className="[--wui-empty-title-font-size:20px] [--wui-empty-description-font-size:12px]"
        title="两个字号也能单独改"
        description="字号默认只有两档台阶，变量始终压在台阶之上。"
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
      class="[--wui-empty-icon-size:80px] [--wui-empty-title-margin-top:4px]"
      :size="40"
      title="图形盒撑到 80px"
      description="字形还是按 size 的 5/7 画，所以图形周围会多出空白。"
    ></web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-content-width:300px] [--wui-empty-action-margin-top:4px]"
      title="内容宽度收到 300px"
      description="标题、描述与操作区共用这一个宽度。"
    >
      <web-ui-button slot="action" variant="secondary">看看间距</web-ui-button>
    </web-ui-empty>

    <web-ui-empty
      class="[--wui-empty-title-font-size:20px] [--wui-empty-description-font-size:12px]"
      title="两个字号也能单独改"
      description="字号默认只有两档台阶，变量始终压在台阶之上。"
    ></web-ui-empty>
  </div>
</template>
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

`size` 是整个空态的单一旋钮：它驱动图标盒与字形、`min-height`、内边距与标题/描述字号，因此大 icon 不再配 medium 留白：

列依次为 size / 字形与图标盒 / min-height / 内边距 块/行 / 标题 / 描述：

- `40` / `29px` / `171px` / `23px/17px` / `14px` / `13px`
- `56` / `40px` / `240px` / `32px/24px` / `16px` / `14px`
- `72` / `51px` / `309px` / `41px/31px` / `16px` / `14px`

派生规则是 `min-height: round(size * 30 / 7)`、`padding-block: round(size * 4 / 7)`、`padding-inline: round(size * 3 / 7)`、默认字形 `round(size * 5 / 7)`。图标盒与字形同尺寸：底色退役后不再留隐形内边距，图形与标题之间的距离就是 `--wui-empty-title-margin-top`。

字号只有一档台阶而不是连续缩放：低于 `56` 时标题 `14px`、描述 `13px`，`56` 及以上为 `16px` 与 `14px`。更大的空态靠留白撑开，而不是靠字变大。

`size` 只认有限正数：`NaN`、±Infinity、`0`、负数以及 `size="abc"` 这类解析不出数值的输入都整体回落到默认边长 `56`，整套派生度量跟着一起回到默认档，而不是按 `NaN` 算出失效值。

每一项都覆盖 `size` 派生的值，因此八个属性始终优先——包括两个字号。默认值取默认 `size` 为 `56` 时的取值。

三段文案位各自判定：标题段看默认插槽有没有内容、再看 `title`，描述段看 `description` 插槽、再看 `description` 属性，操作区段只认 `action` 插槽。

判的是「有没有内容」而不是「内容画不画得出来」，所以只放一个 `.sr-only` 的 span 也会让那一段照常占位；反过来，图形区不参与这套判定，永远占位——三段文案都空着的空态就只剩图形。

`action` 插槽里的多个元素不会自己排成一排，操作区只负责它上方那段间距。

`icon` 插槽的图形要自己带尺寸：默认图形的边长是按 `size` 派生的 `round(size * 5 / 7)`，组件不会去量插槽内容，所以换 icon 时按同一比例写它的 `size`（`size={40}` 配 29、`72` 配 51），或者干脆连 `--wui-empty-icon-size` 一起调。

`title` 复用的是全局 `title` 属性并且会反射回宿主，因此浏览器同时把这段文字当原生 tooltip 在悬停时画出来。不想要这层提示就用默认插槽放标题；这一位的效果是等价的，只是不会被当成 tooltip 文本。

### 从 'small' | 'medium' | 'large' 枚举迁移

`size` 现在是数字。被删除的档位是手调值，这套比例只能逼近而复现不了——`small` 原本是 `160px` 高、`20px 16px` 内边距，`large` 原本是 `320px` 与 `48px 32px`。段间距与内容宽度从未跟随档位。

列依次为 旧值 / 新值 / 默认字形：

- `small` / `40` / `29`
- `medium` / `56` / `40`
- `large` / `72` / `51`

### CSS Custom Properties

| 名称                                | 说明                                  | 默认值      |
| ----------------------------------- | ------------------------------------- | ----------- |
| `--wui-empty-min-height`            | 最小高度                              | `240px`     |
| `--wui-empty-padding`               | 内边距                                | `32px 24px` |
| `--wui-empty-icon-size`             | icon 盒尺寸，优先于 `size` 派生的字形 | `40px`      |
| `--wui-empty-content-width`         | 标题/描述/操作区最大宽度              | `480px`     |
| `--wui-empty-title-margin-top`      | icon 与标题之间的间距                 | `16px`      |
| `--wui-empty-title-font-size`       | 标题字号                              | `16px`      |
| `--wui-empty-description-font-size` | 描述字号                              | `14px`      |
| `--wui-empty-action-margin-top`     | 操作区上方的间距                      | `20px`      |
