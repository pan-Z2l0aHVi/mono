# ADR-0041: Web UI 覆盖层组件的内容迁移与 slot 属性边界

## 背景

覆盖层组件的面板必须在文档流外（overlay 容器 / portal），而消费者以声明式框架（React/Vue）编写面板内容——内容节点天然落在组件的 light DOM。这迫使组件在打开时把消费者节点**物理迁移**进 portal 面板，关闭时迁回。该迁移与消费者框架的 vdom 调解存在固有张力：框架认为自己拥有这些节点，组件移动后框架的锚点假设失效。

三种已落地的实现形态：

1. **tooltip / select / dropdown / context-menu**：打开时 `moveContent` / `moveMenuChildren` 迁入面板，关闭时迁回原位（`restoreContent` / `_returnItemsToSlot`）。配套缓解：节点身份追踪、v-if 注入补偿（`scheduleRefresh` / slotchange / MutationObserver）。
2. **context-menu / dropdown 的菜单项隐藏**：关闭稳态下菜单项不能渲染（无触发布局与误点击），机制是把消费者子元素的 `slot` 属性改写为不存在的 slot 名（`context-menu-hidden` / `web-ui-menu-level-*-hidden`）——未分配节点不渲染，但节点留在文档流原位。
3. **select**：默认 slot 挂载在 shadow 内 `hidden` 的面板结构中，关闭稳态由**位置**承载（面板隐藏），零子项属性写入。

Q7b 曾要求把 context-menu 的 slot 属性 mutation（形态 2）返工为形态 3。实施中发现矛盾：

- 菜单顶层项**没有 slot 属性**（默认 slot 分发），要把「关闭稳态不渲染」改成位置承载，唯一途径是把子项迁进 shadow 内 staging（打开前寄存、打开时迁入面板）；
- 但 staging 让菜单项大部分时间脱离文档流，破坏三个既有测试保护的行为：消费者 `querySelector` 拿不到节点、框架把注释锚点替换为 wrapper 后菜单顺序错乱、框架删除已寄存节点后菜单不同步（slotchange 不覆盖 shadow 内变更）；
- 反直觉的结论：**形态 2 的 slot 属性 mutation 对消费者更友好**——节点始终留在文档流原位、可查询、框架锚点有效，仅「未分配 → 不渲染」。它在结构上等价于形态 3（select）的 hidden-panel-slot：都是「已分配给一个不渲染的位置」，差别只是状态由子项属性承载还是由容器结构承载。

## 决策

1. **内容迁移（打开态）维持现状**：tooltip、select、dropdown、context-menu 继续使用「打开迁入 portal、关闭迁回 + 身份追踪与注入补偿」。Q6a 定性为已缓解的架构决策——portal 是覆盖层的正当需求，迁移让消费者保持声明式；重做收益不明确、成本高。
2. **slot 属性 mutation（关闭态隐藏）在 menu 族保留**：`menu-tree.hideNestedMenuChildren` + 根组件的隐藏 slot 名机制维持。它对消费者的可操作性优于 staging 迁移，且与 select 的 hidden-panel-slot 在机制上同构。**context-menu 返工（Q7b）撤销**。
3. **slot 属性边界约束**：组件对消费者节点的写入仅限两类——(a) 覆盖层内容迁移的位置移动（形态 1），(b) menu 族关闭态隐藏的 slot 属性（形态 2）。其余公开 DOM 属性（id、class、style、data-*）一律不得写入；新增写入面需新 ADR。

## 后果

- `docs/research/collapse-api-design-patterns.md` 的证据链与本次实施记录共同构成「为什么不重做」的依据；后续若提出同类返工，先对照第 2 节的三点行为破坏。
- select 形态 3 与 menu 族形态 2 并存；两者等价性成立的前提（面板结构可承载 slot）在 menu 族不成立（顶层项无 slot 属性），该前提变化时重新评估。
- React/Vue 消费者对菜单项的引用在打开期间指向 portal 内节点（composed 事件 retarget 已处理）；关闭稳态下节点始终在宿主文档流内。
