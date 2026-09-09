# ADR-0044: Web UI 遵循 Tailwind v4 与 Native HIG Cursor 光标行为规范

- **Date**: 2026-09-04
- **Status**: 已接受

## 背景

在以往 WebUI 组件库开发中，几乎所有可点击的交互控件（`button`、`checkbox`、`radio`、`switch`、`segmented-trigger`、`select` 等）均被惯性指定为 `cursor: pointer`。Tailwind CSS v4 Preflight 不再为 button 类控件强制 `cursor: pointer`；本决策同时采用桌面原生控件更克制的取向：普通按钮、选择控件及表单触发器保持原生 `cursor: default`，`pointer` 继续保留给超链接/导航场景。同时，具备物理拖拽跟手特性的交互组件（如 `slider`、`switch`、`segmented`、`drawer`），在静态悬停、按压反馈与拖拽跟手阶段中的 Cursor 行为此前缺乏统一的微观模型。

## 决策

统一通用交互控件的 Cursor 规范，对齐 Tailwind CSS v4 的不介入取向与桌面原生控件习惯：

| 控件组                 | Cursor 行为                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 动作与选择控件         | `web-ui-button`、`checkbox`、`radio`、`select`、`option`、`segmented-trigger`、`input-number` 步进按钮、`toast` 关闭按钮：静态与 Hover 保持 `cursor: default`，以背景/边框状态反馈取代手型光标；`disabled` 为 `not-allowed`                                                                       |
| 手势与拖拽控件         | `slider`、`switch`、`segmented`：Hover 与按压阶段保持 `cursor: default`（scale、背景等按压反馈照常呈现，不改变 cursor）；进入拖拽态（`is-dragging`）切换为 `grabbing`；`disabled` 为 `not-allowed`。`slider` 与 `switch`/`segmented` 一样使用 6px 意图阈值过滤指针抖动，阈值未通过不进入 Dragging |
| 专用把手与调整尺寸控件 | `layout` 桌面横向分割条保持 `col-resize`（尚未实现 `row-resize`）；以拖拽为核心语义的专用把手（如 drawer 拖拽热区）为 `grab` → `grabbing`                                                                                                                                                         |
| 文本输入控件           | 可编辑的 `input` / `textarea` 保持 `cursor: text`；`textarea` 的 `:read-only` 保持 `cursor: default`（预先存在的例外）                                                                                                                                                                            |

## 后果

- 组件库通用控件光标行为与 Tailwind CSS v4 的不介入取向及桌面原生控件习惯保持方向一致；disabled 使用 `not-allowed` 是本库的明确选择。
- 所有具备拖拽手势的滑动组件（Slider、Switch、Segmented）在 Hover 与 Press 阶段保持桌面原生箭头，仅在真实拖拽开始后进入 `grabbing`，避免快速点击时的 `grab` 闪烁。
- 组件 cursor 样式位于 Shadow DOM 内，应用层普通选择器无法覆盖；当前也未通过 `::part` 或公共 cursor token 暴露定制面。若未来确有消费者需要定制，应先新增显式公共覆盖机制，而不是依赖全局 reset。
