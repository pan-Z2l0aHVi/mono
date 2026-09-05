# ADR-0040: Web UI Collapse 单组件化与受管组合下行通道迁移 @lit/context

## 背景

ADR-0038 将 collapse 设计为根 + trigger + content 三元素 compound 组件族。组件在首次发布前（changeset 尚未 release），作者对 API 形态提出重新审视，并对照了 React 生态（Radix/shadcn）与主流 Web Component 库（Web Awesome、Vaadin、Spectrum、FAST、Element Plus、Material Web）的组合模式谱系（证据链见 `docs/research/collapse-api-design-patterns.md`）。

同时，受管子元素组合（segmented、radio-group、checkbox-group、button-group）的下行通道基于自研 symbol 直推（`defineGroupPresentation` 在子元素上安装接收函数），与 React Context / Vue provide-inject 的生态惯用机制不同，作者要求评估并迁移到社区标准方案 `@lit/context`。

调研的两个关键事实：

1. **Web Component 生态没有一家做 Radix 式三元素拆分**。主流只有单元素 disclosure（wa-details、vaadin-details）与根 + item（其余 accordion 族）两种形态。三元素拆分是 React 特有，其成立依赖 Context 分发与「安全卸载 children」——后者 web component 做不到（消费者 light DOM 不能由组件移除，只能 hidden/inert）。
2. **`@lit/context` 是纯下行拉取**（`context-request` 一次性 + 订阅推送），覆盖不了受管组合的全部通信面：成员追踪（querySelectorAll + MutationObserver/slotchange）、点击归因（`event.target` 定位 item）、选中态上行写回（`setItemSelected` 根写子项）都只能由 GroupController 驱动。

## 决策

### 1. Collapse 单组件化：default slot trigger + `slot="content"`

`web-ui-collapse` 重写为单元素双插槽；`web-ui-collapse-trigger` / `web-ui-collapse-content` 两个元素在首次发布前删除（无破坏成本）。

- **trigger 语义来自 slot 内的交互元素**：原生 `<button>` / `<web-ui-button>` 等原生提供 Enter/Space 激活与焦点；组件把 `aria-expanded` / `aria-controls` / `aria-disabled` 回写到 trigger slot 的首个 assigned element（与 popover trigger 的既定回写模式一致）。组件不做 `role="button"` 补齐——纯文本 trigger 无键盘/焦点语义，是已记录的限制。
- **已知取舍（接受）**：trigger 由消费者提供后，a11y 语义依赖消费者放入可交互元素——这是 slot 组合模式的固有属性（popover/dropdown 同款），由文档声明要求。
- **保留自 ADR-0038 的技术决策**：grid `0fr ↔ 1fr` 动画选型、三态关闭稳态（默认容器 hidden / `keep-mounted` 内部 inert / 动画中 inert + pointer-events）、`UserChangeController` 仅用户来源事件、reduced-motion token 清零、代际计数丢弃过期管线。`keep-mounted` 从 content 元素上移到根元素。
- **headless 内核**：组件不携带视觉样式（trigger 与内容排版由消费者提供），只保留动画与三态稳态必需的结构规则。这是库内首个 headless 组件；未来组件是否跟随此方向另行决策。

### 2. 受管组合下行通道迁移 @lit/context（仅下行）

`defineGroupPresentation` / `defineGroupCoordinator` / `defineGroupManaged` 的 symbol 直推替换为 `ContextProvider` / `ContextConsumer`（新依赖 `@lit/context`）：

- **载荷形状**：`ReadonlyMap<HTMLElement, Context>`——root 上单个 provider 以整表广播，子项按自身元素取条目。按载荷形状分两个 context key（selection / button-group），避免异构树串扰。
- **通信边界**：仅下行（disabled 继承、direction/isLast 展示态）。成员追踪、点击归因、`setItemSelected` 上行写回保持 GroupController 直驱——context 覆盖不了这些方向。
- **离开组的语义**：子项被移出 provider 子树时 `ContextConsumer` 只是静默退订，不会收到「条目已移除」通知；`defineGroupManaged` 在 `hostDisconnected` 显式清空上下文，恢复独立控件语义（如 checkbox 恢复自身表单提交）。
- **时序保证**：custom element 升级顺序保证祖先先于后代，provider 总是先于子项请求就绪；`context-request` composed，可穿过中间 shadow 边界。与旧 symbol 直推相比，新机制放弃了「子项先于根升级」这一理论上可自愈的时序窗口——被共同打包的 import 图封死，不构成实际风险。

### 3. 库内组合模式谱系（术语口径）

| 模式             | 组件                                                                | 关键特征                                                                                           |
| ---------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 覆盖层 slot 组合 | popover、dropdown、tooltip、dialog、drawer、collapse（新）          | 面板脱离文档流（portal）或文档流内单元素；trigger 经命名 slot 提供，ARIA 回写首个 assigned element |
| 受管子元素组合   | select+option、segmented、radio-group、checkbox-group、button-group | 子项是公开 custom element；GroupController 驱动成员追踪 + @lit/context 下行 + 上行写回             |

## 后果

- `web-ui-collapse-trigger` / `web-ui-collapse-content` 在首次发布前移除，无迁移成本；README 双语、React/Vue demo、类型 fixtures 同步更新。
- 新增 `@lit/context` 运行时依赖（web-ui dependencies）；其「纯下行」边界要求未来新增受管组合时仍以 GroupController 承担成员与上行逻辑。
- collapse 是首个 headless 组件；其 `::part` / token 表面（如 trigger 自由样式的需求）尚未暴露，按需追加。
- 未来 accordion（ADR-0038 预留）演进路径需重新评估：单组件形态下 accordion 更自然的是根 + item（Element Plus / wa-accordion 形态），与单元素 collapse 并存（Web Awesome 的 details 与 accordion 即并存先例）。
