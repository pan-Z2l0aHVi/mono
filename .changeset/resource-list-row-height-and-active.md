---
'@greypan/interweave-frontend': patch
---

fix(interweave-frontend): 修复资源列表改名后行高错位与激活底色不跟随

两个现象都在 PR #243 落地后在同一条列表上被发现：#243 只动了 context-menu 的菜单项激活判定，
让右键「重命名」第一次真正能把资源改掉，此前那条路径因 scrim 留在 top layer、文档 inert，
焦点进不了名称编辑器。也就是说这两个缺陷**不是 #243 引入的**，而是被它暴露出来——
在 #243 之前改名根本提交不了，下游的这两条代码一次也没被执行过。

一、行高错位（高度计算错误）。行的宿主是 `web-ui-context-menu` 的默认 slot，插槽内容先渲染进
`DocumentFragment`、再由自定义元素分发进自己的 shadow root。Vue 的函数式 ref 在节点挂载时同步调用，
那一刻节点还没连上文档，`offsetHeight` 恒为 0。`@tanstack/virtual-core` 的默认 `measureElement`
会把这个 0 当成真实高度写进 `itemSizeCache`：该行连同其后每一行的 `start` 都按 0 累计，
行与行叠在一起、激活底色盖到上一行的内容上；同时 `resizeItem` 把这个 0 当成「变矮了」，
反复 `applyScrollAdjustment`，`scrollOffset` 变成一份与真实 `scrollY` 不符的乐观值，
虚拟窗口整体跑向列表尾部（表现为列表错位、甚至几乎空屏）。

修法是把「刚挂上、还没量」与「真的量」分开：`measureElement` 选项里，有 `entry`（ResizeObserver
回数）说明节点已经渲染，照常量；无 `entry` 的函数式 ref 这条路只负责让节点被 observe 到，
返回当前已知尺寸使 delta 为 0、不写坏缓存，等节点连上文档后由 RO 补一次真实高度。

回归用例放在真实浏览器里（`virtual-row-height.browser.spec.ts`）：前提是「ref 调用时节点未连文档」，
而 jsdom 侧的 spec 把 `web-ui-context-menu` 桩成裸 `HTMLElement`，插槽内容当场就连上文档，
这条路径在 jsdom 里根本走不到。用例在修复前红，之后绿。

二、激活底色不切换。`activeResourceId` 只有左键预览、详情、标签三个入口会写，改名这条路上
没有人碰它：刚从右键菜单改过名的那一行不会成为激活行，底色仍停在上一次激活的行上。
`renameResourceFromMenu` 现在把它一并置上——与另几个入口同一个理由：被操作的那一条就是当前对象。
