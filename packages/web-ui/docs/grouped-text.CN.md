# Grouped Text

组块显示：把一长串数字或文本按肉眼可见的组撑开间隙，同时让「选中并复制」拿到的仍是**原始连续串**。用在复制出去要能直接读用的连续标识上，银行卡号、手机号、大额金额。

## Samples

### Card number

`groups="card"` 每 4 位一组。间隙由字距撑出，不写进文本：整串选中复制，剪贴板拿到的仍是 `6222021234567890`；页内查找也按这串原样命中。

```tsx
const CARD = '6222021234567890'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">不分组</div>
        <div className="font-mono">{CARD}</div>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">groups="card"</div>
        <web-ui-grouped-text className="font-mono" value={CARD} groups="card"></web-ui-grouped-text>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">不分组</div>
      <div class="font-mono">{{ CARD }}</div>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">groups="card"</div>
      <web-ui-grouped-text class="font-mono" :value="CARD" groups="card"></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const CARD = '6222021234567890'
</script>
```

### Phone number

`groups="phone"` 按 3-4-4 切。位数用完还剩字符时，沿用**最后一档**继续切，因此一位都不会丢。

```tsx
const PHONE = '13800138000'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">11 位：3-4-4</div>
        <web-ui-grouped-text value={PHONE} groups="phone"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">带国家码：最后一档继续切</div>
        <web-ui-grouped-text value={`+86${PHONE}`} groups="phone"></web-ui-grouped-text>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">11 位：3-4-4</div>
      <web-ui-grouped-text :value="PHONE" groups="phone"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">带国家码：最后一档继续切</div>
      <web-ui-grouped-text :value="`+86${PHONE}`" groups="phone"></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const PHONE = '13800138000'
</script>
```

### Amount

`groups="amount"` 从右往左每 3 位一组，小数点连同小数部分自成一组：`1234567.89` 切成 `1 | 234 | 567 | .89`。小数点是内容而不是排版装饰，因此查找以原串为准，带点命中，把点去掉就失配。

```tsx
export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">有小数</div>
        <web-ui-grouped-text value="1234567.89" groups="amount"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">整数</div>
        <web-ui-grouped-text value="98765432" groups="amount"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">没有小数段：结尾的点属于整数段</div>
        <web-ui-grouped-text value="123456." groups="amount"></web-ui-grouped-text>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">有小数</div>
      <web-ui-grouped-text value="1234567.89" groups="amount"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">整数</div>
      <web-ui-grouped-text value="98765432" groups="amount"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">没有小数段：结尾的点属于整数段</div>
      <web-ui-grouped-text value="123456." groups="amount"></web-ui-grouped-text>
    </div>
  </div>
</template>
```

### Explicit group sizes

`groups` 也可以逐组给位数，属性侧写成 `4,4,4,4`（空格分隔同样认）。切点落在字素簇边界上，不会把代理对、组合符序列或 ZWJ emoji 切成半个。

```tsx
const ID = '110101199003078888'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">groups="6,8,8"</div>
        <web-ui-grouped-text value={ID} groups="6,8,8"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">groups="4,4,4,4,4,4"</div>
        <web-ui-grouped-text value={ID} groups="4,4,4,4,4,4"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">emoji 整簇保留：groups="2,2"</div>
        <web-ui-grouped-text value={'\u{1F469}\u200D\u{1F4BB}'.repeat(4)} groups="2,2"></web-ui-grouped-text>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">groups="6,8,8"</div>
      <web-ui-grouped-text :value="ID" groups="6,8,8"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">groups="4,4,4,4,4,4"</div>
      <web-ui-grouped-text :value="ID" groups="4,4,4,4,4,4"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">emoji 整簇保留：groups="2,2"</div>
      <web-ui-grouped-text :value="EMOJI.repeat(4)" groups="2,2"></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const ID = '110101199003078888'
const EMOJI = '\u{1F469}\u200D\u{1F4BB}'
</script>
```

### Gap width

间隙宽度是 `--wui-grouped-text-gap`，默认 `0.25em`，每处组边界各一份：4 组就是 3 份。它跟着字号走，`16px` 字号下是 4px，`20px` 下是 5px。

```tsx
const CARD = '6222021234567890'
const GAPS = ['0px', '2px', '6px', '12px']

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {GAPS.map(gap => (
        <div key={gap}>
          <div className="mb-1 text-xs text-(--wui-color-text-secondary)">--wui-grouped-text-gap: {gap}</div>
          <web-ui-grouped-text
            className="font-mono"
            style={{ '--wui-grouped-text-gap': gap }}
            value={CARD}
            groups="card"
          ></web-ui-grouped-text>
        </div>
      ))}
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div v-for="gap in GAPS" :key="gap">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">--wui-grouped-text-gap: {{ gap }}</div>
      <web-ui-grouped-text
        class="font-mono"
        :style="{ '--wui-grouped-text-gap': gap }"
        :value="CARD"
        groups="card"
      ></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const CARD = '6222021234567890'
const GAPS = ['0px', '2px', '6px', '12px']
</script>
```

### Separator

`separator` 在组与组之间画一个看得见的分隔符。它不进文本节点：整串选中复制，剪贴板拿到的仍是 `6222021234567890`，页内查找也按这串原样命中。

```tsx
const CARD = '6222021234567890'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">separator="-"</div>
        <web-ui-grouped-text value={CARD} groups="card" separator="-"></web-ui-grouped-text>
      </div>
      <div>
        <div className="mb-1 text-xs text-(--wui-color-text-secondary)">separator="·"</div>
        <web-ui-grouped-text value={CARD} groups="card" separator="·"></web-ui-grouped-text>
      </div>
    </div>
  )
}
```

```vue
<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">separator="-"</div>
      <web-ui-grouped-text :value="CARD" groups="card" separator="-"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">separator="·"</div>
      <web-ui-grouped-text :value="CARD" groups="card" separator="·"></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const CARD = '6222021234567890'
</script>
```

## API

### Props

| 名称        | 说明                                                                                                                                                                                                         | 类型                          | 默认值                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | --------------------- |
| `value`     | 要显示的原始连续串。组件只读它，不回写；`Number` 请调用方自己转成字符串。                                                                                                                                    | `string`                      | `''`                  |
| `groups`    | 组形：`'card'`（每 4 位）、`'phone'`（3-4-4）、`'amount'`（从右每 3 位）这几个预设名，或逐组字素簇数 `[4, 4, 4, 4]`；字符串形式的位数表 `"4,4,4,4"` 同样认。数组通道静默丢弃非正的位数，字符串通道整串作废。 | `string \| readonly number[]` | `undefined`，即不分组 |
| `separator` | 组与组之间的展示分隔符（如 `'-'`、`'·'`）。只做展示：以生成内容渲染，不进文本节点，复制、查找与选区拿到的仍是原始连续串。见「分隔符」。                                                                      | `string`                      | `''`，即不渲染        |

### 行为说明

`value` 是原文，分组只是渲染参数：切出来的组首尾相接，拼回去逐字等于 `value`，组与组之间不含任何补位字符。组件的 shadow 树里因此只有字；`separator` 开启时分隔符以生成内容渲染，同样不进文本节点（见「分隔符」）。

预设之外的位数表从左往右逐组推进；位数用完还剩字符时沿用最后一档继续切，末组装剩下的部分，所以一个字符都不会丢，也不会有空组。`groups` 省略、为空或读不出（`cards`、`4,0`、`card,4` 这类）时**整串自成一组**，即不分组，这一档刻意不猜组形：把身份证按 4 位切开、把大额金额按 4 位切开都是看得见的错切，代价比不分组的可见成本高得多。

切点一律落在字素簇边界上。按 UTF-16 下标切会把代理对与 ZWJ 序列从中间劈开，屏幕上出现半个 emoji 比「这一组少一位」严重得多。

`groups` 的字符串写法在 attribute 与 property 两条通道都认。Vue 这类框架发现 `'groups' in el` 成立就直接赋 property，Lit 的 `fromAttribute` 转换器一次都不会跑，所以模板里写 `groups="4,4,4,4"` 传进来的是原样字符串；两条通道共用同一份解析，`groups="4,4,4,4"` 与 `:groups="[4, 4, 4, 4]"` 切出同一批组。

### 间隙

间隙挂在每组末位字素簇自己的 `letter-spacing` 上，只有末位带字距，组内其余字符不加宽；最后一组的末位不带，行尾因此不留多余间隙。字距属于这个字符自己的文本片段，选中片段时字距跟着一起被刷色，于是「看得见分组」与「高亮连续」两者兼得。

`--wui-grouped-text-gap` 默认 `0.25em`（`14px` 字号下 3.5px，`16px` 下 4px，`20px` 下 5px）。间隙按组边界计：`n` 组就有 `n - 1` 份。16 位卡号在 20px 等宽字体下约 192px，`groups="card"` 加 3 处 5px 后约 207px。

### CSS Custom Properties

| 名称                     | 说明                                                                                          | 默认值   |
| ------------------------ | --------------------------------------------------------------------------------------------- | -------- |
| `--wui-grouped-text-gap` | 组间间隙宽度，作用于每组末位字素簇的 `letter-spacing`，行为见「间隙」。写在组件或任意祖先上。 | `0.25em` |

### 分隔符

`separator` 在每组与下一组之间渲染一个展示分隔符。它挂在组元素自己的 `::after` 上，经 `content: attr(data-separator)` 取值，自始至终不进文本节点：shadow 树的文本节点拼起来仍逐字等于 `value`，分隔符只是叠在排版上的可见标记。

行为边界因此清楚：选中复制、页内查找、双击选词与逐位选择全部照旧，复制与查找读的是文本节点的 data，生成内容读不到，也选不中。选区高亮不会刷在分隔符上：跨组分隔符处，高亮落在分隔符两侧的字上，分隔符自己不属于任何文本片段。如果这处让位不可接受，就不要用 `separator`，它是可见内容，不是可隐藏的排版参数。

分隔符的落点由组边界决定：只有一组（`groups` 省略、读不出或整串自成一组）时没有边界，分隔符不渲染；末组后面没有下一组，行尾不会多出分隔符。省略或空串时不渲染分隔符，渲染结果与没有这个属性时逐节点相同。生成内容按 accname 规范计入可访问名称，分隔符是看得见的内容，读屏读到它是预期行为。

### 复制、查找与选区

选中复制拿到的是原文：整串选中得整串，只选末组得那 4 位。组件不挂 `copy` 监听，实测它会把「只选中最后一组」的部分复制也换成整串，那是越权改写。

页内查找以原串为准。`window.find('6222021234567890')` 命中（Chromium 实测浏览器搜索后端会穿 open shadow root），跨组边界的连续子串同样命中；金额带小数点查找命中，而去掉小数点的那串在组件的文字里根本不存在，原串本来就含那个点。双击数字串中任意一位选中整串。

选区高亮在组间不断开：Chromium 逐像素量过，`letter-spacing` 形状的间隙全部落在高亮内，0 洞。

### 辅助技术

组件不提供 `aria-label`，也不改写文本，读屏读到的就是这串字。Chromium 实测：卡号的 4 组在无障碍树里落成 7 段文本节点，前 3 组各拆成首段与末位两段、末组只有一段，和同等结构的 light DOM 写法一模一样；把组件包进 `<button>`，按钮的计算可及名逐字等于 `6222021234567890`。因此加 `aria-label` 兜底没有必要，反而会把整块压成单一标签、丢掉逐位选择的价值。

VoiceOver 与 TalkBack 会不会逐组停顿、按位读还是按数读，没有实测。

### 排版

组件在自己的 `:host` 上写 `font-variant-numeric: tabular-nums`：Chromium 默认就等宽，WebKit 不是，同一串 `0123456789` 在 24px 系统字体下 `1` 比 `6` 窄约 4px。不写这一条，同一份页面在两个引擎上的组间对齐就不一致。

`white-space: nowrap` 同样写在 `:host` 上：窄容器里整串溢出而不是折行。间隙走字距本来就不引入断行机会，但占位元素、`::after` 与 `display: inline-block` 会，见下面两节。

放进 `text-align: justify` 的文本流时，字距间隙不会被当作调整点：Chromium 实测同一行在 `text-align-last: justify` 下确实被拉宽，而组件自身宽度和每一组的宽度逐字节不变。

### 已知行为：用 `margin` 撑间隙

不想拆字符时，组间间隙可以退到每组首元素的 `margin-inline-start`。代价是选区高亮会在每处组边界断开一条与间隙等宽的洞，Chromium 实测 8px 间隙正好留下 3 条 8px 的洞（4 组）。这是形状决定的，不是 bug：`margin` 撑出的空白落在两个文本片段之外，谁都不属于，而 `::selection` 只能用不影响布局的属性，补不掉。组件本身不走这条路。

### 不能改成这些形状

- 把分隔符写进文本节点（`U+0020`、`U+2009`、`U+202F`、`U+200B`）：四种码点实测全部原样进剪贴板，并且打断双击选词与页内查找。
- 组用 `display: inline-block`：Chromium 下它让 `window.find` 对连续数字串直接失配，是唯一破坏页内查找的分组形状。
- 空占位 `span` 或 `::after` 撑间隙：空白带不进高亮，还额外造出断行机会。
- `copy` 监听改写选区、`user-select: none`、SVG `textLength`：前者越权，第二条让复制不可用，第三条让高亮按字形断开且不参与正常文本布局。

### 边界

只读显示：没有事件、没有插槽、不参与表单。除 `--wui-grouped-text-gap` 之外不读任何 `--wui-*` token；字体、字号、颜色、行高全部从宿主继承，`groups` 为 `undefined` 时不切分。
