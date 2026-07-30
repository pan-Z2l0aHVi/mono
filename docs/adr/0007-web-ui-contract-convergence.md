# ADR-0007: web-ui 全量契约收敛

## 背景

`@greypan/web-ui` 的 34 个 Lit Web Component 在 v1.x 迭代中积累了若干不一致：

- Switch 用 `open` 表示选中状态，与其他表单控件的 `checked` 不一致
- Checkbox 派发 `update:checked`（Vue 框架泄露），而非标准 `input`/`change`
- BackTop 派发 `visible-change`（scroll 计算泄露），调用方无法干预可见性
- 多个组件混用 `mouseenter`/`mouseleave` 和 Pointer Events
- 表单控件未实现 `formAssociated`，无法参与原生表单提交和校验
- 测试依赖 shadowRoot 内部结构，阻碍重构
- 类型中存在 `any` 断言和 `EventListener` 强转

由于当前没有线上调用方，允许一次性执行破坏性变更，不保留弃用别名或兼容层。

## 决策

### 1. 统一 Pointer Events

- `mouseenter`/`mouseleave` → `pointerenter`/`pointerleave`
- `mousedown` → `pointerdown`
- 拖拽场景使用 `setPointerCapture` + `pointercancel` 清理
- 外部点击关闭使用语义化 `click`，不将键盘激活误判为指针事件
- `contextmenu` 保留为独立语义事件

### 2. 统一事件模型

| 组件类型                                                             | 事件               | 说明                                                    |
| -------------------------------------------------------------------- | ------------------ | ------------------------------------------------------- |
| 值类控件（input/select/slider/checkbox/radio/switch/segmented）      | `input` + `change` | 用户交互触发；直接设属性不派发                          |
| 开闭组件（dialog/drawer/popover/tooltip/context-menu/dropdown-menu） | `open-change`      | `CustomEvent<{ open: boolean }>`                        |
| 通知（toast）                                                        | `toast-close`      | `CustomEvent<{ id: string; reason: ToastCloseReason }>` |

移除的实现泄露事件：

- `update:checked`（checkbox）→ 改为 `input` + `change`
- `value-changed`（checkbox-group）→ 改为 `input` + `change`
- `visible-change`（back-top）→ SCROLL 驱动可见性是内部行为，不对外暴露

### 3. 原生表单关联

10 个表单控件实现 `static formAssociated = true` + `ElementInternals`：
input, textarea, input-number, select, slider, checkbox, radio, switch, segmented, checkbox-group, radio-group

关键行为：

- 通过 `internals.setFormValue()` 同步表单值
- 实现 `formResetCallback()` 和 `formDisabledCallback()`
- 添加 `name` 和 `required` 属性
- 子项组件（option/radio/segmented-trigger）不重复提交表单值

### 4. 运行时参数规范化

引入 `src/shared/normalize/index.ts`：

- `normalizeLiteral(value, allowed, default)` — 字面量属性校验
- `normalizeNumber(value, min, max, default)` — 数值范围校验

替代宽泛的类型断言和静默的非法值吞没。

### 5. Switch 语义修正

- `open` 属性 → `checked`（表示开关状态，不是可见性）
- 移除 `show()`/`close()` 方法
- 移除 `open-change` 事件，改派发 `input` + `change`

### 6. 公开契约测试

测试从验证 shadowRoot 内部结构转向验证公开契约：

- 宿主属性默认值和反射
- 公开方法调用
- 派发事件及其 detail
- 语义角色和 aria-\* 属性（通过 semantic selector 查询）
- FormData 集成（formAssociated 组件）
- slot 投影

禁止测试：shadowRoot 内部 class、私有字段、CSS 样式、实现顺序。

### 7. 双层测试配置

- **jsdom 层**：所有组件的契约测试，验证属性、事件、a11y 语义、FormData
- **Chromium 层**（Vitest Browser Mode + Playwright）：交互组件的 Pointer 事件、键盘导航、焦点管理、portal、原生 dialog、滚动锁、表单提交/重置

## 影响

- **破坏性变更**：所有组件。属性名（switch.open→checked）、事件名（update:checked→input+change）、方法签名（switch.show/close 移除）、表单行为（新增 formAssociated 实现）均有变更
- **类型变更**：React/Vue 包装类型从新的 `$events` 接口推导，移除 `update:checked`、`value-changed`、`visible-change` 的事件监听器类型
- **测试变更**：31 份测试重写，4 份新测试（back-top、dropdown-header、layout、svg-draw-lines）
- **文档变更**：中英文 README 完整重写，AGENTS.md 更新 Pointer Events 和公开契约测试规范

## 替代方案

已考虑保留弃用别名（如 switch.open 兼容 checked），但由于无线上调用方，保留兼容层只会增加维护负担，不做此选择。
