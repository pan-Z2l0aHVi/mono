---
'@greypan/web-ui': patch
---

feat(empty): 空态图标改为纯图形，去掉身后的圆角矩形底面

图标区原本把 `--wui-color-surface-track` 画成一个 `border-radius: 18px` 的圆角矩形托底，
图形浮在上面。issue #230 要求去掉那层底面：盒只留占位与居中，图形直接坐在它背后那张
表面上，浅色与深色皆然。

盒本身、`--wui-empty-icon-size` 与 `size` 的度量派生、slot 与 property 一概未动——本次只
删了 `.empty-icon` 的 `background-color`、`box-shadow` 与 `border-radius` 三条声明。圆角随
底面一同失去作用对象，所以 `--wui-internal-empty-icon-radius`（内部 token，未在 README 的
公开表里）不再被消费；`apps/interweave` 的 `AddDialog.vue` 仍在覆写它，那条覆写从此无效但
无害，留给那条链按自己的取舍清理。

图形色沿用 `--wui-color-text-secondary`：无底面时字形是这一区唯一的图形元素，
`--wui-color-text-tertiary` 在浅色 page 上对比度不足 3:1。新增浏览器用例钉住「图标盒背景
透明」与「图形与其背后表面 WCAG 对比度 ≥ 3:1」两条关系，两种 appearance 各跑一遍。
