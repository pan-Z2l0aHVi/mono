---
'@greypan/interweave-frontend': patch
---

fix(interweave-frontend): 修复资源列表改名把标题撑成多行后行高不重算、相邻行重叠

现象：给某条资源改名、标题由一行变成多行，提交后这一行与它下面那行**重叠**（下面那行被压上来约
18px）。这条路径同样只在改名能真正提交（#243 打通的那条路）之后才可见，与 #243 本身无关。

根因不在高度，而在 `getItemKey` 的**引用**。行高缓存 `itemSizeCache` 是按资源 id 记的（同一条资源的
行高跨顺序是不变量），但 virtual-core 把「下标 -> key/尺寸」的整块映射（`getMeasurements`）memo 在
`getItemKey` 的引用上（`getMeasurementOptions` 的依赖列表里有它）。`getItemKey` 是稳定的箭头函数时，
顺序一变而引用不变，映射就整块复用上一次顺序的结果：第 0 项仍记着旧第 0 条资源的高度，而按 id 存的
真实高度明明还在缓存里。

这个不一致不自愈，因为两侧判据不同：被移动的那一行自身高度没变，ResizeObserver 报上来的尺寸与
`itemSizeCache` 里该 id 的缓存完全相同，`resizeItem` 的 delta 为 0——既不写缓存也不递增
`itemSizeCacheVersion`，`measurements` 永远等不到那次重算。改名按 'latest' 排序把该资源顶到列表最前，
同时满足「高度变了」与「下标变了」，这条缺口才第一次显现。

修法是把 `getItemKey` 改成 getter：useWindowVirtualizer 每次展开 options 都拿到一个新闭包，于是
`measurements` 随之从 `itemSizeCache` 重算，按 id 存的高度落到新下标上。它的前提是调用方**替换**
`props.resources` 的引用（`stores/library` 的 `filterAndSort` 每次都返回新数组）；原地改同一个数组
不会让 options 重新展开，陈旧映射会原样复发。

回归用例放在 `virtual-row-height.browser.spec.ts`：走真实改名路径（进编辑态 -> 草稿撑成长标题 ->
Enter 提交 -> 异步落库并按 'latest' 重排），断言相邻行首尾相接。修复前红（接缝 18.5px），修复后绿；
jsdom 侧复现不了这条路径。
