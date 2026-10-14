---
'@greypan/interweave-frontend': patch
---

fix(interweave-frontend): 资源列表虚拟化换用 virtua，修复改名后的行高错位、激活底色不跟随与 Safari 草稿丢失

资源列表原本用 `@tanstack/vue-virtual` 做窗口虚拟化。行高不固定（标题 `line-clamp-2` 换行、
标签区 `flex-wrap` 换行、进入改名编辑态从文字换成表单控件），围绕它的测量回填积累了两处规避：
把「刚挂上、还没量」与「真的量」分开的 `measureElement`，以及让顺序一变就换引用的 `getItemKey`
getter。两处都是对同一份内部 memo 语义打的补丁，脆弱且难迁移。本次把虚拟化整体换成 `virtua`
（跨框架，未来其他技术栈可复用），这两处规避随之下线。

三个现象都在 PR #243 落地后在同一条列表上被发现：#243 只动了 context-menu 的菜单项激活判定，
让右键「重命名」第一次真正能把资源改掉，此前那条路径因 scrim 留在 top layer、文档 inert，
焦点进不了名称编辑器。也就是说它们**不是 #243 引入的**，而是被它暴露出来——在 #243 之前改名
根本提交不了，下游这些代码一次也没被执行过。

一、行高错位（首次进入窗口时的 0 高度）。行的宿主是 `web-ui-context-menu` 的默认 slot，插槽内容
先渲染进 `DocumentFragment`、再由自定义元素分发进自己的 shadow root。Vue 的函数式 ref 在节点
挂载时同步调用，那一刻节点还没连上文档，`offsetHeight` 恒为 0。`@tanstack/virtual-core` 的默认
`measureElement` 会把这个 0 当成真实高度写进 `itemSizeCache`：该行连同其后每一行的 `start` 都按
0 累计，行与行叠在一起、激活底色盖到上一行内容上；同时 `resizeItem` 把这个 0 当成「变矮了」，
反复 `applyScrollAdjustment`，`scrollOffset` 变成一份与真实 `scrollY` 不符的乐观值，虚拟窗口
整体跑向列表尾部（表现为列表错位、甚至几乎空屏）。旧修法是把「刚挂上、还没量」与「真的量」
分开：无 `entry` 的函数式 ref 这条路只负责让节点被 observe 到、返回当前已知尺寸使 delta 为 0、
不写坏缓存，真实高度等节点连上文档后由 RO 补。

virtua 在条目挂载后由挂在每个条目上的 ResizeObserver 量高度，不在挂载瞬间同步读 `offsetHeight`；
条目高度只在内容变化时才变，DOM 摘除/重建不构成问题。0 高度错位这条路径因此不再存在。回归用例
放在真实浏览器（`virtual-row-height.browser.spec.ts`）：前提是「ref 调用时节点未连文档」，而
jsdom 侧的 spec 把 `web-ui-context-menu` 桩成裸 `HTMLElement`，插槽内容当场就连上文档，这条路径
在 jsdom 里根本走不到。

二、改名重排后行高不重算（相邻行重叠）。与「一」不同：一讲的是首次进入窗口时的 0 高度，这条讲的
是顺序变化后高度与下标的错配。行高缓存 `itemSizeCache` 是按资源 id 记的（同一条资源的行高跨顺序
是不变量），但旧实现把「下标 → key/尺寸」的整块映射（`getMeasurements`）memo 在 `getItemKey` 的
引用上（`getMeasurementOptions` 的依赖列表里有它）：顺序一变而引用不变，映射就整块复用上一次顺序
的结果——第 0 项仍记着旧第 0 条资源的高度，而按 id 存的真实高度明明还在缓存里。这个不一致不自愈，
因为两侧判据不同：被移动的那一行自身高度没变，ResizeObserver 报上来的尺寸与 `itemSizeCache` 里该
id 的缓存完全相同，`resizeItem` 的 delta 为 0——既不写缓存也不递增 `itemSizeCacheVersion`，
`measurements` 永远等不到那次重算。改名按 'latest' 排序把该资源顶到列表最前，同时满足「高度变了」
与「下标变了」，这条缺口才第一次显现（用户看到这一行与下一行重叠）。旧修法是把 `getItemKey` 改成
getter，让每次展开 options 都拿到一个新闭包。

virtua 用插槽根 vnode 的 `key`（取资源 id）做行身份，重排后每个条目用新下标重新 `observe` 同一个
DOM 节点，真实高度落到新下标上——「改名把标题撑成多行 + 排到列表最前」这条重排路径由库自己兜住，
不需要外部触发重算。回归用例同样在 `virtual-row-height.browser.spec.ts`：走真实改名路径（进编辑态
→ 草稿撑成长标题 → Enter 提交 → 异步落库并按 'latest' 重排），断言相邻行首尾相接。

三、编辑行被虚拟列表回收时 Safari/iOS 草稿静默丢失。窗口模式的行随渲染窗卸载，行内的
`editable-text` 走 `disconnectedCallback`；它默认的提交只有 Enter 与 blur 两条。Chromium 移除会补派
blur、change 照常派发、草稿不丢；WebKit（Safari / iOS）移除**不派发 blur**，默认路径什么都不提交，
用户打的字随行一起静默消失。旧实现把编辑行无条件并进渲染结果（永远不被卸载）来回避回收，而
virtua 的窗口模式没有 `keepMounted`（只有自建滚动容器的 `<Virtualizer>` 有）。兜底改落在
`ResourceRow` 给 `web-ui-editable-text` 开启的 `commit-on-unmount`：卸载复用 `_commitEditing`，
与 Enter／blur 是同一份实现，判据是「草稿与进入编辑时的值确实不同」，回收一个没改过的编辑行不会
凭空产生一次改名。行为侧在 `rename-focus.browser.spec.ts` 验「行被回收时草稿被提交」，属性由
`ResourceList.spec.ts` 与 web-ui 的 `commit-on-unmount` 浏览器用例覆盖（jsdom 的
`web-ui-editable-text` 未升级成真正的自定义元素，`disconnectedCallback` 不执行，卸载提交在 jsdom
里无从观察）。

四、激活底色不切换。`activeResourceId` 只有左键预览、详情、标签三个入口会写，改名这条路上没有人
碰它：刚从右键菜单改过名的那一行不会成为激活行，底色仍停在上一次激活的行上。
`renameResourceFromMenu` 现在把它一并置上——与另几个入口同一个理由：被操作的那一条就是当前对象。
