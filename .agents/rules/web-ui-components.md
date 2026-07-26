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

### 主题 token 与浮层

- 可见组件必须优先消费 `web-ui-theme` 提供的 `--wui-*` 语义 token，并在 `var()` 中保留当前浅色值 fallback，保证未使用主题的调用方外观不变。
- `--wui-color-surface-glass` 用于透明度高的玻璃控件（button、input 等）；`--wui-color-surface-overlay` 用于透明度低的全局弹出层（drawer、dialog、dropdown、context-menu、toast 等）。两者的区别在于背景透明度：控件用高透明度让内容透出，弹出层用低透明度保证可读性。
- `--wui-color-surface-raised` 分三个层级，组件根据视觉对比度需求选用：`raised`（最浅，checkbox、radio 等小面积控件）、`raised-mid`（中间，button secondary、empty 等）、`raised-deep`（最深，switch、slider 等需要强对比的控件）。交互状态（hover/active）通过 `color-mix()` 从对应层级 token 向 `--wui-color-text` 混合派生。
- 禁止把组件样式注入 `document.head`。需要 portal 的组件应解析最近的 `web-ui-theme` overlay root；没有主题时使用组件库内部 Shadow DOM fallback。
- 组件内部变量可以存在，但不是稳定公开 API；调用方仅依赖公开语义 token。
- 布局组件中的 sticky header 必须建立高于内容区和侧栏的层叠级别，保证其内非 portal 浮层在狭窄视口溢出时仍可命中。
- 本地浮层只使用组件内部的局部层级；`portal=true` 的 Select、Popover、Tooltip 与 Portal 菜单使用菜单层级。Toast 高于菜单，加载遮罩高于 Toast，Dialog 和 Drawer 使用原生 top layer。
- BackTop 属于应用辅助层，高于基础内容、低于 Portal 菜单；调用方只能通过其语义层级变量调整位置，不能依赖数值层级。

### 公共层级 Token

`web-ui-theme` 提供以下稳定 CSS token；调用方可以覆盖 token，但不得依赖其默认数值：

| Token                       | 语义                                                        |
| --------------------------- | ----------------------------------------------------------- |
| `--wui-layer-base`          | 基础内容与侧栏                                              |
| `--wui-layer-header`        | sticky header                                               |
| `--wui-layer-auxiliary`     | BackTop 等应用辅助控件                                      |
| `--wui-layer-local-overlay` | 组件内部非 Portal 浮层                                      |
| `--wui-layer-menu`          | Portal 菜单，以及 `portal=true` 的 Select、Popover、Tooltip |
| `--wui-layer-menu-submenu`  | Portal 菜单的子菜单                                         |
| `--wui-layer-toast`         | Toast 通知                                                  |
| `--wui-layer-loading`       | 全屏加载遮罩                                                |

显式 `overlayContainer` 继承这些 token 的 fallback，但其祖先 stacking context 由调用方负责。

`--web-ui-back-top-z-index` 保留为 BackTop 的兼容别名；新代码应覆盖 `--wui-layer-auxiliary`。

共享 theme overlay root 中的 Portal 菜单必须在 `assets/menu-portal.css` 定义层级规则；组件自身 Shadow DOM 的样式不会穿透到该 root。

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

组件专用状态属性不得使用 HTML 全局属性名（例如 `hidden`、`title`、`role`），避免与宿主元素的原生语义冲突。布尔属性的声明式名称使用 kebab-case，并在 `@property` 中通过 `attribute` 显式映射。

需要调整浮层、徽标等定位组件的像素位置时，优先提供独立的 `offset-x`、`offset-y` 数值属性；偏移方向按屏幕坐标定义，避免使用框架特有的数组属性语法。

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
- **内容优先级**：同时提供文本 prop 与同用途 slot 时，slot 内容优先；组件应在 slot 动态插入和移除后同步布局状态。

## 生命周期与全局副作用

- 涉及 document 事件、portal、滚动锁等全局副作用的组件，必须只释放自身已取得的资源。
- Lit 属性更新可能在组件卸载后才执行；`updated()` 中创建浮层或获取全局资源前必须确认组件仍处于连接状态。

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
- 支持水平与垂直方向的控件必须同步设置正确的 `aria-orientation`
- `disabled` 状态的组件必须设置 `aria-disabled` 或在禁用时阻止交互
- 图标组件必须设置 `aria-hidden="true"`
- 使用 `:focus-visible` 而非 `:focus` 处理键盘焦点样式，避免鼠标点击时出现 focus ring
- `<dialog>` 优先使用原生 `<dialog>` 元素及其 `showModal()`/`close()` API，而非手动管理 `aria-modal`

## 表单组件规范

- 表单类组件（input、select、option）必须支持 `value` 属性双向绑定
- 值变化时必须派发 `Event('input', { bubbles: true, composed: true })`，使 Vue 自定义元素的 `v-model` 能同步 `value`；提交型控件还必须派发 `Event('change', { bubbles: true, composed: true })`。
- 可放入原生 `<form>` 的自定义表单控件必须声明 `static formAssociated = true`，并通过 `ElementInternals` 同步表单值、约束校验和禁用状态
- Shadow DOM 内的原生表单控件必须转发宿主元素的 `aria-label` 和 `aria-labelledby`，确保控件具备可访问名称
- Select/Option 组件使用 CustomEvent 注册/注销模式：option 在 `connectedCallback` 派发 `option-register`，parent select 监听并管理选项列表
- Select 必须在 option 注册、注销、slotchange 及初始渲染时同步 `value` 对应的 `selected` 状态并请求重渲染，保证框架先传入 `value`、后批量投影 option 时标签仍可回显。
- 管理 slot 子表单控件的 group 组件必须通过子项公开属性读写状态，不能依赖 HTML 属性；框架可能只设置属性而不反射属性
- group 组件必须在 slot 子项插入或删除后重新同步状态，覆盖框架延迟挂载和条件渲染
