# ADR-0044: Web UI 遵循 Tailwind v4 与 Native HIG Cursor 光标行为规范

## 背景

在以往 WebUI 组件库开发中，几乎所有可点击的交互控件（`button`、`checkbox`、`radio`、`switch`、`segmented-trigger`、`select` 等）均被惯性指定为 `cursor: pointer`。
Tailwind CSS v4 Preflight 不再为 button 类控件强制 `cursor: pointer`。本决策同时采用桌面原生控件更克制的取向：普通按钮、选择控件及表单触发器保持原生 **`cursor: default`**，`pointer` 继续保留给超链接/导航场景。
同时，具备物理拖拽跟手特性的交互组件（如 `slider`、`switch`、`segmented`、`drawer`），在“静态悬停”、“按压反馈”与“拖拽跟手”阶段中的 Cursor 行为此前缺乏统一的微观模型。

## 决策

**统一通用交互控件的 Cursor 光标规范，对齐 Tailwind CSS v4 的不介入取向与桌面原生控件习惯：**

1. **动作与选择控件（Standard Actions & Form Controls）**：
   - `web-ui-button` / `checkbox` / `radio` / `select` / `option` / `segmented-trigger` / `input-number` 步进按钮 / `toast` 关闭按钮：
     - 静态与 Hover：**`cursor: default`**（以背景/边框/High-Craft 状态反馈取代手型光标）。
     - 禁用态 (`disabled`)：**`cursor: not-allowed`**。

2. **手势与拖拽类控件（Gesture & Drag Controls）将 Cursor 与按压反馈解耦**：
   - 适用于 `slider`、`switch`、`segmented`：
     - **静态悬停 (Hover/Idle)**：**`cursor: default`**（保持系统原生箭头）。
     - **按压反馈 (Pressed / Active)**：保持 **`cursor: default`**；scale、背景等按压反馈可以即时呈现，但不改变 Cursor。
     - **手势拖拽中 (Dragging / `is-dragging`)**：**`cursor: grabbing`**（呈现握紧手掌，实时物理跟手）。
     - `slider` 与 `switch`、`segmented` 一样使用 **6px 意图阈值**过滤指针抖动；阈值未通过时不进入 Dragging。
     - 禁用态 (`disabled`)：**`cursor: not-allowed`**。

3. **专用把手与调整尺寸控件（Dedicated Handles & Resizer）**：
   - `layout` 当前仅提供桌面横向分割条，保持 **`cursor: col-resize`**；尚未实现 `row-resize`。
   - 以拖拽为核心语义的专用把手（如 drawer 拖拽热区）保持 **`cursor: grab` -> `cursor: grabbing`**。

4. **文本输入控件（Text Inputs）**：
   - 可编辑的 `input` / `textarea` 保持系统 **`cursor: text`**；`textarea` 的 `:read-only` 保持 **`cursor: default`**，这是预先存在的例外。

## 后果

- 组件库通用控件光标行为与 Tailwind CSS v4 的不介入取向及桌面原生控件习惯保持方向一致；disabled 使用 `not-allowed` 是本库的明确选择。
- 所有具备拖拽手势的滑动组件（Slider、Switch、Segmented）在 Hover 与 Press 阶段保持桌面原生箭头，仅在真实拖拽开始后进入 `grabbing`，避免快速点击时的 `grab` 闪烁。
- 组件 cursor 样式位于 Shadow DOM 内，应用层普通选择器无法覆盖；当前也未通过 `::part` 或公共 cursor token 暴露定制面。若未来确有消费者需要定制，应先新增显式公共覆盖机制，而不是依赖全局 reset。
