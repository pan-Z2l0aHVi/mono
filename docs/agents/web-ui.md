# web-ui 任务路由

这是 `packages/web-ui` 的 task-specific 路由，不是组件百科。实现细节、完整事件表和交互语义以源码、测试与对应 ADR 为准；简单 UI 修改不需要预先加载全部章节或全部 ADR。局部硬约束见 [`packages/web-ui/AGENTS.md`](../../packages/web-ui/AGENTS.md)。

## 权威来源

- Lit、Shadow DOM 和框架无关组件边界：[ADR-0005](../adr/0005-web-ui-components.md)。
- 公共组件契约、原生事件、表单行为、跨框架 API 约定和 ARIA 回写：[ADR-0005](../adr/0005-web-ui-components.md)；面向消费者的 API 文档是 `packages/web-ui/docs/<component>.md`，包根 README 只是索引。
- Overlay 交互/定位/内容迁移、布局层级、design token 和 @lit/context 组合模式：[ADR-0006](../adr/0006-web-ui-composition.md)。
- React/Vue 类型适配、`$events` 和复合控件事件边界：[ADR-0005](../adr/0005-web-ui-components.md)。
- icon manifest、生成器和导出：[ADR-0005](../adr/0005-web-ui-components.md)。

## 修改前路由

- **单个组件的属性、slot、事件、无障碍或表单行为**：先看该组件的 `docs/<component>.md`、源码和聚焦测试；只有契约或事件模型发生变化时才读 ADR-0005。
- **受管组合**：成员追踪、下行广播与上行写回的通道读 ADR-0006；带 portal 的 option 组合走 `src/shared/option-portal`，不按 `GroupController` 处理。
- **覆盖层内容迁移或消费者节点写入**：打开时 portal 迁移、关闭态隐藏（menu 族隐藏 slot）与消费者 light DOM 写入边界见 ADR-0006。
- **slot-trigger 组件的 ARIA**：popover/dropdown/collapse 的 trigger 状态回写读 ADR-0005。
- **Overlay、portal、焦点、滚动锁定或层叠**：读 ADR-0006 中受影响的决策；定位引擎归属或新 overlay 定位路径也在其覆盖内，不加载无关组件语义。
- **主题 token 或 icon**：读 ADR-0006/0005 以及对应源码。
- **React/Vue 类型或事件**：读 ADR-0005 和对应的 `src/types/` 源码。
- **仅 CSS/视觉微调**：优先读取组件源码和相关 token；不因任务名称加载 overlay、框架适配或完整事件模型。
- **scrollbar**：组件内部滚动容器用 `src/assets/scrollbar.css` 的 `.wui-scroll` 读 theme 的 `--wui-scrollbar-handle`；该文件随组件样式 adopted 进 shadow，不在 `exports` 中。本包不引入第三方 scrollbar 库。
