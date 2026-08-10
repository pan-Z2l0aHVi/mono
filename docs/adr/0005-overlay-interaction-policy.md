# Overlay 交互策略

`no-scroll-lock` 可选择退出背景文档的滚动锁定，同时不引入模态语义；Overlay 内部的滚动区域仍可使用。Dialog 保持原生模态行为；Select、Dropdown 和 Context Menu 暴露 `no-scroll-lock`，而 Popover 和 Tooltip 始终不锁定滚动。运行时修改 `no-scroll-lock` 会立即生效。Select 在打开时将焦点保持在其 combobox 触发器上，并通过 `aria-activedescendant` 暴露当前选中项，若无选中项则暴露第一个可用选项。Dropdown 和 Context Menu 使用循环方向键导航、Home/End 键、右/左方向键子菜单导航、Enter/Space 激活，单次 Escape 仅关闭最深层的已打开菜单。Popover 仅聚焦其第一个可用的 `[autofocus]` 后代元素；若无此类元素则保留触发器焦点，并在关闭时仅当焦点仍在面板内时恢复该焦点。每个 Overlay 遵循明确的、组件特有的焦点模型，焦点归属不从滚动锁定状态推断。
