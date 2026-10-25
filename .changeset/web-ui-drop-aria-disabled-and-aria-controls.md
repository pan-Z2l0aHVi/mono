---
'@greypan/web-ui': minor
---

`disabled` 成为唯一的禁用入口，`aria-disabled` 不再参与任何行为：

- `web-ui-button` 不再委派 `aria-disabled` 到内部原生 button，也不再因 `aria-disabled="true"` 阻断 click / 表单动作。「看起来禁用但仍可聚焦」的语义移除，需要禁用请用 `disabled`（内部 button 真的禁用、退出 tab 序列）。
- `web-ui-collapse` 的 `disabled` 改为给 trigger 元素加 `disabled`（取消禁用时还原），替代原来的 `aria-disabled` 回写——后者在 `<web-ui-button>` 上只落在宿主，属性不跨 shadow 转发，AT 读不到。
- `web-ui-collapse` 不再向 trigger 回写 `aria-controls`：目标 id 在组件 shadow root 内，IDREF 跨 shadow root 不解析，写出去等同悬空引用。展开关系只由 `aria-expanded` 表达，内容 track 也不再生成无引用的 id。
