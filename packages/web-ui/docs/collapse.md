---
component: collapse
tag: web-ui-collapse
---

折叠面板把「触发器」与「内容」放在同一行内：触发器是 default slot，内容放在 `content` slot。
开合是严格受控的——组件只派发 `open-change` 请求，是否真的展开由 Consumer 回写 `open` 决定。

## 示例

### 基础用法

触发器可以是任何可交互元素（原生 `button`、`web-ui-button` 等），内容可以是任意节点。

```react
<web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
  <button type="button" className="w-full text-left">点击展开</button>
  <div slot="content">
    <p>这是折叠内容，支持任意内容。</p>
  </div>
</web-ui-collapse>
```

```vue
<template>
  <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
    <button type="button" class="w-full text-left">点击展开</button>
    <div slot="content">
      <p>这是折叠内容，支持任意内容。</p>
    </div>
  </web-ui-collapse>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### keep-mounted

默认关闭态把内容 `hidden`（脱离渲染与可访问性树）。`keep-mounted` 改为 `inert`，
保留滚动位置与可测量性，代价是关闭态仍占布局。

```react
<web-ui-collapse keep-mounted>
  <button type="button" className="w-full text-left">展开长列表</button>
  <div slot="content">
    {Array.from({ length: 20 }, (_, i) => (
      <p key={i}>列表项 {i + 1}</p>
    ))}
  </div>
</web-ui-collapse>
```

```vue
<template>
  <web-ui-collapse keep-mounted>
    <button type="button" class="w-full text-left">展开长列表</button>
    <div slot="content">
      <p v-for="index in 20" :key="index">列表项 {{ index }}</p>
    </div>
  </web-ui-collapse>
</template>
```

### peek

`peek` 让关闭态只露出固定长度的一段，其余被裁剪且不可交互，用来提示「下面还有内容」。

```react
<web-ui-collapse peek="80px">
  <button type="button" className="w-full text-left">展开长文本</button>
  <div slot="content">
    <p>关闭时只露出前 80px。</p>
  </div>
</web-ui-collapse>
```

```vue
<template>
  <web-ui-collapse peek="80px">
    <button type="button" class="w-full text-left">展开长文本</button>
    <div slot="content">
      <p>关闭时只露出前 80px。</p>
    </div>
  </web-ui-collapse>
</template>
```

## API

### Props

| 名称           | 说明                                                                                | 类型             | 默认值  |
| -------------- | ----------------------------------------------------------------------------------- | ---------------- | ------- |
| `open`         | 展开状态。严格受控，唯一状态源；组件只派发请求，不自己改。                          | `boolean`        | `false` |
| `disabled`     | 禁用触发：点击忽略，`aria-disabled` 写到 trigger 元素上；已展开内容保持现状。       | `boolean`        | `false` |
| `horizontal`   | 水平方向：沿宽度展开，默认沿高度。                                                  | `boolean`        | `false` |
| `keep-mounted` | 关闭稳态保持内容 `inert` 而非 `hidden`，保留滚动位置与可测量性。                    | `boolean`        | `false` |
| `peek`         | 关闭稳态露出的尺寸（CSS 长度，如 `120px`、`6rem`）。设置后语义等同 `keep-mounted`。 | `string \| null` | `null`  |

### Events

| 名称          | 说明                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| `open-change` | 开合请求。`detail.open` 是请求的目标状态；Consumer 回写 `open` 才真正生效。 |

### Slots

| 名称      | 说明                                                                      |
| --------- | ------------------------------------------------------------------------- |
| `default` | 触发器。可放原生 `button` 或任意 `web-ui-*` 组件。                        |
| `content` | 折叠内容。关闭态按 `keep-mounted` / `peek` 决定是 `hidden` 还是 `inert`。 |

### Methods

| 名称       | 说明                                                           |
| ---------- | -------------------------------------------------------------- |
| `show()`   | 展开：把 `open` 置为 `true`；程序式变更不派发 `open-change`。  |
| `close()`  | 收起：把 `open` 置为 `false`；程序式变更不派发 `open-change`。 |
| `toggle()` | 按当前 `open` 切换展开 / 收起。                                |

### 行为说明

```html
<web-ui-collapse>
  <button type="button">点击切换</button>
  <div slot="content">折叠内容</div>
</web-ui-collapse>
```

初始即带 `open` attribute 时直接落稳态，不播动画。支持嵌套 collapse。

### trigger 语义

交互语义完全来自 default slot 放入的元素——原生 `<button>`、`<web-ui-button>` 或其他可交互元素原生提供 Enter/Space 激活与焦点。collapse 把 `aria-expanded` / `aria-controls`（指向内容轨道）与 `aria-disabled` 回写到 trigger slot 的首个 assigned element。trigger 请使用可交互元素：纯 `<span>` 可点击但没有键盘/焦点语义。

### 关闭稳态语义

Consumer的 light DOM 永不移动或卸载。默认关闭稳态在内部内容容器上设 `hidden`；`keep-mounted` 时内部容器标记 `inert`，保留在收起轨道内可测量。

### peek（只露一部分）

设置 `peek` 后关闭稳态不再收拢到 0，而是沿动画轴露出内容的头部 `peek` 长度（`horizontal` 时改为宽度）：轨道保持在内容高度，裁剪长度落在内部容器上。其语义等同 `keep-mounted`——内容保留挂载但被 `inert` 阻断，被裁掉的部分不可聚焦、不可点击。内容本身不足 `peek` 时按内容实际尺寸收起，不留空白。由于固定长度与自适应高度无法由 CSS 插值，`peek` ↔ 展开这两个方向改为读出像素后以显式长度驱动（每次开合测量一次）；其余动画路径仍是零测量的 grid `fr` 过渡。

```html
<web-ui-collapse peek="120px">
  <button type="button">点击切换</button>
  <div slot="content">很长的内容——关闭时只露出前 120px</div>
</web-ui-collapse>
```

### 边缘渐隐

露出区域的裁剪边缘自带一段 alpha 渐变（`horizontal` 时改为右边），让被裁掉的部分柔和过渡到背景而不是硬切。渐变长度由 `peek` 推导，不需要也没有第二个属性可调——需要时用 CSS 变量微调：

渐变带由两层组成，配对方式与 layout header 的晕染一致：上面那条 alpha 渐隐之外，同一条带上再叠一层真实的 `backdrop-filter` 模糊，被裁掉的内容因此是被**糊掉**的，而不只是被调成半透明。模糊强度由本盒自己的 `mask-image` 调制——从带子起点为 0 升到后半段满强度、再在裁剪边缘前回到 0：起点不为 0 会在「突然开始模糊」处留一条接缝，末端不为 0 则会一路糊到裁剪边界。展开态活动长度为 0，各色标塌缩到 100% 而末位色标是全透明，于是这一层什么都不画。

比例设为 `0` 即关闭渐隐。推导是纯 CSS 的 `calc(peek * ratio)`：`peek` 用 rem 时渐变长度自动跟随根字号缩放，JS 侧不需要做任何单位解析。已知限制：`peek` 取百分比时推导结果不是长度、无法被注册属性插值，会静默回落为「无渐隐」，此时请用 `--wui-collapse-peek-edge` 显式指定长度。

渐变是四段「先陡后缓」而非线性：主体全黑延伸到渐变带起点后，前 30% 距离就降到 60% alpha，65% 处 26%，末端落到边缘颜色。线性渐变的 alpha 在带子前 40% 几乎贴着 1.0，人眼感知到的虚化远短于声明长度——把下降前置后，带子从起点就明显发虚，同样长度的感知长度接近翻倍。

渐变带位置用百分比声明、相对容器的**当前渲染高度**（即 `max-height` 动画的那个高度），因此收起动画期间渐变带逐帧跟随裁剪边缘移动，`mask-image` 字符串本身无需插值。渐变带长度由注册的 `<length>` 自定义属性驱动，随开合动画平滑淡入淡出，而不是等收起动画落稳态才突然出现。

```html
<!-- 调强渐隐：比例 0.5 → 120px peek 配 60px 渐隐 -->
<web-ui-collapse peek="120px" style="--wui-collapse-peek-edge-ratio: 0.5">
  <button type="button">点击切换</button>
  <div slot="content">很长的内容——120px 露出区域的底部渐隐更强</div>
</web-ui-collapse>
```

### CSS Custom Properties

| 名称                             | 说明                                           | 默认值        |
| -------------------------------- | ---------------------------------------------- | ------------- |
| `--wui-collapse-peek-edge-ratio` | 渐变长度占 `peek` 的比例                       | `0.4`         |
| `--wui-collapse-peek-edge-max`   | 长度上限，避免大 `peek` 算出过长的虚化带       | `112px`       |
| `--wui-collapse-peek-edge`       | 显式指定长度，优先于推导值                     | —             |
| `--wui-collapse-peek-edge-color` | 渐变末端颜色（需带 alpha，mask 按 alpha 解析） | `transparent` |
| `--wui-collapse-peek-edge-blur`  | 同一条渐变带上背景模糊的半径                   | `4px`         |

### 已知限制

`horizontal` 动画期间内容随宽度变化 reflow。
