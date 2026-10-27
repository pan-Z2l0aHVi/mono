---
component: empty
tag: web-ui-empty
---

empty state 占位：`title` 与 `description` 提供文案，`icon` / `action` 插槽补上图形与操作入口。组件不设 JS 旋钮——图形、文案、留白的尺寸与颜色全部走 `--wui-empty-*` 变量。

## Samples

### Basic

`title` 与 `description` 是两个主要文案位，两个都写就是这套空态最常见的形状。默认图形（`andrsrxn:inbox`）由组件自带，边长与颜色各有一枚变量。

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

### Action area

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

### Slot content

四个插槽换掉整组内容：`icon` 换图形，默认插槽换标题，`description` 换描述，`action` 换操作区。插槽内容覆盖同名属性，所以写了插槽就不必再写 `title` / `description`。多个操作套一层自己的容器，操作区只负责它上方的那段间距。

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

没有 `size` 属性：图形边长、两行字号、颜色与留白是四组独立变量，要一起放大就一起写——只放大图形会留下与字号不匹配的空白。

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

### Overriding one variable at a time

上面的例子按组合给了几套写法，单枚变量也能单独改：`--wui-empty-icon-size` 是盒与图形共用的边长（图形填满盒，两者永远同步），`--wui-empty-content-width` 与两个段间距不参与任何组合，只能靠变量调。

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
| `icon`        | 图形区内容，替代默认 icon。         |
| `default`     | 标题内容，覆盖 `title` 属性。       |
| `description` | 描述内容，覆盖 `description` 属性。 |
| `action`      | 操作区内容，例如主 button。         |

### 行为说明

图形盒与图形同尺寸：不留隐形内边距，图形与标题之间的距离就是 `--wui-empty-title-margin-top`（默认 12px）。

版面各通道互不联动——图形边长、两行字号、颜色、留白各是一组变量。要把空态整体放大，就得同时写几枚；只写 `--wui-empty-icon-size` 会得到一个图形很大、标题很小的空态。

默认图形是 `andrsrxn:inbox`，24×24 画布，描边与填充都用 `currentColor`，所以颜色只由 `color` 决定，`--wui-empty-icon-color` 不会被图形资产里的固定色盖掉。

深浅与色相落在两枚变量上：`--wui-empty-icon-color` 给的是**实色**，淡一档由 `--wui-empty-icon-opacity`（默认 `0.75`）负责。两者不能合并成「带 alpha 的颜色」—— 线框图形的笔画在转角、端点与填底处本来就互相压着，带 alpha 的颜色会在这些重叠处二次合成、局部变深，看着像角上的笔画发黑。group opacity 是整颗图形合成之后一次性施加的，重叠处不起变化。要让图形回到整颗原色，写 `--wui-empty-icon-opacity: 1`。

`--wui-empty-icon-opacity` 只作用于默认图形，`icon` 插槽里的内容不跟着变淡。

三段文案位各自判定：标题段看默认插槽有没有内容、再看 `title`，描述段看 `description` 插槽、再看 `description` 属性，操作区段只认 `action` 插槽。

判的是「有没有内容」而不是「内容画不画得出来」，所以只放一个 `.sr-only` 的 span 也会让那一段照常占位；反过来，图形区不参与这套判定，永远占位——三段文案都空着的空态就只剩图形。

`action` 插槽里的多个元素不会自己排成一排，操作区只负责它上方那段间距。

`icon` 插槽的图形要自己带尺寸：组件只把插槽内容摆进 `--wui-empty-icon-size` 那个盒里居中，不去量它、也不缩放它。默认边长 `40px`，换 `web-ui-icon` 时按同一数值写它的 `size`，或者连 `--wui-empty-icon-size` 一起调。

`title` 复用的是全局 `title` 属性并且会反射回宿主，因此浏览器同时把这段文字当原生 tooltip 在悬停时画出来。不想要这层提示就用默认插槽放标题；这一位的效果是等价的，只是不会被当成 tooltip 文本。

### 尺寸档位

`size` 不是受支持的属性。图形、`min-height`、内边距与两行字号各由一枚变量控制；下面的档位把成组的值一起写出来。

列依次为 档位 / 图形 / `min-height` / 内边距 / 标题 / 描述：

- `40` / `29px` / `171px` / `23px 17px` / `14px` / `13px`
- `56`（默认）/ `40px` / `240px` / `32px 24px` / `16px` / `14px`
- `72` / `51px` / `309px` / `41px 31px` / `16px` / `14px`

### CSS Custom Properties

| 名称                                | 说明                         | 默认值                       |
| ----------------------------------- | ---------------------------- | ---------------------------- |
| `--wui-empty-min-height`            | 最小高度                     | `240px`                      |
| `--wui-empty-padding`               | 内边距                       | `32px 24px`                  |
| `--wui-empty-icon-size`             | 图形边长，盒与图形同尺寸     | `40px`                       |
| `--wui-empty-icon-color`            | 图形颜色（实色，不掺 alpha） | `--wui-color-text-secondary` |
| `--wui-empty-icon-opacity`          | 图形整体深浅                 | `0.75`                       |
| `--wui-empty-content-width`         | 标题/描述/操作区最大宽度     | `480px`                      |
| `--wui-empty-title-margin-top`      | icon 与标题之间的间距        | `12px`                       |
| `--wui-empty-title-font-size`       | 标题字号                     | `16px`                       |
| `--wui-empty-title-color`           | 标题颜色                     | `--wui-color-text`           |
| `--wui-empty-description-font-size` | 描述字号                     | `14px`                       |
| `--wui-empty-description-color`     | 描述颜色                     | `--wui-color-text-secondary` |
| `--wui-empty-action-margin-top`     | 操作区上方的间距             | `20px`                       |
