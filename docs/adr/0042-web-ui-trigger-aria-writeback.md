# ADR-0042: Web UI trigger 元素 ARIA 回写约定

## 背景

使用命名 slot 提供 trigger 的组件（popover、dropdown、tooltip、collapse）存在共同的可访问性缺口：trigger 包装结构（wrapper div 或 shadow 内容器）不可聚焦，AT 读不到其 aria 状态；消费者 slot 进来的元素才是真正的可聚焦交互元素，但组件此前没有把状态写回它身上。

- popover：`aria-expanded` / `aria-controls` 挂在 `slot="trigger"` 外层包装 div 上（Q8a 前状态）；
- dropdown：trigger 完全没有 ARIA 接线，仅面板有 `role="menu"`（Q9a 前状态）；
- collapse（单组件化后）：trigger 完全来自 default slot，ARIA 必须由组件写回（ADR-0040）。

库内已有一个「反向通道」先例：受管组合用 GroupController 把选中态从根写回子元素（上行写回）。trigger ARIA 回写是同一思路在 slot 组合上的应用。

## 决策

**约定：trigger 状态 ARIA 由组件回写到 trigger slot 的首个 assigned element。**

- **回写属性集**：`aria-expanded`（开合状态）、`aria-controls`（指向组件面板 id；面板未创建时省略）、`aria-haspopup`（menu 类组件）、`aria-disabled`（有禁用语义的组件）。
- **回写时机**：`updated()` 中与宿主状态同步（不依赖 open 分支）；trigger slot 内容晚到（slotchange）时通过 `requestUpdate()` 桥接一轮渲染完成回写——slotchange 不触发宿主响应式更新，直接在事件内写会绕过 Lit 的渲染管线。
- **面板 id**：popover 复用既有 `_panelId`；dropdown 根层级面板在 `_buildOverlay` 时分配 `wui-dropdown-menu-N`。
- **兼容性（additive）**：popover 包装 div 上的 `aria-expanded` / `aria-controls` 保留，不删除——已有消费者的选择器查询不受影响。
- **适用组件**：popover、dropdown、collapse；tooltip 的 trigger 是纯悬停目标（非交互控件，无开合语义），不适用。

**消费者要求**：trigger slot 内的首个元素应是可交互元素（原生 button、web-ui-button 等）；若放入纯文本/非交互元素，回写属性虽然存在，但该元素不可聚焦、键盘激活语义缺失（collapse 的 README 已声明此限制）。

## 后果

- popover / dropdown / collapse 的 trigger 元素在 AT 下报告正确的开合状态与关联面板。
- 回写发生在消费者元素上，消费者自己设置的同名属性会被组件覆写——这是组件拥有交互语义的必然结果，README 的「属性与事件边界」一节声明该优先级。
- 组件不再需要为 trigger 设计 wrapper 级 ARIA；未来新增 slot-trigger 组件直接沿用本约定。

## 已知边界（跨 shadow `aria-controls` IDREF）

collapse 的内容 track 位于 shadow root 内，`aria-controls` 的 IDREF 从 light DOM（trigger 元素）指向 shadow 内部 id，**不在 document 的 id 表中**（`document.getElementById` 无法解析）。ARIA IDREF 的解析规范要求同一可访问性树内解析，因此多数屏幕阅读器（VoiceOver/NVDA 因实现而异）可能无法建立「trigger ↔ 内容区」的控制关联。

- **不受影响的场景**：dropdown 的 `aria-controls` 指向 portal overlay——面板挂载在 document body 下的 overlay 容器，id 在 document 层可解析。
- **同类残余风险**：popover 的 `_panelId` 指向其 shadow 内面板，与 collapse 同款跨边界写法。
- **缓解**：`aria-expanded` 仍由 AT 可靠解析（不依赖 IDREF），disclosure 语义的主要信号不受影响；`aria-controls` 属增强关联，跨边界失效不阻断核心开合状态通告。
- **处置**：合入前不做代码改动（避免为可解析性引入 light DOM 锚点元素）；排期 VoiceOver/NVDA 真机验证，若确认失效则后续在 ADR 修订中评估「把 track id 复制到 light DOM 可解析锚点」方案。
