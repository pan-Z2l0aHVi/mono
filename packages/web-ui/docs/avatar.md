---
component: avatar
tag: web-ui-avatar
---

avatar，按 `src` 画图片；没有图片或图片加载失败时回退到 `name` 的首字母，`name` 也留空时回退到默认图标。

## 示例

### 图片 {#image}

`src` 是图片 URL，`alt` 同时给出图片替代文本与无障碍名称，`size` 决定头像边长（px）。

```tsx
// 示例图是一段内联 SVG：语料不带二进制素材，也不依赖网络。
const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%234f46e5'/%3E%3Ccircle cx='48' cy='56' r='22' fill='%23c7d2fe'/%3E%3Ccircle cx='48' cy='92' r='26' fill='%23a5b4fc'/%3E%3C/svg%3E"

export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar src={photo} alt="Grey" size={40}></web-ui-avatar>
      <web-ui-avatar src={photo} alt="Grey" size={56}></web-ui-avatar>
      <web-ui-avatar src={photo} alt="Grey" size={80}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar :src="photo" alt="Grey" :size="40"></web-ui-avatar>
    <web-ui-avatar :src="photo" alt="Grey" :size="56"></web-ui-avatar>
    <web-ui-avatar :src="photo" alt="Grey" :size="80"></web-ui-avatar>
  </div>
</template>

<script setup lang="ts">
// 示例图是一段内联 SVG：语料不带二进制素材，也不依赖网络。
const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%234f46e5'/%3E%3Ccircle cx='48' cy='56' r='22' fill='%23c7d2fe'/%3E%3Ccircle cx='48' cy='92' r='26' fill='%23a5b4fc'/%3E%3C/svg%3E"
</script>
```

### 首字母回退 {#initials}

没有 `src` 时不画图片，改从 `name` 取首字母：按空白切词、最多取前两词，各取第一个字符再转大写，所以 `Grey Pan` 是 GP、`Ada` 只有 A、`John Michael Doe` 截到 JM。`name` 同时充当无障碍名称。

```tsx
export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar name="Grey Pan" size={56}></web-ui-avatar>
      <web-ui-avatar name="Ada" size={56}></web-ui-avatar>
      <web-ui-avatar name="John Michael Doe" size={56}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar name="Grey Pan" :size="56"></web-ui-avatar>
    <web-ui-avatar name="Ada" :size="56"></web-ui-avatar>
    <web-ui-avatar name="John Michael Doe" :size="56"></web-ui-avatar>
  </div>
</template>
```

### 图标回退 {#icon-fallback}

`src` 与 `name` 都留空、`default` 插槽也空着时，回退到内置的 `<web-ui-icon>` 人形图标。它没有名字可播报，于是整个头像按装饰性内容处理（见下面的行为说明）。

```tsx
export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar size={40}></web-ui-avatar>
      <web-ui-avatar size={56}></web-ui-avatar>
      <web-ui-avatar size={80}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar :size="40"></web-ui-avatar>
    <web-ui-avatar :size="56"></web-ui-avatar>
    <web-ui-avatar :size="80"></web-ui-avatar>
  </div>
</template>
```

### 尺寸 {#sizes}

`size` 是唯一尺寸旋钮：它写成方盒的内联宽高，并同步成 `--wui-avatar-size` 供影子内部取值，圆形档的高光圆角按它的一半算（方形档固定 12px）。

回退内容跟着它走：首字母字号取 `size` 的 40%，默认图标按同一比例取整。

图片按 `object-fit: cover` 裁进这个方盒，长宽比不一致时居中裁切而不是拉伸。

```tsx
export default function Demo() {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <web-ui-avatar name="S" size={24}></web-ui-avatar>
      <web-ui-avatar name="M" size={32}></web-ui-avatar>
      <web-ui-avatar name="L" size={40}></web-ui-avatar>
      <web-ui-avatar name="XL" size={56}></web-ui-avatar>
      <web-ui-avatar name="XXL" size={80}></web-ui-avatar>
      <web-ui-avatar name="Huge" size={120}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap items-end gap-4">
    <web-ui-avatar name="S" :size="24"></web-ui-avatar>
    <web-ui-avatar name="M" :size="32"></web-ui-avatar>
    <web-ui-avatar name="L" :size="40"></web-ui-avatar>
    <web-ui-avatar name="XL" :size="56"></web-ui-avatar>
    <web-ui-avatar name="XXL" :size="80"></web-ui-avatar>
    <web-ui-avatar name="Huge" :size="120"></web-ui-avatar>
  </div>
</template>
```

### 方形 {#square}

`shape="square"` 把圆角收到 12px 的方块，图片、首字母与默认图标三种内容共用这一档形状。非法值不参与渲染，会被规范回 `circle`。

```tsx
// 示例图是一段内联 SVG：语料不带二进制素材，也不依赖网络。
const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%234f46e5'/%3E%3Ccircle cx='48' cy='56' r='22' fill='%23c7d2fe'/%3E%3Ccircle cx='48' cy='92' r='26' fill='%23a5b4fc'/%3E%3C/svg%3E"

export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar src={photo} alt="Grey" shape="square" size={56}></web-ui-avatar>
      <web-ui-avatar name="Grey Pan" shape="square" size={56}></web-ui-avatar>
      <web-ui-avatar shape="square" size={56}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar :src="photo" alt="Grey" shape="square" :size="56"></web-ui-avatar>
    <web-ui-avatar name="Grey Pan" shape="square" :size="56"></web-ui-avatar>
    <web-ui-avatar shape="square" :size="56"></web-ui-avatar>
  </div>
</template>

<script setup lang="ts">
// 示例图是一段内联 SVG：语料不带二进制素材，也不依赖网络。
const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' fill='%234f46e5'/%3E%3Ccircle cx='48' cy='56' r='22' fill='%23c7d2fe'/%3E%3Ccircle cx='48' cy='92' r='26' fill='%23a5b4fc'/%3E%3C/svg%3E"
</script>
```

### 加载失败 {#error}

图片 `error` 之后组件按回退处理：有 `name` 就出首字母，没有就出默认图标，不会留下破图。回退判定按 `src` 生效——换掉 `src` 时上一次的失败记录会被清掉。

```tsx
export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar src="/avatars/missing.png" name="Grey Pan" size={56}></web-ui-avatar>
      <web-ui-avatar src="/avatars/missing.png" size={56}></web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar src="/avatars/missing.png" name="Grey Pan" :size="56"></web-ui-avatar>
    <web-ui-avatar src="/avatars/missing.png" :size="56"></web-ui-avatar>
  </div>
</template>
```

### 自定义降级内容 {#slot}

`default` 插槽用来替换首字母或默认图标，例如用工号、等级标记填上这个位置。插槽内容按元素子节点判定，只要有一个元素就生效，并且优先于 `name`。

```tsx
export default function Demo() {
  return (
    <div className="flex items-center gap-4">
      <web-ui-avatar size={56}>
        <span className="text-sm font-bold text-(--wui-color-accent)">VIP</span>
      </web-ui-avatar>

      <web-ui-avatar name="Grey Pan" size={56}>
        <span className="text-lg">客</span>
      </web-ui-avatar>
    </div>
  )
}
```

```vue
<template>
  <div class="flex items-center gap-4">
    <web-ui-avatar :size="56">
      <span class="text-sm font-bold text-(--wui-color-accent)">VIP</span>
    </web-ui-avatar>

    <web-ui-avatar name="Grey Pan" :size="56">
      <span class="text-lg">客</span>
    </web-ui-avatar>
  </div>
</template>
```

## API

### Props

| 名称    | 说明                                | 类型                   | 默认值     |
| ------- | ----------------------------------- | ---------------------- | ---------- |
| `src`   | 图片 URL；留空或加载失败时回退。    | `string`               | `''`       |
| `alt`   | 图片替代文本。                      | `string`               | `''`       |
| `name`  | 展示名称，用于首字母回退。          | `string`               | `''`       |
| `size`  | avatar 边长（px）。                 | `number`               | `40`       |
| `shape` | 形状：`circle`（默认）或 `square`。 | `'circle' \| 'square'` | `'circle'` |

### Slots

| 名称      | 说明                                       |
| --------- | ------------------------------------------ |
| `default` | 图片加载失败时的降级内容，替代默认首字母。 |

### 行为说明

三种内容互斥，按 `src` → `default` 插槽 → `name` 首字母 → 默认图标的顺序取第一个能画的：`src` 有值且没报过错就画图片；`src` 留空或报 `error` 时进入回退态，回退态里只要 `default` 插槽有元素子节点就不再画首字母与图标，否则按 `name` 出首字母、`name` 也为空时出内置的 `lucideUser`。

`shape` 走字面量白名单：只认 `circle` / `square`，其他值（含空串）回落到 `circle` 并修正宿主 attribute。

`size` 没有这层规范化，它是原样反射的数值属性，`size="abc"` 这类解析不出数值的输入会当 `NaN` 用下去，因此它的取值范围由页面自己保证。

无障碍名按 `alt` → `name` 的顺序取，取到了才声明 `role="img"` 并写 `aria-label`；两个都留空时这块头像按装饰处理，影子节点是 `role="presentation"` 且 `aria-hidden="true"`，屏幕阅读器不会播报它。

所以「只有头像、名字在头像外面」的写法里，这个头像本来就不该被播报。

首字母取自 `name` 的前两个词的第一个字符并转大写。中文这类按空格分不开的名字因此只会取到第一个字（`潘某某` 出「潘」），要两个字就自己把词分开，或者改用 `default` 插槽。字号是 `size` 的 40%，默认图标按同一比例取整，所以小头像不会塞不下字。

### 布局

宿主是 inline-block、`line-height: 0`，方盒由 `size` 定边长，`--wui-avatar-size` 同步写成内联值供影子内部使用。

圆形档的圆角走 `--wui-radius-control`（默认是 pill），方形档是 12px，`--wui-glass-corner-radius` 也跟着这两档走，所以回退态的高光渐变与盒形不会错位。

回退态会挂上 glass 材质，从那里拿到模糊、内描边环与投影；底色使用 `--wui-color-surface-raised`，首字母与默认图标使用 `--wui-color-text`，会随主题切换。图片态只有图片本身。

`default` 插槽的盒是绝对定位铺满整个头像并居中，它不参与「该画什么」的判定，因此给了 `src` 且图片成功加载时插槽内容会叠在图片之上，而不是被藏起来——降级内容和图片是二选一的关系，别同时给。组件没有对外的 CSS 变量旋钮，尺寸与形状都归 `size` / `shape`。
