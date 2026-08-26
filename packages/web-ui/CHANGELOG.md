# @greypan/web-ui

## 4.0.0

### Major Changes

- 1e52bc4: 重构 Web UI CSS token 契约：文本层级改为 `secondary/tertiary/disabled`，focus 指示器拆分为 `--wui-color-focus-ring` 和 `--wui-focus-ring-width`，并删除 `--wui-color-border-strong`。同时将 control surface、track、panel shadow、control size、layout duration 和 back-top 变量统一到语义化命名。
  
  本次不保留旧名兼容别名。需要迁移的主要映射：
  
  - `--wui-color-text-muted` → `--wui-color-text-secondary`
  - `--wui-color-text-faint` → `--wui-color-text-tertiary`
  - `--wui-color-border-strong` → focused 输入边框改用 `--wui-color-accent`
  - `--wui-focus-ring` → `--wui-color-focus-ring` + `--wui-focus-ring-width`
  - `--wui-button-size` → `--wui-control-size`
  - `--wui-color-surface-raised-mid` → `--wui-color-surface-control`
  - `--wui-color-surface-raised-deep` → `--wui-color-surface-track`
  - `--wui-shadow-pop` → `--wui-shadow-panel`
  - `--web-ui-back-top-*` → `--wui-back-top-*`
  - `--wui-duration-regular` → `--wui-duration-layout`
  - `--wui-ease-out` → `--wui-ease-enter`

### Patch Changes

- 1e52bc4: 统一表单关联控件的原生生命周期：`form.reset()` 会恢复首次连接时声明式初始化后的默认值，并为所有表单控件提供浏览器表单状态恢复支持；被 group 管理的 checkbox/radio 子项仍由父 group 统一管理。
- 1e52bc4: 将 `web-ui-button-group` 的子按钮组态改为内部派生的视觉上下文。`group`、`last` 与 `direction` 不再注入到子 button；请仅依赖按钮组的可见布局，不要读取这些实现属性。
- Updated dependencies [1e52bc4]
  - @greypan/js-kit@2.0.0
  - @greypan/browser-kit@2.0.0

## 3.0.1

### Patch Changes

- b9faa2c: enhance monorepo agent capabilities
- Updated dependencies [b9faa2c]
  - @greypan/browser-kit@1.7.8
  - @greypan/js-kit@1.6.7

## 3.0.0

### Major Changes

- 28a8dc5: 框架类型适配收窄：移除 Vue 全局 `ComponentCustomProps extends HTMLAttributes`（不再污染所有 Vue 组件），React 移除 lowercase `oninput`/`onchange` 事件别名，`$events` 只声明事件本体、宿主 target 由适配层统一注入（`WithHost` 注入 readonly `target`/`currentTarget`），`WebUiElementMap` 成为组件标签单一来源。peer 基线收窄：`@types/react >= 19`、`vue >= 3.5`。Vue `@input`/`@change` 的 `$event.target` 现为组件实例（cast-free），新增 `WebUiEvent<Component, EventName>` 供命名 handler 使用。

  运行时契约收敛：`checkbox-group`/`radio-group`/`segmented` 管理的子项（checkbox/radio/segmented-trigger）不再把同名 `input`/`change` 冒泡到 group 外——子项自身派发事件（`bubbles: false, composed: false`），group 以 capture 相位监听并只派发一次自己的 `input`/`change`，两者 `target`/`currentTarget` 均为 group。独立使用子控件时保持 `bubbles: true, composed: true`。group 上的消费端事件监听不再重复触发。

  详见 `docs/adr/0011-framework-type-adaptation-narrowing.md`。

### Minor Changes

- 28a8dc5: `web-ui-input`、`web-ui-input-number`、`web-ui-autocomplete` 新增 `readonly` 只读状态属性，补齐与 `web-ui-textarea` 的 API 一致性：值照常提交表单、控件可聚焦选中复制，但不可编辑。只读时隐藏清除按钮、禁用 input-number 步进按钮并阻止 autocomplete 展开下拉，同时跳过必填校验（原生 barred-from-validation 语义）。

  同时修复 `web-ui-input`、`web-ui-textarea`、`web-ui-input-number` 的公共 `change` 事件：原生 change 事件不 composed，无法穿透 Shadow DOM，此前声明的 change 在真实用户交互中从不触发宿主监听器；现在组件捕获原生 change 后补发 composed 事件，与 `$events`/README 声明一致。

  `web-ui-input-number` 提交空输入或 `-` 时保持原值、不补发 change（与既有键入行为一致），已在 README 明确「空输入视为无效、不提交」。

### Patch Changes

- 28a8dc5: 修复 Select、Autocomplete 和 Dropdown 浮层的宽度计算，以及菜单浮层在主题作用域内的挂载行为，避免长选项文本裁切和主题样式失效。同步优化 Overlay、Portal 与 Scroll Lock 的共享实现，统一生命周期工厂模式并整理测试目录。

## 2.1.8

### Patch Changes

- 7c06580: try workflows
- Updated dependencies [7c06580]
  - @greypan/browser-kit@1.7.7
  - @greypan/js-kit@1.6.6

## 2.1.7

### Patch Changes

- fa0f989: fix(select): portal 模式未打开时 trigger 显示已选值

## 2.1.6

### Patch Changes

- 8d9d809: fix web-ui css token

## 2.1.5

### Patch Changes

- Updated dependencies [32d3366]
  - @greypan/browser-kit@1.7.6

## 2.1.4

### Patch Changes

- cdc5cf7: Release pipeline validation: bump all public packages for trusted publishing verification.
- Updated dependencies [cdc5cf7]
  - @greypan/js-kit@1.6.5
  - @greypan/browser-kit@1.7.5

## 2.1.3

### Patch Changes

- 5c70639: provide back-top position css var

## 2.1.2

### Patch Changes

- 7db6d3e: Standardize Custom Element boolean attributes and replace default-true properties with semantic opt-out attributes.

## 2.1.1

### Patch Changes

- 45a2f38: udpate readme

## 2.1.0

### Minor Changes

- fff1c60: Correct React Custom Element event typings to use exact JSX keys such as `onopen-change` and `ontoast-close`.
  The previously generated camel-cased keys such as `onOpenChange` did not match the event dispatched at runtime.

### Patch Changes

- fff1c60: Make Checkbox Group, Radio Group, and Segmented disabled state inherited without changing child `disabled` properties. Effective disabled child controls now expose `aria-disabled` and leave the tab sequence.

## 2.0.2

### Patch Changes

- 384c683: some components add user select none

## 2.0.1

### Patch Changes

- 8768a2b: some components add user select none

## 2.0.0

### Major Changes

- 0a50d35: 全量契约收敛：统一 Pointer Events、公开事件模型、原生表单关联、公开契约测试。

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

### Patch Changes

- 26ca421: fix context-menu click-outside test for jsdom 30 compatibility

## 1.4.2

### Patch Changes

- 57f9984: fix mardkwon table format
- 57f9984: fix npm readme cn link
- Updated dependencies [57f9984]
- Updated dependencies [57f9984]
  - @greypan/browser-kit@1.7.4
  - @greypan/js-kit@1.6.4

## 1.4.1

### Patch Changes

- 734dea6: fix npm readme cn link
- Updated dependencies [734dea6]
  - @greypan/browser-kit@1.7.3
  - @greypan/js-kit@1.6.3

## 1.4.0

### Minor Changes

- be4008b: Standardize externalization to regex patterns for workspace deps; move msw to package-level devDependencies

  - `vite.config.ts` for `js-kit`, `browser-kit`, `web-ui`: replace hardcoded workspace dep names with `/^@greypan\//` regex; add missing external deps (`nanoid`, `msw`)
  - `browser-kit`: move `msw` from peerDependencies to devDependencies
  - `test-kit`: add `msw` to devDependencies for local type checking
  - `web-ui`: replace `react` peer dep with `@types/react`; add React/Vue usage documentation to README
  - `unplugin-web-components`: fix README import path to use `/vite` sub-path export
  - Fix documentation in READMEs and AGENTS.md to reflect current externalization rules

### Patch Changes

- Updated dependencies [be4008b]
  - @greypan/browser-kit@1.7.2
  - @greypan/js-kit@1.6.2

## 1.3.1

### Patch Changes

- c56dd3e: add tsconfig package
- Updated dependencies [c56dd3e]
  - @greypan/browser-kit@1.7.1
  - @greypan/js-kit@1.6.1

## 1.3.0

### Minor Changes

- a4e7f9b: vp monorepo standardization

### Patch Changes

- Updated dependencies [a4e7f9b]
  - @greypan/browser-kit@1.7.0
  - @greypan/js-kit@1.6.0

## 1.2.4

### Patch Changes

- 8f4643d: Audit and reorganize devDependencies/peerDependencies across all packages
- Updated dependencies [8f4643d]
  - @greypan/browser-kit@1.6.1
  - @greypan/js-kit@1.5.1

## 1.2.3

### Patch Changes

- a06335a: upgrade agents doc
- Updated dependencies [a06335a]
- Updated dependencies [a06335a]
  - @greypan/browser-kit@1.6.0
  - @greypan/js-kit@1.5.0

## 1.2.2

### Patch Changes

- Updated dependencies [874638d]
  - @greypan/browser-kit@1.5.0
  - @greypan/js-kit@1.4.0

## 1.2.1

### Patch Changes

- Updated dependencies [13802c0]
  - @greypan/browser-kit@1.4.0
  - @greypan/js-kit@1.3.0

## 1.2.0

### Minor Changes

- 8944472: Improve engineering structures

### Patch Changes

- Updated dependencies [8944472]
  - @greypan/browser-kit@1.3.0
  - @greypan/js-kit@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [ec36e92]
  - @greypan/js-kit@1.1.1
  - @greypan/browser-kit@1.2.1

## 1.1.0

### Minor Changes

- 4dfde81: 完善子包依赖，修复依赖缺失

### Patch Changes

- Updated dependencies [4dfde81]
  - @greypan/browser-kit@1.2.0
  - @greypan/js-kit@1.1.0

## 1.0.1

### Patch Changes

- Updated dependencies
  - @greypan/browser-kit@1.1.0
