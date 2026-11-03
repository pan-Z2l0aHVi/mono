# Avatar

avatar，按 `src` 画图片；没有图片或图片加载失败时回退到 `name` 的首字母，`name` 也留空时回退到默认图标。

## Samples

### Image

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

### Initials fallback

没有 `src` 时不画图片，改为从 `name` 取首字母：按空白切词，最多取前两个词，各取第一个字符并转成大写，所以 `Grey Pan` 是 GP、`Ada` 只有 A、`John Michael Doe` 截到 JM。`name` 同时充当无障碍名称。

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

### Icon fallback

`src` 与 `name` 都留空、`default` 插槽也空着时，回退到内置的 `<web-ui-icon>` 人形图标。这个图标没有名字可播报，整个头像因此按装饰性内容处理，详见下面的行为说明。

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

### Sizes

`size` 是唯一的尺寸设置，决定头像边长（px）；回退内容跟着它缩放。

图片按 `object-fit: cover` 裁进这个方盒；长宽比不一致时居中裁切，不会被拉伸。

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

### Square

`shape="square"` 把圆角压在 12px 上限内（实际取 `min(12px, size × 0.25)`，默认 40px 边长时是 10px）的方块，图片、首字母与默认图标三种内容共用这个形状。非法值不参与渲染，会被规范回 `circle`。

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

### Load failure

图片触发 `error` 后，组件按回退处理：有 `name` 就显示首字母，没有就显示默认图标，不会留下破图。回退判定按 `src` 生效：换掉 `src` 时，上一次的失败记录会被清掉。

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

### Custom fallback content

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
| `default` | 图片加载失败时的回退内容，替代默认首字母。 |

### 行为说明

三种内容互斥，按 `src` → `default` 插槽 → `name` 首字母 → 默认图标的顺序取第一个能画的。`src` 有值且没有报过错时画图片；否则进入回退态：`default` 插槽有元素子节点就用它，其次是 `name` 首字母，最后是内置的人形图标。

`shape` 只接受字面量白名单里的值：`circle` / `square`。其他值（含空串）回落到 `circle`，宿主 attribute 也会被修正。

`size` 没有这层规范化。它是原样反射的数值属性，`size="abc"` 这类解析不出数值的输入会按 `NaN` 继续使用，因此取值范围由页面自己保证。

无障碍名按 `alt` → `name` 的顺序取，取到了才声明 `role="img"` 并写 `aria-label`；两个都留空时头像按装饰处理（`role="presentation"`、`aria-hidden="true"`），屏幕阅读器不会播报。

首字母取自 `name` 前两个词的第一个字符，并转成大写。中文这类按空格分不开的名字因此只会取到第一个字（`潘某某` 出「潘」）；要两个字就自己把词分开，或者改用 `default` 插槽。

### 布局

宿主是 inline-block，边长由 `size` 决定；圆形用 pill 圆角，方形用 `min(12px, size × 0.25)`。

回退态是玻璃材质（模糊、内描边环与投影）：底色 `--wui-color-surface-raised`，首字母与默认图标使用 `--wui-color-text`，随主题切换。图片态只有图片本身。

`default` 插槽的盒子铺满整个头像并居中。它不参与「该画什么」的判定，所以给了 `src` 且图片成功加载时，插槽内容会叠在图片之上。回退内容和图片二选一，不要同时提供。组件没有其他样式变量，尺寸与形状都用 `size` / `shape` 设置。
