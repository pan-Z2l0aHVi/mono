---
'@greypan/web-ui': major
---

全量契约收敛：统一 Pointer Events、公开事件模型、原生表单关联、公开契约测试。

## 破坏性变更

### 属性重命名

- **Switch**: `open` 属性更名为 `checked`（表示开关状态，不再是可见性）

### 事件变更

- **Switch**: 移除 `open-change`，用户交互改派发 `input` + `change`
- **Checkbox**: 移除 `update:checked`（Vue 实现泄露），改派发 `input` + `change`
- **CheckboxGroup**: 移除 `value-changed`，改派发 `input` + `change`
- **BackTop**: 移除 `visible-change`（scroll 驱动可见性是内部行为）

### 方法移除

- **Switch**: 移除 `show()`、`close()` 方法（不再有可见性概念）

### Pointer Events 迁移

- **Tooltip, Popover, DropdownMenu, ContextMenu**: `mouseenter`/`mouseleave` 替换为 `pointerenter`/`pointerleave`
- **Input, Slider**: `mousedown` 替换为 `pointerdown`

### 新增表单行为

- 10 个表单控件新增 `static formAssociated = true` 和 ElementInternals 实现
- 新增 `name`、`required` 属性（input, textarea, input-number, select, slider, checkbox, radio, switch, segmented, checkbox-group, radio-group）

### 类型变更

- React/Vue 包装类型从新的 `$events` 接口推导
- 移除 `onUpdateChecked`、`onValueChanged`、`onVisibleChange` 事件监听器类型

### 运行时规范化

- 字面量属性在运行时校验非法输入并回退到文档化默认值
