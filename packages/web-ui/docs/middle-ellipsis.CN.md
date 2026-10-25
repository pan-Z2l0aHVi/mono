---
component: middle-ellipsis
tag: web-ui-middle-ellipsis
---

单行中间省略：保留首尾、丢掉中间，`very-long-file-…-abcdefghij.txt`。切点一律落在字素簇边界上，不会劈开代理对、组合符序列或 ZWJ emoji。

## Samples

### 保留首尾 {#basic}

两行是**同一串文本**，区别只在截断的机制。`text-overflow: ellipsis` 只能保住头部，长文件名因此丢掉真正区分它们的扩展名；中间省略把省略号放到中间，头尾都留着。两种写法都需要单行、且有确定的行内尺寸。

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

### 中英混排 {#cjk}

汉字与 ASCII 混在一串里是常态：头部是中文标题、尾部是扩展名。汉字每个都是整宽的一个字素簇，切点因此一次挪动一格，不会切出半个字符。两行是同一串文本，第二行取 `marker-position: 80` 把额度让给尾部。

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

### 长无空格串与字素簇 {#clusters}

第一行是 120 个没有空格的 `a`：不换行，按实测宽度切到刚好放得下。

第二行整行都是 ZWJ 序列（👩‍💻 = `U+1F469 U+200D U+1F4BB`）与「基字符 + 变体选择符」（⚠️ = `U+26A0 U+FE0F`），无论切在哪里都应当整簇保留，不会出现半个 emoji 或落单的连接符。

两个串都写成转义：`U+200D` 与 `U+FE0F` 零宽，字面量丢了读不出来。

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

### 标记 {#marker}

`marker` 换掉中间那个省略号。第三行的 `marker` 是空串：确实截断了，只是不给任何可见信号——把鼠标移上去，`title` 里是完整的原文。

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

### 标记位置 {#marker-position}

`marker-position` 是标记所在的横向比例，0–100，默认 `50`：`0` 只剩头部（等价于末尾省略），`100` 只剩尾部。头部是路径噪声、尾部才是扩展名的场景取大于 50 的值。

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

### 容器宽度 {#container}

宽度由容器给出，容器变化后重算：缩窄截得更狠，放宽则收回截断。下面两个盒子是百分比宽度，各自带一个上限——上限保证在宽屏上也仍然溢出，否则窗口够宽时整串放得下，盒子里就什么都看不到了。拖动窗口宽度可以看到两行跟着重切。

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

| 名称              | 说明                                                | 类型     | 默认值 |
| ----------------- | --------------------------------------------------- | -------- | ------ |
| `text`            | 完整文本，组件只读不回写。                          | `string` | `''`   |
| `marker`          | 插在两端之间的标记；空串即截断但不给可见信号。      | `string` | `'…'`  |
| `marker-position` | 标记所在的横向比例 0–100；越界夹紧，`NaN` 回落 50。 | `number` | `50`   |

### 行为说明

`marker` 与 `marker-position` 都 reflect，DOM 上能直接读回当前值；`text` 不 reflect 到渲染结果里——屏幕上那串是切出来的合串，不是 `text`。

三个属性里只有 `text` 是 `@property` 直接字段，另两个走 setter 做归一化：`marker` 把 `null` / `undefined` 落成 `…`（空串照旧是空串），`marker-position` 走 `normalizeNumber(value, 0, 100, 50)`，越界夹紧、`NaN` 回落 50。

宽度口径：`ElementWidthController` 观察的是**宿主**，取 `contentRect.width`（分数），不是整数 `clientWidth`——差的那半个像素足以让二分挑错最后一个字素簇。

属性刚改完、观察者的回调还没到的那一帧，用 `.root` 的 `clientWidth` 同步补测一次，免得先按全文画一帧再切。

量到宽度 ≤ 0（宿主还没布局、或 jsdom）时什么都不做，并且留着「有未落的拟合」这个标记，等它重新有布局再切。

重新测量：容器宽度变化会触发重新切分。

字体度量变化也会重新测量——全文量具尺寸变化（例如根字号变化）由 `ResizeObserver` 发现；字体加载完成事件（`document.fonts` 的 `loadingdone`）会补上全文总宽不变但字形宽度重新分布的情况。组件断连后停止监听，重连时按当前布局重新拟合。

更新时序：`willUpdate` 先把显示退回全文（上一版的切分是按旧文本算的，拿它渲染新文本会显示一段两个版本都不属于的串），`updated()` 再把真正的重切排进微任务——同一帧渲染之前完成，用户看不到那个全文中间态。

`title` 只在**确实截断**时挂在文本元素上，放得下之后移除；这就是「空标记也算截断了」唯一的可见证据。

### 标记位置的取值

文件名场景靠 `marker-position` 调节。两端额度是 `(1 - p)` 与 `p` 乘上「可用宽度减掉标记实宽」，再各自用「前 i 簇 / 后 i 簇」的实测宽度二分逼近。下面是示意而非可复现的取值——确切切点取决于字体——取自 16px `system-ui`、240px 盒子：

- `0` / `very-long-file-name-abcdefghi…`：头部占满，等价于末尾省略。
- `50`（默认） / `very-long-file-…-abcdefghij.txt`：两端各留一截。
- `80` / `very-l…file-name-abcdefghij.txt`：额度让给尾部。
- `100`：头部额度为 0，只剩标记与尾部。

### 合串复核与收敛

分段预算看不见 `head|marker` 与 `marker|tail` 两个接缝处的字距与连字，合串可能比两段额度之和更宽。

组件在渲染之后量**真实盒子**：超出容差 0.5px 就按超出量回收额度重切，最多 3 轮——3 轮是纯防御，兜的是「调用方把标记撑得比容器还宽」这类退化输入，常规路径一轮都不触发。

标记本身都放不下的时候（额度 ≤ 0），让标记溢出、由 `overflow: hidden` 裁掉，而不是退回全文：退回全文会把标记挤出盒外，用户连「这里被截断了」的信号都看不到。

宿主宽度由内容决定时（flex 主轴 `auto`、或 `width: fit-content`），把自己截短会反过来把宿主量窄，于是排下一次尺寸回调——这个自驱动收缩可能一路棘轮到只剩标记。收缩方向因此带一条收敛守卫：判据取「当前输出已经放得下」，放得下就没有必须重切的理由，第一步就停；放长方向一律重切。

### 已知限制——复制与辅助技术

元素里装的是屏幕上那串，因此选中复制拿到的是截断后的文本，读屏与页内查找命中的也是截断后的串。

CSS 的 `text-overflow` 没有这两个问题（它从不改动文本节点），这是用 JS 算切点绕不开的代价；原文经 `title` 提供。

保持全文留在 DOM 里的替代方案及其代价见 `docs/research/web-ui-middle-ellipsis-261007.md`。

宿主需为 `direction: ltr`；`direction: rtl` 下合串会被双向算法重排。组件没有事件、没有插槽，也不消费任何 `--wui-*` token：字体、字号、颜色、行高全部从宿主继承，所以外观完全交给你所在的容器决定。
