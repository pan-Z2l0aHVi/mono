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
