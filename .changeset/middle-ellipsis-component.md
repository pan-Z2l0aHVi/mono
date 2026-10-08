---
'@greypan/web-ui': minor
---

新增 `<web-ui-middle-ellipsis>`：单行中间省略，保留首尾、丢掉中间（`very-long-file-…-abcdefghij.txt`），补上 `text-overflow: ellipsis` 只能保住头部的那块缺口。

属性 `text` / `marker` / `marker-position`。`marker-position` 与 CSSWG css-overflow-5 的 `text-overflow: ellipsis <length-percentage>` 同向（`0` 贴行末、`100` 贴行首、默认 `50` 居中），将来该特性落地时消费方的取值可以直接搬过去。切点只落在字素簇边界上，代理对、组合符序列与 ZWJ emoji 不会被劈开；容器尺寸变化后重算。

使用条件与 `text-overflow: ellipsis` 相同：单行，且有确定行内尺寸。

已知限制：元素里装的是屏幕上那串，因此选中复制拿到的是截断后的文本（原文经 `title` 提供）；宿主需为 `direction: ltr`。可行性与方案对比见 `docs/research/web-ui-middle-ellipsis-261007.md`。
