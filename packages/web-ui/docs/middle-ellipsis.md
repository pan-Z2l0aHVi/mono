---
component: middle-ellipsis
tag: web-ui-middle-ellipsis
---

单行中间省略：保留首尾、丢掉中间，`very-long-file-…-abcdefghij.txt`；切点落在字素簇边界上，不会劈开代理对或 emoji。

## 示例

### 基础

与 `text-overflow: ellipsis` 一样需要单行、且有确定的行内尺寸。

```react
<div style={{ width: 240 }}>
  <web-ui-middle-ellipsis text="very-long-file-name-abcdefghij.txt"></web-ui-middle-ellipsis>
</div>
```

```vue
<template>
  <div style="width: 240px">
    <web-ui-middle-ellipsis text="very-long-file-name-abcdefghij.txt"></web-ui-middle-ellipsis>
  </div>
</template>
```

### 标记

`marker` 是插在两端之间的标记，空串表示截断但不给任何可见信号。

```react
<web-ui-middle-ellipsis text="/Users/grey/Documents/design/spec.txt" marker="***"></web-ui-middle-ellipsis>
```

```vue
<template>
  <web-ui-middle-ellipsis text="/Users/grey/Documents/design/spec.txt" marker="***"></web-ui-middle-ellipsis>
</template>
```

### 标记位置

`marker-position` 决定标记的横向比例：头部是路径噪声、尾部才是扩展名时取大值。

```react
<web-ui-middle-ellipsis text="/Users/grey/Documents/design/spec.txt" marker-position={80}></web-ui-middle-ellipsis>
```

```vue
<template>
  <web-ui-middle-ellipsis text="/Users/grey/Documents/design/spec.txt" :marker-position="80"></web-ui-middle-ellipsis>
</template>
```

## API

### Props

| 名称              | 说明                                                | 类型     | 默认值 |
| ----------------- | --------------------------------------------------- | -------- | ------ |
| `text`            | 完整文本，组件只读不回写。                          | `string` | `''`   |
| `marker`          | 插在两端之间的标记；空串即截断但不给可见信号。      | `string` | `'…'`  |
| `marker-position` | 标记所在的横向比例 0–100；越界夹紧，`NaN` 回落 50。 | `number` | `50`   |

### 行为说明

使用条件与 `text-overflow: ellipsis` 相同：**单行、且有确定行内尺寸**。块级盒子、flex 行里的 `flex: 1; min-width: 0`、grid track 都可以。宿主按自身内容撑宽时不存在可用空间，组件按量到的宽度切一次就停止继续收缩，而不是一路塌到只剩标记。

容器宽度变化会触发重新切分。字体度量变化也会重新测量：全文量具尺寸变化（例如根字号变化）由 `ResizeObserver` 发现；字体加载完成事件会补上全文总宽不变但字形宽度重新分布的情况。组件断连后停止监听，重连时按当前布局重新拟合。

文件名场景靠 `marker-position` 调节，头部是路径噪声、尾部才是扩展名时取大值。下表是示意而非可复现的取值——确切切点取决于字体——取自 16px `system-ui`、240px 盒子：

列依次为 marker-position / 240px 盒子里：

- `0` / `very-long-file-name-abcdefghi…`
- `50`（默认） / `very-long-file-…-abcdefghij.txt`
- `80` / `very-l…file-name-abcdefghij.txt`

切点一律落在**字素簇**边界上：代理对、组合符序列、ZWJ emoji 都不会被从中间劈开。截断期间完整原文写在文本元素的 `title` 上，放得下之后移除。宿主需为 `direction: ltr`；`direction: rtl` 下合串会被双向算法重排。

### 已知限制——复制与辅助技术

元素里装的是屏幕上那串，因此选中复制拿到的是截断后的文本，读屏与页内查找命中的也是截断后的串。CSS 的 `text-overflow` 没有这两个问题（它从不改动文本节点），这是用 JS 算切点绕不开的代价；原文经 `title` 提供。保持全文留在 DOM 里的替代方案及其代价见 `docs/research/web-ui-middle-ellipsis-261007.md`。
