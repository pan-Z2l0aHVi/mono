# web-ui 组件开发规范

## 图标管理

- 开发 web-ui 组件用到新图标时，必须将图标 ID（如 `"lucide:file"`）添加到 `packages/web-ui/icons.used.json`
- 构建时 Vite 插件会根据该配置自动生成图标模块，否则图标不可用

## 类型补全

- 新增组件后，必须同步更新 `packages/web-ui/src/types/vue.ts` 和 `packages/web-ui/src/types/react.ts`
- 在两个文件中：
  1. import 增加新组件的类类型（如 `WebUiTooltip`）
  2. `WebUiComponents` 接口增加 tag → wrapper 映射（如 `'web-ui-tooltip': LitVueWrapper<WebUiTooltip>`）
- 否则 Vue/React 的 JSX 类型补全不会生效

## CSS 样式规范

### Box-sizing

每个组件的 CSS 文件**必须以**以下通用选择器开头，确保 Shadow DOM 内部所有元素使用 `border-box`，不依赖页面全局 reset：

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

### `:host` 职责划分

`:host` 只承担以下职责：

| 属性                       | 位置原因                                                               |
| -------------------------- | ---------------------------------------------------------------------- |
| `display`                  | Host 本身负责布局                                                      |
| `contain`                  | 性能优化                                                               |
| `cursor`                   | 光标作用于宿主元素（包括 `:host([disabled]) { cursor: not-allowed }`） |
| Design tokens（`--wui-*`） | 从宿主级联入 shadow root                                               |

所有视觉表现（`opacity`、`background`、`border`、`color`、`font`、`transform`、`filter`）放在 shadow root 内部元素上。

禁止将以下属性放在 `:host` 上（外部 CSS reset 如 Tailwind v4 的 `@layer base * { margin: 0 }` 会覆盖这些属性）：

```css
/* ❌ 错误 — 外部 reset 可覆盖 */
:host {
  margin: 4px 8px;
  padding: 8px;
  color: #333;
}

/* ✅ 正确 — shadow root 内的样式不受外部影响 */
:host {
  display: block;
}
.wrapper {
  margin: 4px 8px;
  padding: 8px;
  color: #333;
}
```

### Disabled 态实现原则

**不依赖 `pointer-events: none` 实现禁用。** 理由：

1. `pointer-events: none` 导致 hit-testing 跳过该元素，同元素的 `cursor` 属性不生效
2. 禁用态组件上的 tooltip 需要 hover 事件，`pointer-events: none` 会阻止它
3. 事件拦截由组件逻辑层负责（JS 中检查 `this.disabled`），CSS 只负责视觉

禁用态的标准模式：

```css
:host([disabled]) {
  cursor: not-allowed;
  opacity: 0.4;
  /* 没有 pointer-events: none — 事件由 JS 拦截 */
}
```

`pointer-events: none` 仅限以下场景使用：

- 遮罩层/覆盖层（点击穿透）
- 透明 tooltip panel（不阻挡下方交互）
- 动画占位克隆元素（`.svg-clone`）

## Lit 模板规范

- **动态 class**：统一使用 `classMap()` 指令，禁止内联对象 `${{ class: value }}`（会 stringify 为 `[object Object]`）和三元表达式
  ```ts
  import { classMap } from 'lit/directives/class-map.js'
  // ✅ 正确
  html`<div class=${classMap({ active: this.isActive, hidden: !this.visible })}></div>`
  // ❌ 错误 — 对象会 stringify 为 "[object Object]"
  html`<div class=${{ active: this.isActive }}></div>`
  // ❌ 错误 — 多 class 时可读性差
  html`<div class=${this.isActive ? 'active' : ''}></div>`
  ```
- **动态 style**：使用 `styleMap()` 指令或模板字符串，禁止直接拼接字符串（XSS 风险）
- **条件渲染**：使用 `nothing` sentinel 而非 `null` 或空字符串
- **slot 投影**：父组件通过 `slot="name"` 属性选择器投影，子组件通过 `<slot name="name">` 接收

## `:host` 选择器语法

**:host 属性选择器必须用顶层声明 + 括号语法**，禁止嵌套 `&[attr]` 写法：

```css
/* ✅ 正确 */
:host {
  display: block;
}
:host([visible]) {
  opacity: 1;
}

/* ❌ 错误 — 编译为 :host[visible]（无括号），兼容性问题 */
:host {
  display: block;
  &[visible] {
    opacity: 1;
  }
}
```

## 可访问性（a11y）

- 交互式组件必须设置 `role` 属性（如 `role="button"`, `role="menuitem"`, `role="dialog"`）
- 表单控件必须关联 `<label>` 或设置 `aria-label`
- `disabled` 状态的组件必须设置 `aria-disabled` 或在禁用时阻止交互
- 图标组件必须设置 `aria-hidden="true"`
- 使用 `:focus-visible` 而非 `:focus` 处理键盘焦点样式，避免鼠标点击时出现 focus ring
- `<dialog>` 优先使用原生 `<dialog>` 元素及其 `showModal()`/`close()` API，而非手动管理 `aria-modal`

## 表单组件规范

- 表单类组件（input、select、option）必须支持 `value` 属性双向绑定
- 必须派发 `Event('change', { bubbles: true, composed: true })` 以支持框架（Vue/React）的 v-model/value 绑定
- Select/Option 组件使用 CustomEvent 注册/注销模式：option 在 `connectedCallback` 派发 `option-register`，parent select 监听并管理选项列表
- 管理 slot 子表单控件的 group 组件必须通过子项公开属性读写状态，不能依赖 HTML 属性；框架可能只设置属性而不反射属性
- group 组件必须在 slot 子项插入或删除后重新同步状态，覆盖框架延迟挂载和条件渲染
