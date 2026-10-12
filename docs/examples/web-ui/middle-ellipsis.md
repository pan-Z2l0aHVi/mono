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

| 名称              | 说明                                                |
| ----------------- | --------------------------------------------------- |
| `text`            | 完整文本，组件只读不回写。                          |
| `marker`          | 插在两端之间的标记；空串即截断但不给可见信号。      |
| `marker-position` | 标记所在的横向比例 0–100；越界夹紧，`NaN` 回落 50。 |
