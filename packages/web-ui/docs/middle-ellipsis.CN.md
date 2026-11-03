# Middle Ellipsis

单行中间省略：保留首尾，去掉中间，例如 `very-long-file-…-abcdefghij.txt`。切点一律落在字素簇边界上，不会劈开代理对、组合符序列或 ZWJ emoji。

## Samples

### Keep both ends

`text-overflow: ellipsis` 只保住头部，长文件名因此丢掉真正区分它们的扩展名。中间省略把头尾都留下。两种写法都要求单行，并且有确定的行内尺寸。

```tsx
const FILENAME = 'very-long-file-name-abcdefghij.txt'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">text-overflow: ellipsis</div>
        <div className="truncate">{FILENAME}</div>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">web-ui-middle-ellipsis</div>
        <web-ui-middle-ellipsis text={FILENAME}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">text-overflow: ellipsis</div>
      <div class="truncate">{{ FILENAME }}</div>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">web-ui-middle-ellipsis</div>
      <web-ui-middle-ellipsis :text="FILENAME"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const FILENAME = 'very-long-file-name-abcdefghij.txt'
</script>
```

### Mixed CJK and ASCII

汉字与 ASCII 混排时，切点仍落在字素簇边界，不会切出半个字符。第二行用 `marker-position: 80` 把更多空间留给尾部。

```tsx
const CJK_TITLE = '海外增长与留存复盘报告-2026年第二季度终稿-v3-final.docx'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position 默认 50</div>
        <web-ui-middle-ellipsis text={CJK_TITLE}></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: 80</div>
        <web-ui-middle-ellipsis text={CJK_TITLE} marker-position={80}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position 默认 50</div>
      <web-ui-middle-ellipsis :text="CJK_TITLE"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: 80</div>
      <web-ui-middle-ellipsis :text="CJK_TITLE" :marker-position="80"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const CJK_TITLE = '海外增长与留存复盘报告-2026年第二季度终稿-v3-final.docx'
</script>
```

### Long strings without spaces and grapheme clusters

无空格长串同样按宽度切；ZWJ 序列（👩‍💻）与「基字符 + 变体选择符」（⚠️）整簇保留，不会出现半个 emoji 或落单的连接符。两个串写成转义，因为 `U+200D` 与 `U+FE0F` 零宽，字面量读不出来。

```tsx
const NO_SPACE = 'a'.repeat(120)
const CLUSTERS = `${'\u{1F469}\u200D\u{1F4BB}'.repeat(16)}${'\u{26A0}\uFE0F}'.repeat(8)}`

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">无空格长串</div>
        <web-ui-middle-ellipsis text={NO_SPACE}></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">ZWJ 与变体选择符</div>
        <web-ui-middle-ellipsis text={CLUSTERS}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">无空格长串</div>
      <web-ui-middle-ellipsis :text="NO_SPACE"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">ZWJ 与变体选择符</div>
      <web-ui-middle-ellipsis :text="CLUSTERS"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const NO_SPACE = 'a'.repeat(120)
const CLUSTERS = `${'\u{1F469}\u200D\u{1F4BB}'.repeat(16)}${'\u{26A0}\uFE0F}'.repeat(8)}`
</script>
```

### Marker

`marker` 换掉中间的省略号。空串表示确实截断了，只是不给可见信号，完整原文在 `title` 里。

```tsx
const FILENAME = 'very-long-file-name-abcdefghij.txt'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">默认 …</div>
        <web-ui-middle-ellipsis text={FILENAME}></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker 为 [..]</div>
        <web-ui-middle-ellipsis text={FILENAME} marker="[..]"></web-ui-middle-ellipsis>
      </div>
      <div className="w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker 为空串</div>
        <web-ui-middle-ellipsis text={FILENAME} marker=""></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">默认 …</div>
      <web-ui-middle-ellipsis :text="FILENAME"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker 为 [..]</div>
      <web-ui-middle-ellipsis :text="FILENAME" marker="[..]"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker 为空串</div>
      <web-ui-middle-ellipsis :text="FILENAME" marker=""></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const FILENAME = 'very-long-file-name-abcdefghij.txt'
</script>
```

### Marker position

`marker-position` 是标记所在的横向比例，取值 0 到 100，默认 `50`。`0` 只剩头部，等价于末尾省略；`100` 只剩尾部。头部是路径噪声、尾部才是扩展名的场景，取大于 50 的值。

```tsx
const FILENAME = 'very-long-file-name-abcdefghij.txt'
const POSITIONS = [0, 50, 80, 100]

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {POSITIONS.map(position => (
        <div key={position} className="w-48">
          <div className="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: {position}</div>
          <web-ui-middle-ellipsis text={FILENAME} marker-position={position}></web-ui-middle-ellipsis>
        </div>
      ))}
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div v-for="position in POSITIONS" :key="position" class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: {{ position }}</div>
      <web-ui-middle-ellipsis :text="FILENAME" :marker-position="position"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const FILENAME = 'very-long-file-name-abcdefghij.txt'
const POSITIONS = [0, 50, 80, 100]
</script>
```

### Container width

宽度由容器给出，容器变化后重新切分：缩窄截得更狠，放宽则收回截断。两个盒子各带宽度上限，保证宽屏下仍会溢出，也仍能看出截断。

```tsx
const LONG_PATH = 'assets/images/screenshots/2026/06/very-long-file-name-abcdefghij.png'

export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="w-1/3 max-w-48">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">容器宽度的 1/3（上限 192px）</div>
        <web-ui-middle-ellipsis text={LONG_PATH}></web-ui-middle-ellipsis>
      </div>
      <div className="w-1/6 max-w-32">
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">容器宽度的 1/6（上限 128px）</div>
        <web-ui-middle-ellipsis text={LONG_PATH}></web-ui-middle-ellipsis>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full flex-col gap-3">
    <div class="w-1/3 max-w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">容器宽度的 1/3（上限 192px）</div>
      <web-ui-middle-ellipsis :text="LONG_PATH"></web-ui-middle-ellipsis>
    </div>
    <div class="w-1/6 max-w-32">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">容器宽度的 1/6（上限 128px）</div>
      <web-ui-middle-ellipsis :text="LONG_PATH"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const LONG_PATH = 'assets/images/screenshots/2026/06/very-long-file-name-abcdefghij.png'
</script>
```

## API

### Props

| 名称              | 说明                                                         | 类型     | 默认值 |
| ----------------- | ------------------------------------------------------------ | -------- | ------ |
| `text`            | 完整文本，组件只读不回写。                                   | `string` | `''`   |
| `marker`          | 插在两端之间的标记；空串即截断但不给可见信号。               | `string` | `'…'`  |
| `marker-position` | 标记所在的横向比例，取值 0 到 100；越界夹紧，`NaN` 回落 50。 | `number` | `50`   |

### 行为说明

`marker` 与 `marker-position` 都会同步为 attribute，可以直接从 DOM 读回当前值。屏幕上显示的是切分后拼起来的字符串，`text` 不会反映到渲染结果里。`marker` 收到 `null` / `undefined` 时按 `…` 处理，空串仍是空串；`marker-position` 越界时夹紧，`NaN` 回落为 50。

容器宽度或字体度量变化（例如根字号变化、字体加载完成）时，省略内容会自动重新切分。

只有确实发生截断时，`title` 才会出现在文本元素上；文本放得下之后移除。这是「空标记也算截断」在页面上唯一可见的迹象。

### 标记位置的取值

`marker-position` 越大，留给尾部的空间越多：`0` 等价于末尾省略，`100` 只剩标记与尾部。确切切点取决于字体与容器宽度。

### 合串复核与收敛

标记本身放不下时，组件让标记溢出，由容器裁掉，而不是退回全文。退回全文会把标记挤出盒外，用户连「这里被截断了」的信号都看不到。

宿主宽度由内容决定时（flex 主轴 `auto`，或 `width: fit-content`），截断不会自己一直收窄：当前输出已经放得下就停。

### 已知限制：复制与辅助技术

元素里放的是屏幕上显示的字符串，因此选中复制、读屏与页内查找拿到的都是截断后的文本；完整原文通过 `title` 提供。

宿主需要是 `direction: ltr`；在 `direction: rtl` 下，拼起来的字符串会被双向算法重排。组件没有事件、没有插槽，也不读取任何 `--wui-*` token：字体、字号、颜色、行高全部从宿主继承，外观完全由周围的容器决定。
