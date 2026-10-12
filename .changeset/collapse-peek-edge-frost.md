---
'@greypan/web-ui': patch
---

feat(collapse): peek 的裁剪边缘改用与 layout header 同一套晕染——渐隐之外叠一层真实的背景模糊

peek 的裁剪边缘此前只有一条 `mask-image` alpha 渐变：被裁掉一半的内容是**变透明**而不是被拿掉，
轮廓仍然锐利，读起来像贴了张半透明胶片。layout header 的晕染（`layout/style.css` 的
`header::before` / `::after`）用的是 `backdrop-filter` 把背后的画面真的糊掉，两处观感不一致
（issue #221）。

改法是给同一条渐变带补一层伪元素晕染：`backdrop-filter: blur()` 叠在 inner 上，由本盒自己的
`mask-image` 沿带子调制强度（带子起点 0 → 后半段满强度 → 裁剪边缘前回到 0；起点不为 0 会留下一条
「突然开始模糊」的接缝，末端不为 0 会一路糊到裁剪边界）。渐变本身与各项 `--wui-collapse-peek-edge-*`
调优口径一律不动，展开态活动长度为 0 时色标塌缩、末位色标全透明，这一层自然什么都不画。

新增 `--wui-collapse-peek-edge-blur`（默认 `4px`，与 header 一致）调半径。

`--wui-collapse-peek-edge-active` 的注册由 `inherits: false` 改为 `true`：伪元素读同一个值，
继承为 false 时它读到的是 `initialValue` 0px，mask 塌缩、模糊层静默消失而其余渲染一切照旧。
