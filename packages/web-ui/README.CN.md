# @greypan/web-ui

> 基于 Lit 的 Web Components，支持 React、Vue 和原生 HTML

[English](./README.md) | 简体中文

## 演示

[查看组件在 vue 中使用](https://pan-z2l0ahvi.github.io/mono/vue-web-ui-demo/)

[查看组件在 react 中使用](https://pan-z2l0ahvi.github.io/mono/react-web-ui-demo/)

## 安装

```bash
npm install @greypan/web-ui
```

需要 `lit` 作为依赖。

## 快速开始

```js
import '@greypan/web-ui'
// import '@greypan/web-ui/components/button'
```

```html
<web-ui-button variant="primary">点击我</web-ui-button> <web-ui-icon .icon="${lucidePlus}"></web-ui-icon>
```

## 框架集成

### 跨框架 API 约定

`web-ui-*` 元素暴露三面 API，**DOM / JavaScript API 是事实来源**：Property 使用 camelCase，Attribute 使用
kebab-case，Event 使用 kebab-case。

| 表面      | 命名       | 示例                                          |
| --------- | ---------- | --------------------------------------------- |
| Property  | camelCase  | `open`、`sidebarCollapsed`、`noScrollLock`    |
| Attribute | kebab-case | `open`、`sidebar-collapsed`、`no-scroll-lock` |
| Event     | kebab-case | `open-change`、`sidebar-collapsed-change`     |

- **布尔 Attribute** 遵循原生 HTML 存在语义：不存在 → `false`，存在 → `true`。框架绑定写入的
  `disabled="false"` 是字符串 `"false"`，会被视为 true——**动态布尔必须绑定 Property**（camelCase），
  才能把 `false` 写成真实 property。
- **Vue**：动态绑定必须走 **Property**，使用 camelCase 属性名（`:sidebarCollapsed="x"`、`:open="x"`）。
  kebab-case 绑定（`:sidebar-collapsed="x"`）会被写成字符串 attribute，无法表达 `false`，请使用 camelCase
  property。`.prop` 修饰符只在 camelCase 属性名下有效（`:sidebarCollapsed.prop="x"`）。String/Number 值可
  保留 kebab-case attribute（`:max-height="120"`）。带值控件（`web-ui-input`、`web-ui-select`、
  `web-ui-autocomplete` 等）支持 `v-model`，编译为元素的 `value` property + `input` 事件。
- **React**：React 19 对 custom element 的 props 直接写 DOM property，因此使用 camelCase props
  （`open={open}`、`noScrollLock`、`value={value}`）。**不要把复杂数据（对象、数组）放进 attribute 字符串**，
  一律绑定为 property。kebab-case JSX prop 在 custom element 上会写成 attribute。

### React

需要 `@types/react >= 19` 作为可选 peer 依赖。

```ts
// vite.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'

export default {
  plugins: [unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true })]
}

// env.d.ts
import '@greypan/web-ui/types/react'
```

```tsx
import '@greypan/web-ui'

function App() {
  return (
    <>
      <web-ui-button variant="primary" onClick={() => alert('点击')}>
        按钮
      </web-ui-button>
      <web-ui-input onInput={e => console.log(e.currentTarget.value)} />
    </>
  )
}
```

#### React 自定义元素事件与布尔属性

React 19 按 JSX 键名中的 `on` 后缀原样注册 Custom Element 事件。事件名大小写敏感：`open-change`
必须绑定为 `onopen-change`，不能写成 `onOpenChange`。标准 `input`、`change`、`focus`、`blur`
事件使用 React 惯用的 `onInput`、`onChange`、`onFocus`、`onBlur` handler——其 `currentTarget`
类型为组件实例，value/checked 读取无需 cast；`target` 遵循 React SyntheticEvent 语义（`EventTarget`），
不承诺为组件实例。kebab-case 自定义事件携带精确类型的 `CustomEvent` detail。
布尔属性遵循原生 HTML 语义：属性缺失为 `false`，属性存在为 `true`。

```tsx
<web-ui-dialog
  open={open}
  noScrollLock
  onopen-change={event => setOpen(event.detail.open)}
/>
<web-ui-select value={value} onChange={event => setValue(event.currentTarget.value)} />
```

当组件会把子元素移入自身的 Portal Shadow DOM（例如 `web-ui-dropdown` 的菜单项）时，React 根节点的
合成 `onClick` 无法收到该子元素的事件。需要通过 `ref` 直接绑定原生事件：

```tsx
const itemRef = useRef<HTMLElement>(null)

useEffect(() => {
  const item = itemRef.current
  if (!item) return
  const close = () => setOpen(false)
  item.addEventListener('click', close)
  return () => item.removeEventListener('click', close)
}, [])

<web-ui-dropdown-item ref={itemRef}>粘贴并关闭</web-ui-dropdown-item>
```

在 `portal` 模式下，库会把面板内容物理移入浮层 Shadow DOM：

- React 按记录的插入父节点执行删除，因此裸条件子元素（`{condition && <el/>}`）的节点一旦已迁移，在面板打开期间无法删除：commit 失败，且该节点可能在面板关闭时重新出现。
- 请改为在稳定的包装元素内部做条件渲染——React 记录的插入父节点是包装元素，包装元素内部的增删在面板打开期间与开合周期内都保持可用（示例如下）。
- 面板打开期间的裸条件新增（向宿主追加内容）不受影响，会自动迁入面板。
- 保持内容始终挂载、仅切换可见性仍是有效的回退方案。

```tsx
<web-ui-popover portal open={open} trigger="manual">
  <div className="panel-body">{editing && <TagEditor />}</div>
</web-ui-popover>
```

### Vue

需要 `vue >= 3.5` 作为可选 peer 依赖。

Portal 面板支持实时渲染：浮层打开期间条件新增或删除的内容（`web-ui-select`、`web-ui-autocomplete`、
`web-ui-popover`、`web-ui-tooltip`、`web-ui-dropdown`、`web-ui-context-menu` 内的 Vue `v-if`）会按模板序
自动迁入打开中的面板；关闭时所有内容按原锚点位置恢复，后续 patch 继续正常工作。边界：面板打开期间对
keyed `v-for` 列表做中段 splice 或重排不受支持——Vue 的 keyed children diff 会以已迁入面板的兄弟节点
计算插入锚点，patch 失败且可能丢项；与编译路径无关（编译模板同样命中）。此类列表更新请在面板关闭后
进行，或只做尾部追加/删除。

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'

export default {
  plugins: [
    vue({
      template: { compilerOptions: { isCustomElement: tag => tag.startsWith('web-ui-') } }
    }),
    unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true })
  ]
}

// env.d.ts
import '@greypan/web-ui/types/vue'
```

```vue
<template>
  <web-ui-button variant="primary" @click="handleClick">按钮</web-ui-button>
  <web-ui-input v-model="value" />
  <web-ui-select :value="framework" @change="framework = $event.target.value" />
</template>
```

Boolean 属性必须用 **camelCase 属性名**绑定，而不是 kebab-case attribute。Vue 会把 attribute 绑定写成字符串，
而布尔 attribute 遵循「存在即 true」的语义——所以 `:sidebar-collapsed="false"` 会写出字符串 `"false"`，被当作 true。
改用 camelCase 属性名（`:sidebarCollapsed="false"`，或 `.prop` 修饰符）会让 Vue 直接写 DOM property：

```vue
<web-ui-layout
  header-glow
  :sidebarCollapsed="sidebarCollapsed"
  :sidebarOpen="sidebarOpen"
  @sidebar-collapsed-change="sidebarCollapsed = $event.detail.collapsed"
  @sidebar-open-change="sidebarOpen = $event.detail.open"
/>
```

Vue 事件类型零 cast：带值组件上的 `@input`/`@change` 解析到组件 emit，`$event.target` 即为组件实例，
`value`/`checked` 直接读取；kebab-case 事件（如 `open-change`）的 `$event.detail` 保持 `CustomEvent` 载荷类型。
命名 handler 用 `WebUiEvent<WebUiXxx, 'change'>` 标注；当变量或泛型表示事件名时，使用
`WebUiEventName<WebUiXxx>`，它只接受该组件 `$events` 的 string key。未声明为 emit 的原生事件
（`@click`/`@focus` 等）在任何 `web-ui-*` 元素上仍可绑定。

### 属性与事件边界

`web-ui-*` 元素是公开 DOM 边界。`id`、`class`、`style`、全局 HTML 属性和 `data-*` 保留在 Custom Element 宿主上，
不会复制到 Shadow DOM。只有组件文档明确声明语义映射时，原生元素属性才会传递。例如 `web-ui-button` 会把 `type`
映射到内部按钮，且仅接受 `button`、`submit`、`reset`；非法值会回退为 `button`。

ARIA 属性同样必须显式支持：使用组件文档化的命名属性，而不是通配 `aria-*` 透传。组件拥有自己的 role 和交互状态。
`click`、`input`、`change` 等浏览器 composed 原生事件仍是主要交互 API。`open-change` 等 kebab-case 自定义事件
仅描述用户操作导致的组件状态变化；程序化赋值 property 不会触发它们。

### Cursor 行为

交互控件使用原生箭头光标，而不是手型光标；disabled 控件使用 `not-allowed`。Slider、Switch 和 Segmented 在
hover 与按压反馈阶段保持箭头光标，仅在真实拖拽进行中切换为 `grabbing`。专用拖拽把手和 resize 控件保留各自
的专用光标。Cursor 样式位于 Shadow DOM 内，应用层普通选择器无法覆盖。

### 受控状态语义

`web-ui-*` 元素没有单一的「受控」契约；按交互性质分成三套状态模型，各组件族取其一。不要假设不同组件上的
`controlled` 含义相同。

**仅用户来源事件（所有 `open` 类组件：collapse、popover、dropdown、tooltip、dialog、drawer、back-top）。**
`*-change` 事件（`open-change` 等）只在用户来源的切换时派发；程序化赋值（`el.open = true`）或命令式调用
（`show()`、`close()`、`toggle()`）从不派发。组件**自管理**自己的 `open` 值，除非你在外部协调——你可以监听事件
并写回自己的状态，但组件不要求、也不等待这个写回。

**请求-写回模式（仅 dialog 与 drawer 的 `controlled`）。**
`controlled=true` 时，用户关闭操作（Escape、backdrop、内置关闭、拖拽释放）只*请求* `open=false`；组件不改自己的
状态，保持打开，直到Consumer写回 `open=false`。这是模态确认语义——关对话框/抽屉通常是需要Consumer批准的操作（未保存
表单、需确认），与即时开合不同，不能由组件自行提交。只有这两个模态组件使用该模式；即时开合家族（collapse、popover、
dropdown、tooltip）不需要它。

**原生表单模型（input、textarea、input-number、select、checkbox、radio、switch、autocomplete）。**
控件内部自管理 value/checked 状态；用户交互立即翻转，然后派发原生 `input`/`change` 事件。程序化赋值
（`el.checked = true`）覆盖内部状态。这与原生 `<input type="checkbox">` 一致——**没有 `controlled` prop 是因为
值总是可读可写**，React/Vue 层自备受控包装。

若翻转的持久化需要外部往返（例如开关应只有 API 调用成功后保持开启），使用**乐观更新**路径：

- 立即翻转，然后监听 `change`。
- 请求期间设 `loading`，阻断后续交互并显示 spinner。
- 失败后回写 property（`el.checked = false`）并提示 toast。

翻转先于批准的窗口被接受；不提供「批准前不翻转」的 `controlled` prop。

### 表单关联控件

所有表单控件均参与原生 `FormData`、约束校验、`form.reset()` 和浏览器表单状态恢复。控件会在**首次连接且声明式属性完成初始化后**捕获一次重置默认值；之后的运行时 property 更新不会改写该默认值。祖先 `fieldset` 的禁用状态会禁用交互和校验，但不会改写控件公开的 `disabled` 属性。对于 checkbox/radio group，父 group 是提交、重置和状态恢复的唯一所有者；被管理的子项不会独立提交或恢复状态。

## 所有组件

| 分类                  | 组件                                                      |
| --------------------- | --------------------------------------------------------- |
| **表单控件**          | [`<web-ui-input>`](#web-ui-input)                         |
|                       | [`<web-ui-textarea>`](#web-ui-textarea)                   |
|                       | [`<web-ui-editable-text>`](#web-ui-editable-text)         |
|                       | [`<web-ui-input-number>`](#web-ui-input-number)           |
|                       | [`<web-ui-select>`](#web-ui-select)                       |
|                       | [`<web-ui-autocomplete>`](#web-ui-autocomplete)           |
|                       | [`<web-ui-slider>`](#web-ui-slider)                       |
|                       | [`<web-ui-checkbox>`](#web-ui-checkbox)                   |
|                       | [`<web-ui-radio>`](#web-ui-radio)                         |
|                       | [`<web-ui-switch>`](#web-ui-switch)                       |
|                       | [`<web-ui-segmented>`](#web-ui-segmented)                 |
|                       | [`<web-ui-checkbox-group>`](#web-ui-checkbox-group)       |
|                       | [`<web-ui-radio-group>`](#web-ui-radio-group)             |
| **按钮**              | [`<web-ui-button>`](#web-ui-button)                       |
|                       | [`<web-ui-button-group>`](#web-ui-button-group)           |
| **浮层 / 模态**       | [`<web-ui-dialog>`](#web-ui-dialog)                       |
|                       | [`<web-ui-drawer>`](#web-ui-drawer)                       |
|                       | [`imagePreview()`](#imagepreview)                         |
| **文档流 Disclosure** | [`<web-ui-collapse>`](#web-ui-collapse)                   |
| **浮动**              | [`<web-ui-popover>`](#web-ui-popover)                     |
|                       | [`<web-ui-tooltip>`](#web-ui-tooltip)                     |
|                       | [`<web-ui-context-menu>`](#web-ui-context-menu)           |
| **菜单**              | [`<web-ui-dropdown>`](#web-ui-dropdown)                   |
|                       | [`<web-ui-dropdown-item>`](#web-ui-dropdown-item)         |
|                       | [`<web-ui-dropdown-divider>`](#web-ui-dropdown-divider)   |
|                       | [`<web-ui-dropdown-header>`](#web-ui-dropdown-header)     |
| **数据展示**          | [`<web-ui-avatar>`](#web-ui-avatar)                       |
|                       | [`<web-ui-badge>`](#web-ui-badge)                         |
|                       | [`<web-ui-empty>`](#web-ui-empty)                         |
|                       | [`<web-ui-icon>`](#web-ui-icon)                           |
|                       | [`<web-ui-spinner>`](#web-ui-spinner)                     |
| **布局与工具**        | [`<web-ui-layout>`](#web-ui-layout)                       |
|                       | [`<web-ui-back-top>`](#web-ui-back-top)                   |
|                       | [`<web-ui-svg-draw-lines>`](#web-ui-svg-draw-lines)       |
|                       | [`<web-ui-theme>`](#web-ui-theme)                         |
| **通知**              | [`<web-ui-toast>`](#web-ui-toast)                         |
| **子项**              | [`<web-ui-option>`](#web-ui-option)                       |
|                       | [`<web-ui-segmented-trigger>`](#web-ui-segmented-trigger) |

## API 参考

### 表单控件

表单控件声明 `static formAssociated = true`，集成原生 `<form>`：通过 `FormData` 提交值，实现 `formResetCallback()` / `formDisabledCallback()`。

#### `<web-ui-input>`

文本输入框，支持清除按钮和前后缀插槽。

| 属性          | 类型      | 默认值   | 说明                                                                  |
| ------------- | --------- | -------- | --------------------------------------------------------------------- |
| `value`       | `string`  | `''`     | 输入值                                                                |
| `type`        | `string`  | `'text'` | HTML input 类型                                                       |
| `placeholder` | `string`  | `''`     | 占位文本                                                              |
| `name`        | `string`  | `''`     | 表单字段名                                                            |
| `disabled`    | `boolean` | `false`  | 禁用状态                                                              |
| `readonly`    | `boolean` | `false`  | 只读状态                                                              |
| `required`    | `boolean` | `false`  | 必填校验                                                              |
| `clearable`   | `boolean` | `false`  | 显示清除按钮                                                          |
| `full`        | `boolean` | `false`  | 全宽                                                                  |
| `borderless`  | `boolean` | `false`  | ghost 形态：移除边框、背景与阴影；保留 padding、高度度量与 focus ring |
| `aria-label`  | `string`  | —        | 无障碍标签                                                            |

**事件：** `input`, `change`, `focus`, `blur`

**方法：** `focus()`, `blur()` —— 委托到内部原生 input（宿主自身不可聚焦）

**插槽：** `prefix`, `default`, `suffix`

**CSS 自定义属性：**

| 属性                      | 默认值                           | 说明         |
| ------------------------- | -------------------------------- | ------------ |
| `--wui-input-clear-color` | `var(--wui-color-text-tertiary)` | 清除按钮颜色 |

#### `<web-ui-textarea>`

多行文本输入框，支持自动调整高度。

| 属性              | 类型      | 默认值  | 说明                                                                  |
| ----------------- | --------- | ------- | --------------------------------------------------------------------- |
| `value`           | `string`  | `''`    | 输入值                                                                |
| `placeholder`     | `string`  | `''`    | 占位文本                                                              |
| `rows`            | `number`  | `3`     | 显示行数                                                              |
| `name`            | `string`  | `''`    | 表单字段名                                                            |
| `disabled`        | `boolean` | `false` | 禁用状态                                                              |
| `readonly`        | `boolean` | `false` | 只读状态                                                              |
| `required`        | `boolean` | `false` | 必填校验                                                              |
| `clearable`       | `boolean` | `false` | 显示清除按钮                                                          |
| `full`            | `boolean` | `false` | 全宽                                                                  |
| `borderless`      | `boolean` | `false` | ghost 形态：移除边框、背景与阴影；保留 padding、高度度量与 focus ring |
| `autosize`        | `boolean` | `false` | 自动调整高度                                                          |
| `max-height`      | `number`  | `0`     | 自动高度上限（px），`0` 表示不限制                                    |
| `minlength`       | `number`  | —       | 最小长度校验                                                          |
| `maxlength`       | `number`  | —       | 最大长度校验                                                          |
| `aria-label`      | `string`  | —       | 无障碍标签                                                            |
| `aria-labelledby` | `string`  | —       | 无障碍标签引用                                                        |

**事件：** `input`, `change`, `focus`, `blur`

**方法：** `focus()`, `blur()`, `select()`

**插槽：** `prefix`, `suffix`

**CSS 自定义属性：**

| 属性                         | 默认值                           | 说明         |
| ---------------------------- | -------------------------------- | ------------ |
| `--wui-textarea-width`       | `200px`                          | 文本域宽度   |
| `--wui-textarea-clear-color` | `var(--wui-color-text-tertiary)` | 清除按钮颜色 |

#### `<web-ui-editable-text>`

行内纯文本编辑器：点击文字就地编辑，失焦提交。文本层与编辑层共用一个盒，进入编辑态不会移动任何一个像素。

| 属性          | 类型      | 默认值  | 说明                                                                                                      |
| ------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `value`       | `string`  | `''`    | 当前值；首次连接时捕获声明式初值作为 `form.reset()` 默认，连接后修改 attribute 或 property 均不更新该初值 |
| `placeholder` | `string`  | `''`    | 值为空时显示的占位文本                                                                                    |
| `name`        | `string`  | `''`    | 表单字段名                                                                                                |
| `disabled`    | `boolean` | `false` | 禁用状态；只影响行为，不做视觉置灰                                                                        |
| `aria-label`  | `string`  | —       | 无障碍标签                                                                                                |

**事件：** `input`（每次输入）、`change`（失焦提交）、`cancel`（Escape 取消）

点击时光标落在点击处；键盘聚焦时落在文本末尾。`Enter` 插入换行并继续编辑。`Escape` 恢复到进入编辑时的值并派发 `cancel`。失焦提交草稿，空草稿提交 `''`，文本层回落 placeholder。

宿主是行内级盒子：未设宽度时随内容伸缩，折行后高度按行数增长。字体、颜色、文本对齐与空白处理全部继承外部上下文，因此编辑前它就是一段普通文字。

**CSS 自定义属性：**

| 属性                              | 默认值     | 说明               |
| --------------------------------- | ---------- | ------------------ |
| `--wui-editable-text-white-space` | `pre-wrap` | 两层的空白处理方式 |

共用盒子带来两个约束：`line-height` 需不小于 `1`，更紧凑时原生编辑层内容会高出自身盒子，文字被顶偏 1px；`nowrap` 加固定宽度时，超出盒宽的文案在文字态溢出显示、在编辑态于盒内滚动。

#### `<web-ui-input-number>`

数字输入框，支持步进按钮和键盘操作。

| 属性          | 类型      | 默认值     | 说明       |
| ------------- | --------- | ---------- | ---------- |
| `value`       | `number`  | `0`        | 当前值     |
| `min`         | `number`  | `0`        | 最小值     |
| `max`         | `number`  | `Infinity` | 最大值     |
| `step`        | `number`  | `1`        | 步进值     |
| `precision`   | `number`  | `0`        | 小数精度   |
| `placeholder` | `string`  | `''`       | 占位文本   |
| `name`        | `string`  | `''`       | 表单字段名 |
| `disabled`    | `boolean` | `false`    | 禁用状态   |
| `readonly`    | `boolean` | `false`    | 只读状态   |
| `required`    | `boolean` | `false`    | 必填校验   |

**事件：** `input`, `change`

ArrowUp/ArrowDown 键增减数值。空输入或 `-` 在提交时被忽略，值保持在最后一个有效数字。

#### `<web-ui-select>`

选择器下拉框，支持键盘导航和 Portal。

| 属性               | 类型                               | 默认值  | 说明                               |
| ------------------ | ---------------------------------- | ------- | ---------------------------------- |
| `value`            | `string`                           | `''`    | 选中值                             |
| `placeholder`      | `string`                           | `''`    | 占位文本                           |
| `name`             | `string`                           | `''`    | 表单字段名                         |
| `disabled`         | `boolean`                          | `false` | 禁用状态                           |
| `required`         | `boolean`                          | `false` | 必填校验                           |
| `portal`           | `boolean`                          | `false` | 在 theme-owned overlay root 中渲染 |
| `no-scroll-lock`   | `boolean`                          | `false` | 打开时不锁定页面滚动               |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —       | 显式 Portal 容器                   |

**事件：** `input`, `change`, `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `default`（投影 `<web-ui-option>` 元素）、`trigger`（自定义触发区域内容，替换默认 label 和箭头）

子 `<web-ui-option>` 通过 `option-register` / `option-unregister` 注册。支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航。

**CSS 自定义属性：**

| 属性                      | 默认值                             | 说明                  |
| ------------------------- | ---------------------------------- | --------------------- |
| `--wui-select-max-width`  | `500px`                            | 下拉框最大宽度        |
| `--wui-select-max-height` | `200px`                            | 下拉滚动区域最大高度  |
| `--wui-overlay-min-width` | `200px`                            | 下拉框最小宽度        |
| `--wui-select-bg-hover`   | `--wui-color-surface-glass-hover`  | Trigger 悬停背景      |
| `--wui-select-bg-active`  | `--wui-color-surface-glass-active` | Trigger 按下/打开背景 |

Portal 面板创建时会镜像 host 上解析后的这些变量；更新 host 后需重新打开 Portal 面板才会生效。

#### `<web-ui-autocomplete>`

可输入并过滤候选的单值选择器。

| 属性                 | 类型                               | 默认值       | 说明                                                                  |
| -------------------- | ---------------------------------- | ------------ | --------------------------------------------------------------------- |
| `value`              | `string`                           | `''`         | 当前输入文本（表单值）                                                |
| `selected-value`     | `string`                           | `''`         | 输入文本精确匹配 label 的非禁用 option 的 value（派生，只读）         |
| `placeholder`        | `string`                           | `''`         | 占位文本                                                              |
| `borderless`         | `boolean`                          | `false`      | ghost 形态：移除边框、背景与阴影；保留 padding、高度度量与 focus ring |
| `filter`             | `'none' \| 'prefix' \| 'contains'` | `'contains'` | 候选过滤模式（按 option label 匹配）                                  |
| `name`               | `string`                           | `''`         | 表单字段名                                                            |
| `disabled`           | `boolean`                          | `false`      | 禁用状态                                                              |
| `readonly`           | `boolean`                          | `false`      | 只读状态（不可输入、不可展开下拉）                                    |
| `required`           | `boolean`                          | `false`      | 必填校验                                                              |
| `allow-custom-value` | `boolean`                          | `false`      | 允许 Enter 提交不在候选中的 custom value                              |
| `portal`             | `boolean`                          | `false`      | 在 theme-owned overlay root 中渲染                                    |
| `no-scroll-lock`     | `boolean`                          | `false`      | 打开时不锁定页面滚动                                                  |
| `overlayContainer`   | `HTMLElement \| () => HTMLElement` | —            | 显式 Portal 容器                                                      |
| `aria-label`         | `string`                           | —            | 无障碍名称                                                            |
| `aria-labelledby`    | `string`                           | —            | 无障碍名称引用                                                        |

**事件：** `input`, `change`, `focus`, `blur`, `open-change` (`CustomEvent<{ open: boolean }>`)

**方法：** `focus()`, `blur()`

**插槽：** `default`（投影 `<web-ui-option>` 元素）、`trigger`（自定义触发器内容——替换默认输入框）、`empty`（替换无匹配空态；默认回退为“无匹配选项”）

键入时按 label 过滤候选（`contains` 或 `prefix`，`none` 关闭过滤）。选择 option 时文本回填为该项 label，`selected-value` 暴露该项的 value；`change` 在选择提交时触发。支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航。

**触发器：** 默认触发器是 shadow 内的 `web-ui-input`。把任意可编辑组件放进 `trigger` slot 即可替换它——包装 div 继续承载 combobox ARIA，并以 `data-custom-trigger` 标记当前使用自定义触发器，浮层始终以触发器元素为锚点。组件的 `focus()` / `blur()` 委托到当前生效的触发器：`web-ui-input` 与 `web-ui-textarea` 会把焦点落到内部原生控件；自定义触发器没有自己的 focus 重定向时，按宿主自身聚焦。

```html
<web-ui-autocomplete placeholder="描述问题">
  <web-ui-textarea slot="trigger" rows="3"></web-ui-textarea>
  <web-ui-option value="bug" label="缺陷"></web-ui-option>
  <web-ui-option value="feature" label="需求"></web-ui-option>
</web-ui-autocomplete>
```

自定义触发器与默认触发器共用同一份契约：字符串 `value` 承载文本、可聚焦，并派发组件委托监听的事件（`input`、`click`、`focus`、`blur`）。`web-ui-input` 与 `web-ui-textarea` 开箱即用；自定义元素只要暴露字符串 `value` property 即可接入。包装 div 不占 tab 位（`tabindex="-1"`）：顺序焦点归触发器自身，自定义触发器必须可聚焦，键盘用户才能到达 combobox。

多行触发器（可编辑元素为 `<textarea>`）保留 Enter 换行语义：Enter 不会选中高亮项，也不会提交 custom value，关闭面板用 Escape 或 blur。选择 option 仍会把该项 label 回写到触发器。单行自定义触发器保持默认的 Enter 语义。面板打开时 ArrowUp/ArrowDown 适用同一例外：方向键移动文本光标而不导航候选，该状态下键盘无法导航 option——用指针点击选择。面板关闭时 ArrowDown/ArrowUp 仍可打开面板。

启用 `allow-custom-value` 后，无匹配且无活动 option 时，Enter 会把当前输入原文作为 custom value 提交并关闭面板；`change` 会触发，`selected-value` 保持为空。组件不会自动创建 option，也不会 trim 原文。命中禁用 option 的文本不会绕过禁用语义，也不会派生为已选 option。

通过 `<div slot="empty">…</div>` 自定义静态、非交互的空态内容。Portal 渲染时该节点会迁入浮层，关闭后恢复到宿主。

**CSS 自定义属性：**

| 属性                            | 默认值  | 说明                 |
| ------------------------------- | ------- | -------------------- |
| `--wui-autocomplete-max-width`  | `500px` | 下拉框最大宽度       |
| `--wui-autocomplete-max-height` | `200px` | 下拉滚动区域最大高度 |
| `--wui-overlay-min-width`       | `200px` | 下拉框最小宽度       |

Portal 面板创建时会镜像 host 上解析后的这些变量；更新 host 后需重新打开 Portal 面板才会生效。

#### `<web-ui-slider>`

范围滑块，支持刻度标记和垂直方向。

| 属性       | 类型      | 默认值  | 说明         |
| ---------- | --------- | ------- | ------------ |
| `value`    | `number`  | `0`     | 当前值       |
| `min`      | `number`  | `0`     | 最小值       |
| `max`      | `number`  | `100`   | 最大值       |
| `step`     | `number`  | `1`     | 步进值       |
| `name`     | `string`  | `''`    | 表单字段名   |
| `disabled` | `boolean` | `false` | 禁用状态     |
| `required` | `boolean` | `false` | 必填校验     |
| `marks`    | `boolean` | `false` | 显示刻度标记 |
| `vertical` | `boolean` | `false` | 垂直方向     |

**事件：** `input`（拖拽中）、`change`（松开或键盘确认）

**方法：** `focus()`, `blur()`

支持 ArrowLeft/Right/Up/Down、Home/End、PageUp/PageDown 键盘导航。使用 pointer capture 处理鼠标、触控笔和触摸交互；组件 host 与触控轨道均声明 `touch-action: none`，拖拽激活期间同时阻止 `touchmove` 默认滚动，避免 iOS Safari 在横/纵拖拽过程中接管手势。

**CSS 自定义属性：**

| 属性                           | 默认值                              | 说明         |
| ------------------------------ | ----------------------------------- | ------------ |
| `--wui-slider-width`           | `200px`                             | 滑块宽度     |
| `--wui-slider-vertical-height` | `200px`                             | 垂直滑块高度 |
| `--wui-slider-height`          | `var(--wui-slider-track-size, 6px)` | 轨道厚度     |
| `--wui-slider-track-size`      | `6px`                               | 轨道尺寸     |
| `--wui-slider-thumb-width`     | `24px`                              | 滑块宽度     |
| `--wui-slider-thumb-height`    | `20px`                              | 滑块高度     |
| `--wui-slider-marks-inset`     | `0`                                 | 刻度内缩     |

#### `<web-ui-checkbox>`

单个复选框。

| 属性       | 类型      | 默认值  | 说明       |
| ---------- | --------- | ------- | ---------- |
| `checked`  | `boolean` | `false` | 选中状态   |
| `value`    | `string`  | `''`    | 表单提交值 |
| `name`     | `string`  | `''`    | 表单字段名 |
| `disabled` | `boolean` | `false` | 禁用状态   |
| `required` | `boolean` | `false` | 必填校验   |

**事件：** `input`, `change`

**插槽：** `default`（标签文本）

使用 `role="checkbox"` 和 `aria-checked`。Enter/Space 键盘切换。

**布局：** 宿主是 inline-flex 盒，高度由内容撑开、不继承页面行高，因此不会在指示器上下留出多余缝隙；`--wui-selection-control-size`（`18px`）决定指示器宽高，宿主与相邻文字的对齐固定为 `vertical-align: middle`。`<web-ui-radio>` 共用同一套契约。

**选中动画：** 对勾是控件自持的描边路径（不再走 `<web-ui-icon>` 图标资产），外层包 `<web-ui-svg-draw-lines>` 并带 `no-autoplay`，所以挂载时就已勾选的控件显示静态勾。勾选时线条自左向右按恒定笔速画出，时长取 `--wui-duration-trigger`（默认 160ms），在切换当下从已生效的主题解析，和指示器底色那条 transition 落在同一拍；取消时沿同一条路径收回到空白，而不是只淡出；主题范围为 `motion="reduced"` 时两者都跳过，两个状态直接切换。

**未激活态：** 未选中指示器的底色取 `--wui-color-surface-control`（与中性按钮同一档控件底），深色模式下也能和 `--wui-color-page` 分辨开。触发区内任意位置（指示器、间距或右侧 slot 标签）被 hover 时，该底色再叠 6% 状态层。hover 只在 `(hover: hover) and (pointer: fine)` 设备上生效；没有按下态，已选中和禁用态保持各自底色。`<web-ui-radio>` 共用同一套状态。

#### `<web-ui-radio>`

单个单选按钮。

| 属性       | 类型      | 默认值  | 说明       |
| ---------- | --------- | ------- | ---------- |
| `checked`  | `boolean` | `false` | 选中状态   |
| `value`    | `string`  | `''`    | 表单提交值 |
| `name`     | `string`  | `''`    | 表单字段名 |
| `disabled` | `boolean` | `false` | 禁用状态   |
| `required` | `boolean` | `false` | 必填校验   |

**事件：** `input`, `change`

**插槽：** `default`（标签文本）

**布局：** 与 `<web-ui-checkbox>` 共用同一套选择控件盒契约——宿主高度由内容撑开、不继承页面行高，指示器宽高走 `--wui-selection-control-size`，与相邻文字按 `vertical-align: middle` 对齐。

#### `<web-ui-switch>`

开关切换。

| 属性       | 类型      | 默认值  | 说明          |
| ---------- | --------- | ------- | ------------- |
| `checked`  | `boolean` | `false` | 打开/关闭状态 |
| `value`    | `string`  | `''`    | 表单提交值    |
| `name`     | `string`  | `''`    | 表单字段名    |
| `disabled` | `boolean` | `false` | 禁用状态      |
| `required` | `boolean` | `false` | 必填校验      |
| `loading`  | `boolean` | `false` | 加载状态      |

**事件：** `input`, `change`

使用 `role="switch"` 和 `aria-checked`。Pointer 事件管理按下状态。

#### `<web-ui-segmented>`

分段控制——单选按钮组。

| 属性       | 类型      | 默认值  | 说明             |
| ---------- | --------- | ------- | ---------------- |
| `value`    | `string`  | `''`    | 当前选中值       |
| `name`     | `string`  | `''`    | 表单字段名       |
| `disabled` | `boolean` | `false` | 禁用全部 trigger |
| `required` | `boolean` | `false` | 必填校验         |

**事件：** `input`, `change`

**插槽：** `default`（投影 `<web-ui-segmented-trigger>` 元素）

与原生 `<form>` 集成（通过 `ElementInternals`）。

根据 `value` 同步子 trigger 的 `checked` 状态。`disabled` 提供继承的有效禁用状态，不改写 trigger 自身的 `disabled` 属性。直接设 `value` 不派发事件。

按住当前选中项横向拖拽可滑动指示器，松手吸附到最近选项（快速抛掷按速度切换）。触摸面声明 `touch-action: none`，拖拽激活期间阻止 `touchmove` 默认滚动，避免 iOS Safari 中断手势。

#### `<web-ui-checkbox-group>`

多选复选框组。

##### 属性

| 属性        | 类型                         | 默认值       | 说明           |
| ----------- | ---------------------------- | ------------ | -------------- |
| `value`     | `string[]`                   | `[]`         | 已选项的值数组 |
| `name`      | `string`                     | `''`         | 表单字段名     |
| `disabled`  | `boolean`                    | `false`      | 禁用全部子项   |
| `required`  | `boolean`                    | `false`      | 必填校验       |
| `direction` | `'horizontal' \| 'vertical'` | `'vertical'` | 布局方向       |

**事件：** `input`, `change`

**插槽：** `default`（投影 `<web-ui-checkbox>` 元素）

同步子 checkbox 的 `checked` 状态。`disabled` 提供继承的有效禁用状态，不改写子项自身的 `disabled` 属性。监听子项 `change` 事件。`direction` 传入非法值时回退为 `vertical`。

##### Token

| Token                      | 默认值 | 说明                     |
| -------------------------- | ------ | ------------------------ |
| `--wui-checkbox-group-gap` | `8px`  | 成员 checkbox 之间的间距 |

在 group 元素本身，或同一个 `<web-ui-theme>` 作用域内的祖先元素上设置。theme 宿主会为自己的子树声明 `8px`，写在 `<web-ui-theme>` 元素之外的覆盖到不了 group。

```css
web-ui-checkbox-group {
  --wui-checkbox-group-gap: 16px;
}
```

#### `<web-ui-radio-group>`

单选组。

##### 属性

| 属性        | 类型                         | 默认值       | 说明                     |
| ----------- | ---------------------------- | ------------ | ------------------------ |
| `value`     | `string`                     | `''`         | 当前选中值               |
| `name`      | `string`                     | `''`         | 表单字段名（传递到子项） |
| `disabled`  | `boolean`                    | `false`      | 禁用全部子项             |
| `required`  | `boolean`                    | `false`      | 必填校验                 |
| `direction` | `'horizontal' \| 'vertical'` | `'vertical'` | 布局方向                 |

**事件：** `input`, `change`

**插槽：** `default`（投影 `<web-ui-radio>` 元素）

`disabled` 提供继承的有效禁用状态，不改写子项自身的 `disabled` 属性。`direction` 传入非法值时回退为 `vertical`。

##### Token

| Token                   | 默认值 | 说明                  |
| ----------------------- | ------ | --------------------- |
| `--wui-radio-group-gap` | `8px`  | 成员 radio 之间的间距 |

在 group 元素本身，或同一个 `<web-ui-theme>` 作用域内的祖先元素上设置。theme 宿主会为自己的子树声明 `8px`，写在 `<web-ui-theme>` 元素之外的覆盖到不了 group。

```css
web-ui-radio-group {
  --wui-radio-group-gap: 16px;
}
```

---

### 按钮

#### `<web-ui-button>`

样式化按钮，支持多种变体和加载状态。

| 属性         | 类型                                                         | 默认值     | 说明                                                          |
| ------------ | ------------------------------------------------------------ | ---------- | ------------------------------------------------------------- |
| `variant`    | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'`  | 按钮变体                                                      |
| `type`       | `'button' \| 'submit' \| 'reset'`                            | `'button'` | 内部按钮类型；非法值回退为 `button`                           |
| `disabled`   | `boolean`                                                    | `false`    | 禁用状态                                                      |
| `loading`    | `boolean`                                                    | `false`    | 加载旋转动画；与 `icon` 组合时 spinner 替换图标内容           |
| `full`       | `boolean`                                                    | `false`    | 全宽                                                          |
| `icon`       | `boolean`                                                    | `false`    | 纯图标模式                                                    |
| `size`       | `string`                                                     | `''`       | 按钮高度（px）；icon 模式下同时设为 min-width，默认保持正方形 |
| `aria-label` | `string`                                                     | —          | 无障碍标签（委托给内部按钮）                                  |

**事件：** 标准 `click`

**插槽：** `prefix`, `default`, `suffix`

`submit` 和 `reset` 不会提交或重置组件 Shadow DOM 外祖先 `<form>`。如需外部表单行为，请使用 form-associated 控件。

禁用和加载状态阻止 `click` 事件。

`icon` 与 `loading` 同时开启时，按钮只渲染 spinner，默认插槽图标不投影。默认 icon 几何保持正方形，`full` 或显式 width 除外。

**CSS 自定义属性：**

| 属性                     | 默认值        | 说明                   |
| ------------------------ | ------------- | ---------------------- |
| `--wui-button-width`     | `max-content` | 按钮宽度               |
| `--wui-button-px`        | `12px`        | 水平内边距             |
| `--wui-button-gap`       | `8px`         | 前缀/默认/后缀插槽间距 |
| `--wui-button-color`     | 随 variant    | 按钮文字颜色           |
| `--wui-button-bg`        | 随 variant    | 按钮背景颜色           |
| `--wui-button-bg-hover`  | 随 variant    | 悬停背景颜色           |
| `--wui-button-bg-active` | 随 variant    | 按下背景颜色           |

#### `<web-ui-button-group>`

按钮组，管理子按钮布局和方向。

| 属性        | 类型                         | 默认值         | 说明     |
| ----------- | ---------------------------- | -------------- | -------- |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | 布局方向 |

**插槽：** `default`（投影 `<web-ui-button>` 元素）

以内部派生的视觉上下文控制按钮组方向，不改写子按钮属性。

---

### 浮层 / 模态

#### `<web-ui-dialog>`

模态对话框，使用原生 `<dialog>` 的 `showModal()`。

| 属性                | 类型      | 默认值  | 说明                                                      |
| ------------------- | --------- | ------- | --------------------------------------------------------- |
| `open`              | `boolean` | `false` | 对话框可见性                                              |
| `no-scroll-lock`    | `boolean` | `false` | 打开时不锁定页面滚动                                      |
| `no-backdrop-close` | `boolean` | `false` | 禁止点击遮罩关闭                                          |
| `no-escape-close`   | `boolean` | `false` | 禁止按 Escape 关闭                                        |
| `controlled`        | `boolean` | `false` | Escape 与遮罩仅请求 `open=false`，由 Consumer 回写 `open` |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)。启用 `controlled` 后，Escape 与遮罩点击仅请求 `open=false`，Consumer 写入 `open=false` 前对话框保持打开。程序化 API（`showModal()`/`close()`/直接赋值 `open`）不受影响，始终直通且不派发事件。原生 dialog 关闭（如表单 `method="dialog"`）会被恢复为受控打开状态并重新发出同一请求。

**插槽：** `body`, `title`, `default`, `footer`

**方法：** `showModal()`, `close()`

使用原生 `<dialog>`，`@cancel` 阻止默认关闭行为。除非存在 `no-escape-close`，否则 Escape 调用 `close()`；除非存在 `no-backdrop-close`，否则点击遮罩关闭。启用 `controlled` 后，两者都只派发关闭请求而不自关闭。

> **Escape 归属**：Escape 由共享仲裁者统一判定，一次按键只关闭**最内层**的已打开浮层（popover、select、autocomplete、dropdown、context-menu、drawer、dialog 都参与）。例如在 drawer 内打开 select，第一次 Escape 只关 select，第二次才关 drawer。互不嵌套的并列浮层按打开顺序关闭最上层。正在播退场过渡的面板仍在场上，也仍由它接住 Escape——但只要还有别的浮层开着，那一次按键仍然归该层，「一次按键关一层」不因此改变。`image-preview` 同样参与：它的原生 `<dialog>` 会登记进同一个仲裁者，Escape 按层级判定；组件的 `cancel` handler 只是拦掉原生的瞬时关闭，把 top layer 保留到退场过渡结束。

**CSS 自定义属性：**

| 属性                          | 默认值                                     | 说明                                                                  |
| ----------------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| `--wui-dialog-width`          | `360px`                                    | 对话框宽度                                                            |
| `--wui-dialog-max-height`     | `90vh`                                     | 对话框最大高度                                                        |
| `--wui-dialog-overlay-bg`     | `var(--wui-color-backdrop)`                | 遮罩背景色                                                            |
| `--wui-dialog-bg`             | `var(--wui-color-surface-overlay)`         | 玻璃卡片背景色，回退到 `rgb(246 246 246 / 0.88)`                      |
| `--wui-dialog-padding`        | `20px 24px 24px`                           | 对话框表面内边距                                                      |
| `--wui-dialog-title-gap`      | `16px`                                     | 标题下方间距                                                          |
| `--wui-dialog-desc-gap`       | `24px`                                     | 正文内容下方间距                                                      |
| `--wui-dialog-footer-gap`     | `10px` / horizontal `12px`                 | Footer 按钮间距                                                       |
| `--wui-dialog-footer-justify` | `flex-end`（默认）/ `center`（horizontal） | Footer `justify-content`；horizontal 模式下覆盖为 `flex-end` 可右对齐 |
| `--wui-dialog-scale-enter`    | `1.1`                                      | 进场缩放起点：由 `1.1` 收缩到 `1`，退场反向                           |

#### `<web-ui-drawer>`

侧边抽屉，使用原生 `<dialog>` 并自带关闭动画。非 headless 模式下抽屉渲染为四周留边的浮动圆角卡片（与 layout sidebar 的卡片语言一致），弹性拖拽的位移表现为边距变化而非缺口。

| 属性                | 类型                                     | 默认值    | 说明                                                 |
| ------------------- | ---------------------------------------- | --------- | ---------------------------------------------------- |
| `open`              | `boolean`                                | `false`   | 抽屉可见性                                           |
| `placement`         | `'right' \| 'left' \| 'top' \| 'bottom'` | `'right'` | 滑入方向                                             |
| `heading`           | `string`                                 | `''`      | 标题文字（无 header 插槽时显示）                     |
| `closable`          | `boolean`                                | `false`   | 显示关闭按钮                                         |
| `no-scroll-lock`    | `boolean`                                | `false`   | 打开时不锁定页面滚动                                 |
| `no-backdrop-close` | `boolean`                                | `false`   | 禁止点击遮罩关闭                                     |
| `controlled`        | `boolean`                                | `false`   | 用户关闭仅请求 `open=false`，由 Consumer 回写 `open` |
| `headless`          | `boolean`                                | `false`   | 仅保留 overlay 行为，默认插槽不渲染内置抽屉 UI       |
| `dialog-label`      | `string`                                 | `''`      | 内部原生 dialog 的可访问名称；headless 模式必须提供  |
| `draggable`         | `boolean`                                | `false`   | 打开时在抽屉内缘显示 drag bar，支持拖拽关闭手势      |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)。启用 `controlled` 后，Escape、遮罩、内置关闭按钮和拖拽松手仅请求 `open=false`；Consumer 写入 `open=false` 前抽屉保持打开。程序化 API（`show()`/`close()`/直接赋值 `open`）不受影响，始终直通且不派发事件。若原生 dialog 在请求等待期间关闭，组件会恢复其打开的 top layer 状态并发出同一关闭请求。嵌套 drawer 时，内层 `open-change` 会 composed 冒泡穿过外层根，按 `event.target` 区分。

**插槽：** `header`, `default`, `footer`；启用 `headless` 时仅渲染 `default` 插槽。

**方法：** `show()`, `close()`

`headless` 保留原生 dialog、遮罩、placement 动画、Escape/遮罩关闭行为和滚动锁定，但不渲染内置 glass 主体、header、关闭按钮或 footer；Consumer 负责完整定义默认插槽内容的样式，并且必须提供 `dialog-label`，确保原生 dialog 具有可访问名称。

关闭时保留原生 dialog 的 top layer，待退出过渡完成后调用 `dialog.close()`。Escape 始终走此关闭路径；`no-backdrop-close` 仅控制遮罩点击。

启用 `closable` 时，内置关闭按钮固定在 header 右上角（默认顶部 `16px`、右侧 `20px`），不会再拉伸到抽屉中间。

**拖拽关闭：** 启用 `draggable` 后，打开的抽屉在内缘显示灰色胶囊 drag bar（默认 4×56px，视觉中线距内缘 10px，位于 20px 厚的命中热区内；`right` 在左缘、`left` 在右缘、`top` 在下缘、`bottom` 在上缘）：

- 拖拽实时跟手，遮罩透明度按比例淡出。
- 遮罩点击关闭只认**轻点链路**：按下起点在遮罩上、且按-放位移在轻点量级内的 click 才关闭。浏览器对「按下 → 拖动 → 松手」生成的 click 落在起点与松手点的共同祖先（dialog）上——从面板内容或遮罩上开始拖拽、松手落在遮罩时，click 的 target 同样是 dialog；组件在 `pointerdown` 记录起点与坐标做回溯校验，这类拖拽松手一律弹回。`detail` 为 0 的 click（键盘/程序化来源）不消费指针记录。
- 松手时自抓取瞬间起的**净位移**超过抽屉尺寸的一半（下限 10px）或快速甩动即关闭，否则弹回打开位；方向随 placement 适配。判定的每一环都与 Base UI `useSwipeDismiss` 对齐：
  - 位移零点与判定时钟都在**首个 `pointermove`** 处重置，用来吸收「按下 → 首个 move」之间的空隙；该次 move 的整程位移被整体丢弃，因此一次手势至少要两个 move 才可能累积出位移。
  - 甩动看的是**整段手势**的平均速度（净位移 ÷ 手势时长，分母下限 50ms）**达到** 500px/s，不是释放瞬间的瞬时速度。滑窗只描述最后一小段轨迹；在整段平均速度下，「先往边缘拖出、再快速扫回」不再能凑成甩动。时长为 0 时速度取 0 而不是按 50ms 兜底，因此测不到时长的手势永远不会被读成甩动。
  - 净位移没有朝闭合方向的松手一律弹回打开位。
  - 距离判据同样用净位移：从弹回途中抓取后不再拖动就松手，不会被当成「已经拖过一半」。
  - 自「方向确认点」起反向回撤满 10px 即取消本次甩动，因此拖出后回扫不会关闭。位移重新越过距离阈值会清除该标记，所以「已经拖过一半」不受小幅回撤影响。上游有同一个守卫（`cancelledSwipe`），但在 drawer 这条路径上永远走不到——`DrawerViewport.onRelease` 必然返回一个决定。
  - 朝打开方向的拖拽按平方根压缩（`sign(d) · |d| ** 0.5`），对齐 `applyDirectionalDamping`。阻尼作用于本次手势的**增量**、叠加在抓取瞬间的位移之上，因此自限幅而不需要固定的位移上限。
- 释放速度只决定收尾过渡的时长（180–420ms）；收尾本身是一次交还 CSS 的 `transform` 过渡，不再创建 WAAPI 动画。
- 启用 `controlled` 后，超过阈值松手仅派发 `open-change(false)`；抽屉在闭合位短暂等待（120ms 回写窗口），Consumer 拒绝或超时未回写时弹回打开位。
- 不支持拖拽打开——关闭态的抽屉在原生 dialog 之外没有任何渲染物。
- `prefers-reduced-motion` 下松手即时到位，不播放收尾过渡。

**CSS 自定义属性：**

| 属性                              | 默认值                             | 说明                                                 |
| --------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| `--wui-drawer-width`              | `320px`                            | 抽屉宽度                                             |
| `--wui-drawer-height`             | `300px`                            | 抽屉高度（上/下）                                    |
| `--wui-drawer-bg`                 | `var(--wui-color-surface-overlay)` | 抽屉背景色                                           |
| `--wui-drawer-radius`             | `var(--wui-radius-overlay, 28px)`  | 浮动卡片圆角（非 headless）                          |
| `--wui-drawer-inset`              | `8px`                              | 浮动卡片视口留边（非 headless）；置 `0` 为贴边几何   |
| `--wui-drawer-overlay-bg`         | `rgb(0 0 0 / 0.12)`                | 遮罩背景色                                           |
| `--wui-drawer-drag-zone-size`     | `20px`                             | Drag-to-close 命中热区厚度（draggable）              |
| `--wui-drawer-drag-bar-thickness` | `4px`                              | Drag bar 胶囊厚度（短轴）                            |
| `--wui-drawer-drag-bar-length`    | `56px`                             | Drag bar 胶囊长度（沿抽屉边缘）                      |
| `--wui-drawer-header-padding`     | `16px 20px`                        | Header 区域 padding                                  |
| `--wui-drawer-close-top`          | `16px`                             | 内置关闭按钮相对 header 顶部的偏移                   |
| `--wui-drawer-close-right`        | `16px`                             | 内置关闭按钮相对抽屉右缘的偏移                       |
| `--wui-drawer-content-padding`    | `20px`                             | 内容区 padding；同时驱动 drag bar 视觉中线（取半值） |
| `--wui-drawer-footer-padding`     | `16px 20px`                        | Footer 区域 padding                                  |

#### `imagePreview()`

命令式图片预览，没有声明式标签契约：只能通过 `imagePreview()` 打开，并用返回的句柄控制。内部使用原生 `<dialog>` 的 `showModal()`，默认挂载到最近的 `web-ui-theme` theme-owned overlay root（无可用 theme-owned root 时回退到全局 fallback overlay root）。

它不复用 `<web-ui-dialog>` 组件：预览需要自身铺满视口的 dialog（全视口遮罩由 dialog 内独立遮罩层渲染，dialog 元素自身不做 opacity 过渡，玻璃控件的 backdrop blur 全程连续）与自有指针交互，与 dialog 组件的玻璃卡片 / 插槽契约不同源。两者共享 `native-dialog-presence` 与 `scroll-lock` 两个底层插件，`noScrollLock` / `noBackdropClose` 的命名与语义也对齐同名属性。

```ts
import { imagePreview } from '@greypan/web-ui'

const preview = imagePreview({
  images: [{ src: '/a.jpg', alt: '图 A' }, { src: '/b.jpg' }],
  index: 0,
  nav: true,
  toolbar: true,
  closable: true,
  indicator: true
})

preview.next()
preview.zoomIn()

await preview.closed
```

**选项：**

| 选项              | 类型                 | 默认值  | 说明                                                 |
| ----------------- | -------------------- | ------- | ---------------------------------------------------- |
| `images`          | `ImagePreviewItem[]` | —       | 图片列表，至少一项，否则抛错                         |
| `index`           | `number`             | `0`     | 初始索引，越界时钳制到有效区间                       |
| `loop`            | `boolean`            | `true`  | 首尾循环切换                                         |
| `target`          | `Element`            | —       | 用于解析最近 theme-owned overlay root 的触发元素     |
| `container`       | `HTMLElement`        | —       | 显式挂载容器，优先级高于主题作用域                   |
| `nav`             | `boolean`            | `false` | 展示上一张 / 下一张按钮；仅图片多于一张时渲染        |
| `toolbar`         | `boolean`            | `false` | 展示缩放工具条（缩小 / 倍率 / 放大 / 重置）          |
| `closable`        | `boolean`            | `false` | 展示关闭按钮                                         |
| `indicator`       | `boolean`            | `false` | 展示「当前 / 总数」指示器，并用 `aria-live` 宣告位置 |
| `swipe`           | `boolean`            | `false` | 1x 下允许左右滑动切换图片；生效期间横向轴归它        |
| `noScrollLock`    | `boolean`            | `false` | 打开期间不锁定页面滚动                               |
| `noBackdropClose` | `boolean`            | `false` | 点击图片以外的空白区域不关闭                         |

`ImagePreviewItem` 为 `{ src: string; alt?: string }`；`alt` 缺省为空字符串。

展示类选项默认全关：不传任何选项时只渲染图片本身，导航、工具条、关闭按钮与指示器都需要显式开启。

**返回句柄：**

| 成员                                     | 类型                          | 说明                             |
| ---------------------------------------- | ----------------------------- | -------------------------------- |
| `index`                                  | `number`                      | 当前索引，关闭后保留最后一次的值 |
| `scale`                                  | `number`                      | 当前缩放倍率，区间 `[1, 4]`      |
| `images`                                 | `readonly ImagePreviewItem[]` | 归一化后的图片列表               |
| `closed`                                 | `Promise<void>`               | 退场结束且宿主移除后兑现         |
| `next()` / `prev()`                      | `() => void`                  | 相对切换                         |
| `goTo(index)`                            | `(index: number) => void`     | 跳转；`loop` 关闭时在边界钳制    |
| `zoomIn()` / `zoomOut()` / `resetZoom()` | `() => void`                  | 缩放控制                         |
| `close()`                                | `() => void`                  | 关闭并播放退场动画               |

**交互：** 方向键始终可切换图片，与 `nav` 无关；`+` / `-` 键和滚轮缩放，`0` 重置。缩放带锚点：滚轮固定光标下的那一点，双指捏合固定两指中点，工具条按钮、键盘快捷键与双击则以视口中心为中心放大。按住鼠标拖拽或单指按住拖拽都能平移图片，方向不限，且与倍率无关：放大后是查看被裁切的边缘，1x 是在视口内移动图片。两种情形共用同一个边界——图片与舞台尺寸差的一半，因此图片永远不会被拖出视口；拖到边界后继续拖是钳制而非回弹。双击图片在 1x 与 2x 之间切换。

双指缩放始终开启且不提供选项：舞台本身就持有指针交互，没有会冲突的手势。第一根手指照常负责平移 / 滑动，第二根手指落下才进入捏合，并中止进行中的平移或滑动。捏合不会关闭浮层；混合输入事后可能补发的兼容 `click` 会被吞掉，而不是当作遮罩点击。

点击图片以外的空白区域或按 Escape 关闭，原生 dialog 始终暴露 `图片预览` 这一可访问名称。`swipe` 开启且图片多于一张时，图片排布在单条轮播轨道上：当前图与相邻图各占等宽等高的 slide，舞台裁切溢出，整条轨道随手指平移；松手时越过距离阈值（舞台宽度的 15%，取整）滑入相邻图，位移未达阈值但快速轻扫的采样速度达到 320px/s 以上、或位移至少 16px 且速度（窗口采样或整段平均）达到 160px/s 以上的轻扫同样提交，否则弹回；`loop` 开启时首尾环绕的相邻图恒在当前图两侧，`loop` 关闭时边界方向回弹不越界。该手势生效期间接管整个拖拽：1x 下横向拖拽用于切图，纵向位移被完全忽略（不驱平移、不跟手）。放大后拖拽一律平移（纵横都跟），不再切换图片。由于 1x 也能平移，`resetZoom()` 在「已放大」和「已位移」两种情况下都可用——工具条里的重置按钮对已平移的 1x 图片同样可点。

关闭请求不会立刻销毁原生 dialog：它保持在 top layer，等退场过渡结束后才调用 `dialog.close()`，随后宿主从 DOM 移除并兑现 `closed`。打开期间锁定页面滚动，除非 `noScrollLock` 为 `true`。

**CSS 自定义属性：**

| 属性                             | 默认值                           | 说明                     |
| -------------------------------- | -------------------------------- | ------------------------ |
| `--wui-image-preview-overlay-bg` | `rgb(0 0 0 / 0.72)`              | 全视口遮罩背景色         |
| `--wui-image-preview-edge-gap`   | `20px`                           | 控件到视口边缘的可见距离 |
| `--wui-duration-swipe-settle`    | `220ms`                          | 轮播滑入/回位的过渡时长  |
| `--wui-ease-swipe`               | `cubic-bezier(0.32, 0.72, 0, 1)` | 轮播滑入/回位的缓动曲线  |

---

### 文档流展开收起

#### `<web-ui-collapse>`

文档流内的展开收起容器，带高度（或宽度）过渡动画。单元素双插槽；无 portal、无滚动锁定、无焦点管理。

| 属性           | 类型      | 默认值  | 说明                                                                                 |
| -------------- | --------- | ------- | ------------------------------------------------------------------------------------ |
| `open`         | `boolean` | `false` | 展开状态；交互时自管理，`open-change` 仅用户来源时派发                               |
| `disabled`     | `boolean` | `false` | 忽略 trigger 点击并在 trigger 元素上设 `aria-disabled`；已展开内容保持现状           |
| `horizontal`   | `boolean` | `false` | 沿宽度而非高度动画                                                                   |
| `keep-mounted` | `boolean` | `false` | 关闭稳态以 `inert` 保留在 0fr 轨道内（滚动位置与布局可测量），而非内部容器 `hidden`  |
| `peek`         | `string`  | —       | 关闭稳态露出的尺寸（CSS 长度，如 `120px`），沿动画轴生效；末端自带自动长度的边缘渐隐 |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)。仅用户来源的切换（trigger 点击）派发；程序化写入（`open`、`show()`、`close()`、`toggle()`）不派发。嵌套时内层 `open-change` 会冒泡穿过外层根（composed 事件），按 `event.target` 区分。

**插槽：** `default`（trigger）+ `content`（折叠内容）

**方法：** `show()`、`close()`、`toggle()`

```html
<web-ui-collapse>
  <button type="button">点击切换</button>
  <div slot="content">折叠内容</div>
</web-ui-collapse>
```

初始即带 `open` attribute 时直接落稳态，不播动画。支持嵌套 collapse。

**trigger 语义：** 交互语义完全来自 default slot 放入的元素——原生 `<button>`、`<web-ui-button>` 或其他可交互元素原生提供 Enter/Space 激活与焦点。collapse 把 `aria-expanded` / `aria-controls`（指向内容轨道）与 `aria-disabled` 回写到 trigger slot 的首个 assigned element。trigger 请使用可交互元素：纯 `<span>` 可点击但没有键盘/焦点语义。

**关闭稳态语义：** Consumer的 light DOM 永不移动或卸载。默认关闭稳态在内部内容容器上设 `hidden`；`keep-mounted` 时内部容器标记 `inert`，保留在收起轨道内可测量。

**`peek`（只露一部分）：** 设置 `peek` 后关闭稳态不再收拢到 0，而是沿动画轴露出内容的头部 `peek` 长度（`horizontal` 时改为宽度）：轨道保持在内容高度，裁剪长度落在内部容器上。其语义等同 `keep-mounted`——内容保留挂载但被 `inert` 阻断，被裁掉的部分不可聚焦、不可点击。内容本身不足 `peek` 时按内容实际尺寸收起，不留空白。由于固定长度与自适应高度无法由 CSS 插值，`peek` ↔ 展开这两个方向改为读出像素后以显式长度驱动（每次开合测量一次）；其余动画路径仍是零测量的 grid `fr` 过渡。

```html
<web-ui-collapse peek="120px">
  <button type="button">点击切换</button>
  <div slot="content">很长的内容——关闭时只露出前 120px</div>
</web-ui-collapse>
```

**边缘渐隐：** 露出区域的裁剪边缘自带一段 alpha 渐变（`horizontal` 时改为右边），让被裁掉的部分柔和过渡到背景而不是硬切。渐变长度由 `peek` 推导，不需要也没有第二个属性可调——需要时用 CSS 变量微调：

| CSS 变量                         | 默认值        | 说明                                           |
| -------------------------------- | ------------- | ---------------------------------------------- |
| `--wui-collapse-peek-edge-ratio` | `0.4`         | 渐变长度占 `peek` 的比例                       |
| `--wui-collapse-peek-edge-max`   | `112px`       | 长度上限，避免大 `peek` 算出过长的虚化带       |
| `--wui-collapse-peek-edge`       | —             | 显式指定长度，优先于推导值                     |
| `--wui-collapse-peek-edge-color` | `transparent` | 渐变末端颜色（需带 alpha，mask 按 alpha 解析） |

比例设为 `0` 即关闭渐隐。推导是纯 CSS 的 `calc(peek * ratio)`：`peek` 用 rem 时渐变长度自动跟随根字号缩放，JS 侧不需要做任何单位解析。已知限制：`peek` 取百分比时推导结果不是长度、无法被注册属性插值，会静默回落为「无渐隐」，此时请用 `--wui-collapse-peek-edge` 显式指定长度。

渐变是四段「先陡后缓」而非线性：主体全黑延伸到渐变带起点后，前 30% 距离就降到 60% alpha，65% 处 26%，末端落到边缘颜色。线性渐变的 alpha 在带子前 40% 几乎贴着 1.0，人眼感知到的虚化远短于声明长度——把下降前置后，带子从起点就明显发虚，同样长度的感知长度接近翻倍。

渐变带位置用百分比声明、相对容器的**当前渲染高度**（即 `max-height` 动画的那个高度），因此收起动画期间渐变带逐帧跟随裁剪边缘移动，`mask-image` 字符串本身无需插值。渐变带长度由注册的 `<length>` 自定义属性驱动，随开合动画平滑淡入淡出，而不是等收起动画落稳态才突然出现。

```html
<!-- 调强渐隐：比例 0.5 → 120px peek 配 60px 渐隐 -->
<web-ui-collapse peek="120px" style="--wui-collapse-peek-edge-ratio: 0.5">
  <button type="button">点击切换</button>
  <div slot="content">很长的内容——120px 露出区域的底部渐隐更强</div>
</web-ui-collapse>
```

**已知限制：** `horizontal` 动画期间内容随宽度变化 reflow。

---

### 浮动

#### `<web-ui-popover>`

锚定触发元素的弹出层。

| 属性               | 类型                               | 默认值     | 说明                               |
| ------------------ | ---------------------------------- | ---------- | ---------------------------------- |
| `open`             | `boolean`                          | `false`    | 弹出层可见性                       |
| `disabled`         | `boolean`                          | `false`    | 禁用状态                           |
| `placement`        | `Placement`                        | `'bottom'` | Floating UI 位置                   |
| `trigger`          | `'click' \| 'hover' \| 'manual'`   | `'click'`  | 触发方式                           |
| `offset`           | `number`                           | `8`        | 与锚点距离                         |
| `portal`           | `boolean`                          | `false`    | 在 theme-owned overlay root 中渲染 |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —          | 显式 Portal 容器                   |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `trigger`, `default`

**方法：** `show()`, `close()`, `toggle()`

Hover 模式使用 `pointerenter`/`pointerleave` 加延迟控制。Click 模式点击切换。Manual 模式仅响应命令式调用。

**trigger ARIA：** 开合状态回写到 trigger 元素：`aria-expanded` 与 `aria-controls`（指向面板）设在 `trigger` slot 的首个 assigned element 上（包装结构上的同名属性保留兼容）。trigger slot 请放入可交互元素（原生 button、`web-ui-button`）。

#### `<web-ui-tooltip>`

工具提示，支持指针和焦点触发。

| 属性               | 类型                               | 默认值  | 说明                               |
| ------------------ | ---------------------------------- | ------- | ---------------------------------- |
| `placement`        | `Placement`                        | `'top'` | Floating UI 位置                   |
| `content`          | `string`                           | `''`    | 提示文本（替代插槽）               |
| `open`             | `boolean`                          | `false` | 可见性                             |
| `disabled`         | `boolean`                          | `false` | 禁用状态                           |
| `show-delay`       | `number`                           | `200`   | 显示延迟（毫秒）                   |
| `hide-delay`       | `number`                           | `100`   | 隐藏延迟（毫秒）                   |
| `offset`           | `number`                           | `6`     | 与触发器的距离                     |
| `portal`           | `boolean`                          | `false` | 在 theme-owned overlay root 中渲染 |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —       | 显式 Portal 容器                   |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `default`（触发器）、`content`（提示面板）

`open` 是自管理的可见性属性。指针/焦点触发会更新它，直接赋值 property 也会同步本地或 Portal 面板；`open-change` 仅用户来源的开关时派发。第一个 Tooltip 显示后，相邻 Tooltip 会立即切换；其余 pointer/focus 触发使用延迟计时器。

**CSS 自定义属性：**

| 属性                      | 默认值  | 说明         |
| ------------------------- | ------- | ------------ |
| `--wui-tooltip-max-width` | `240px` | 提示最大宽度 |
| `--wui-tooltip-font-size` | `13px`  | 提示字号     |

#### `<web-ui-context-menu>`

右键上下文菜单。

| 属性             | 类型      | 默认值  | 说明         |
| ---------------- | --------- | ------- | ------------ |
| `disabled`       | `boolean` | `false` | 禁用状态     |
| `no-scroll-lock` | `boolean` | `false` | 允许背景滚动 |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `default`（菜单项内容）

**方法：** `openAt(x: number, y: number)`, `close()`

通过 `contextmenu` 事件打开。菜单项：`web-ui-dropdown-item`、`web-ui-dropdown-divider`、`web-ui-dropdown-header`。支持键盘导航和子菜单 hover。

菜单打开期间，Consumer可以安全地使用条件渲染（如 Vue `v-if`）切换、移动或删除菜单项，无需重新插入到宿主元素；portal 内的变更会自动 reconcile，关闭时框架锚点随元素迁回宿主，保证后续框架更新正常。

---

### 菜单

#### `<web-ui-dropdown>`

下拉菜单，支持多级子菜单。

| 属性             | 类型        | 默认值           | 说明                 |
| ---------------- | ----------- | ---------------- | -------------------- |
| `open`           | `boolean`   | `false`          | 菜单可见性           |
| `disabled`       | `boolean`   | `false`          | 禁用状态             |
| `placement`      | `Placement` | `'bottom-start'` | Floating UI 位置     |
| `offset`         | `number`    | `4`              | 与触发器距离         |
| `match-width`    | `boolean`   | `false`          | 匹配触发器宽度       |
| `no-scroll-lock` | `boolean`   | `false`          | 打开时不锁定页面滚动 |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `trigger`, `default`（菜单项）

**方法：** `openMenu()`, `closeAll()`

菜单项：`web-ui-dropdown-item`、`web-ui-dropdown-divider`、`web-ui-dropdown-header`。子菜单在 `web-ui-dropdown-item` 上通过 `submenu` 属性启用。完整键盘导航支持。

**trigger ARIA：** `aria-haspopup="menu"`、`aria-expanded` 与 `aria-controls`（指向根菜单面板）回写到 `trigger` slot 的首个 assigned element。trigger slot 请放入可交互元素。

#### `<web-ui-dropdown-item>`

菜单项。

| 属性       | 类型      | 默认值  | 说明         |
| ---------- | --------- | ------- | ------------ |
| `disabled` | `boolean` | `false` | 禁用状态     |
| `submenu`  | `boolean` | `false` | 是否有子菜单 |
| `value`    | `string`  | `''`    | 菜单项值     |
| `pl`       | `string`  | `''`    | 左侧内边距   |

**插槽：** `prefix`, `default`, `suffix`

**方法：** `focusItem()`

角色：`menuitem`。

#### `<web-ui-dropdown-divider>`

菜单分隔线。角色：`separator`。无属性。

#### `<web-ui-dropdown-header>`

菜单分组标题。无属性。插槽：`default`（文本内容）。

---

### 数据展示

#### `<web-ui-avatar>`

头像组件，支持图片加载失败回退。

| 属性    | 类型                   | 默认值     | 说明                   |
| ------- | ---------------------- | ---------- | ---------------------- |
| `src`   | `string`               | `''`       | 图片 URL               |
| `alt`   | `string`               | `''`       | 替代文本               |
| `name`  | `string`               | `''`       | 展示名称（首字母回退） |
| `size`  | `number`               | `40`       | 头像尺寸（px）         |
| `shape` | `'circle' \| 'square'` | `'circle'` | 形状                   |

**插槽：** `default`（图片加载失败的降级内容）

#### `<web-ui-badge>`

徽标 / 通知计数。

| 属性           | 类型                                                           | 默认值        | 说明                   |
| -------------- | -------------------------------------------------------------- | ------------- | ---------------------- |
| `count`        | `number`                                                       | `0`           | 显示数字               |
| `max`          | `number`                                                       | `99`          | 最大值（超过显示 99+） |
| `dot`          | `boolean`                                                      | `false`       | 点模式（不显示数字）   |
| `show-zero`    | `boolean`                                                      | `false`       | count 为 0 时也显示    |
| `badge-hidden` | `boolean`                                                      | `false`       | 完全隐藏               |
| `offset-x`     | `number`                                                       | `0`           | 水平偏移               |
| `offset-y`     | `number`                                                       | `0`           | 垂直偏移               |
| `placement`    | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` | 徽标位置               |

#### `<web-ui-empty>`

空状态占位。

| 属性          | 类型                             | 默认值     | 说明     |
| ------------- | -------------------------------- | ---------- | -------- |
| `title`       | `string`                         | `''`       | 标题     |
| `description` | `string`                         | `''`       | 描述文本 |
| `size`        | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸     |

**插槽：** `default`（标题，覆盖 `title` 属性）、`icon`、`description`、`action`

**CSS 自定义属性：**

| 属性                                | 默认值      | 说明               |
| ----------------------------------- | ----------- | ------------------ |
| `--wui-empty-min-height`            | `240px`     | 最小高度（medium） |
| `--wui-empty-padding`               | `32px 24px` | 内边距（medium）   |
| `--wui-empty-icon-size`             | `56px`      | 图标容器尺寸       |
| `--wui-empty-content-width`         | `480px`     | 标题/描述最大宽度  |
| `--wui-empty-title-font-size`       | `16px`      | 标题字号（medium） |
| `--wui-empty-description-font-size` | `14px`      | 描述字号（medium） |

#### `<web-ui-icon>`

图标渲染组件。接受 Iconify 数据对象。

| 属性    | 类型          | 默认值  | 说明                     |
| ------- | ------------- | ------- | ------------------------ |
| `.icon` | `IconifyIcon` | —       | 图标数据（Lit 属性绑定） |
| `size`  | `number`      | `18`    | 尺寸（px）               |
| `color` | `string`      | —       | 颜色                     |
| `spin`  | `boolean`     | `false` | 旋转动画                 |

内置 `aria-hidden="true"`。

```js
import { lucideLoaderCircle } from '@greypan/web-ui/icons'
html`<web-ui-icon .icon=${lucideLoaderCircle} spin />`
```

**CSS 自定义属性：**

| 属性                  | 默认值    | 说明                                            |
| --------------------- | --------- | ----------------------------------------------- |
| `--wui-icon-color`    | `inherit` | 图标颜色                                        |
| `--wui-duration-spin` | `600ms`   | `spin` 旋转周期；reduce 下放慢到 `1600ms`，不停 |

#### `<web-ui-spinner>`

加载旋转器。

| 属性          | 类型     | 默认值 | 说明       |
| ------------- | -------- | ------ | ---------- |
| `size`        | `number` | `24`   | 尺寸（px） |
| `color`       | `string` | —      | 颜色       |
| `description` | `string` | `''`   | 描述文字   |

角色：`status`，`aria-label="加载中"`。

**插槽：** `description`

**静态 API：**

```ts
import { WebUiSpinner } from '@greypan/web-ui'

WebUiSpinner.show() // 显示
WebUiSpinner.show({ size: 32, duration: 2000 }) // 带选项显示
WebUiSpinner.hide() // 隐藏
```

`WebUiSpinner.show(options?: { size?: number; duration?: number; description?: string })`

**CSS 自定义属性：**

| 属性                     | 默认值  | 说明                                         |
| ------------------------ | ------- | -------------------------------------------- |
| `--wui-spinner-size`     | `24px`  | 尺寸，由 `size` 属性写入                     |
| `--wui-duration-spinner` | `800ms` | 叶片追光周期；reduce 下放慢到 `1600ms`，不停 |

---

### 布局与工具

#### `<web-ui-layout>`

响应式页面布局：支持可选全宽 Banner、桌面端可折叠侧边栏，以及移动端默认 drawer。页面本身滚动；Banner 滚出后，桌面端 sidebar 和 header 固定在视口内。

| 属性                | 类型      | 默认值    | 说明                                                           |
| ------------------- | --------- | --------- | -------------------------------------------------------------- |
| `sidebar-collapsed` | `boolean` | `false`   | 桌面端侧边栏受控折叠状态                                       |
| `sidebar-open`      | `boolean` | `false`   | 移动端侧边栏 Drawer 受控打开状态                               |
| `header-glow`       | `boolean` | `false`   | 在 header 插槽内容背后显示装饰性晕染                           |
| `sidebar-width`     | `string`  | `'240px'` | 桌面端和移动端展开时的侧边栏宽度                               |
| `collapsed-width`   | `string`  | `'72px'`  | 桌面端折叠时的侧边栏宽度                                       |
| `sidebar-resizable` | `boolean` | `false`   | 启用桌面端侧边栏右边缘拖拽调整宽度                             |
| `sidebar-min-width` | `string`  | —         | 拖拽调整的下限（px）；默认回退到 `collapsed-width`             |
| `sidebar-max-width` | `string`  | —         | 拖拽调整的上限（px）；钳制在视口一半以内，内置上限优先于配置值 |

**事件：** `sidebar-collapsed-change`（`CustomEvent<{ collapsed: boolean }>`）用于请求更新桌面端折叠状态；`sidebar-open-change`（`CustomEvent<{ open: boolean }>`）用于请求更新移动端 Drawer 打开状态；`sidebar-width-change`（`CustomEvent<{ width: string }>`）用于请求在拖拽调整结束后更新侧边栏宽度。Consumer 必须将请求值回写到对应的受控属性。

**侧边栏调整宽度：** 启用 `sidebar-resizable` 后，桌面端侧边栏右边缘会出现调整手柄（折叠状态下隐藏）；悬停或拖拽时显示 3px 宽的强调色垂直线和 `col-resize` 光标。

- 拖拽时实时更新宽度（禁止过渡动画，限制在 `[min, max]` 和视口范围内）。
- 释放时触发 `sidebar-width-change` 事件并携带最终像素宽度，Consumer 回写后宽度重新由 `sidebar-width` 属性接管；`pointercancel` 会恢复属性控制的宽度且不触发事件。
- 键盘操作（WAI-ARIA splitter 模式）：聚焦后用 ←/→ 以 16px 步进调整（Shift 加速到 64px），Home/End 跳到 min/max，Enter 以同一 `sidebar-width-change` 请求提交，Escape 撤回未提交的调整。
- 移动端 Drawer 始终通过其内置 `draggable` 抽屉支持拖拽关闭。

| 插槽      | 说明                                                             |
| --------- | ---------------------------------------------------------------- |
| `banner`  | 位于布局主体上方的可选全宽 Banner                                |
| `header`  | 内容区的 sticky header                                           |
| `sidebar` | 侧边栏卡片内容；桌面端内部固定区域与滚动容器由 Consumer 自行定义 |
| `default` | 主内容区                                                         |
| `tabbar`  | 底部 tabbar                                                      |

`web-ui-layout` 只约束侧边栏卡片的可用空间并管理桌面端 Toggle，不创建桌面端侧边栏 scrollport。若仅让桌面端侧边栏的一部分滚动，请将 `sidebar` 插槽根节点设为 `height: 100%; min-height: 0` 的 flex column，再将 `overflow-y: auto` 设置到目标子元素。这样 Consumer 可自行固定头部和底部，无需额外的公共 slot：

```html
<div slot="sidebar" class="sidebar-root">
  <div class="sidebar-title">组件列表</div>
  <nav class="sidebar-nav">...</nav>
</div>
```

```css
.sidebar-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sidebar-title {
  flex-shrink: 0;
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

在 `640px` 及以下，侧边栏会切换为使用内置 glass body、可滚动 content 和 drag zone 的 `web-ui-drawer`。Layout 会将 `sidebar-width` 映射为 `--wui-drawer-width`，将 `--wui-layout-sidebar-radius` 映射为 `--wui-drawer-radius`。移动端 Toggle 以 glass 变体位于 header 行内。其左缩进默认 `8px`，可通过 `--wui-layout-mobile-toggle-inset` 与 Consumer 自身的 header 内边距对齐。

`header-glow` 会在 header 插槽内容和移动端 Toggle 的背后添加 `pointer-events: none` 的装饰性晕染。它属于 Header 背景而非前景层，因此插槽内容始终位于其上方；可通过 `--wui-layout-header-glow-color` 覆盖颜色，默认值为 `--wui-color-page`。晕染浓度和范围由内部变量 `--wui-layout-header-glow-height`（默认 `150%`）控制；增大可加强覆盖，减小则更柔和。布局层级顺序为 Header（`10`）< Auxiliary（`20`）< Banner（`30`）< Tabbar（`40`）< Sidebar（`50`）。

**CSS 自定义属性：**

| 属性                               | 默认值 | 说明                                 |
| ---------------------------------- | ------ | ------------------------------------ |
| `--wui-layout-sidebar-radius`      | `24px` | 侧边栏卡片圆角（桌面端和移动端共用） |
| `--wui-layout-mobile-toggle-inset` | `8px`  | 移动端 header Toggle 的左缩进        |

#### `<web-ui-back-top>`

回到顶部按钮。

| 属性              | 类型                    | 默认值     | 说明               |
| ----------------- | ----------------------- | ---------- | ------------------ |
| `scroll-behavior` | `'smooth' \| 'auto'`    | `'smooth'` | 滚动行为           |
| `threshold`       | `number`                | `200`      | 显示按钮的滚动阈值 |
| `visible`         | `boolean`               | `false`    | 当前可见状态       |
| `scrollTarget`    | `HTMLElement \| Window` | `window`   | 滚动容器           |

**插槽：** `default`（自定义按钮内容）

**方法：** `toTop()`

**定位：** `scrollTarget` 为 `window` 时按钮固定在视口角落；为 `HTMLElement` 时需将元素放置在容器内部，按钮通过 `position: sticky` 悬浮于容器底部角落。偏移量沿用 `--wui-back-top-top/right/bottom/left` CSS 变量。

角色：`button`，键盘 Enter 触发回到顶部。

**CSS 自定义属性：**

| 属性                      | 默认值                           | 说明     |
| ------------------------- | -------------------------------- | -------- |
| `--wui-back-top-position` | `fixed`                          | CSS 定位 |
| `--wui-back-top-z-index`  | `var(--wui-layer-auxiliary, 20)` | 层级     |
| `--wui-back-top-top`      | `auto`                           | 上偏移   |
| `--wui-back-top-right`    | `20px`                           | 右偏移   |
| `--wui-back-top-bottom`   | `20px`                           | 下偏移   |
| `--wui-back-top-left`     | `auto`                           | 左偏移   |

#### `<web-ui-svg-draw-lines>`

SVG 线条绘制动画，基于 `stroke-dashoffset`。直接在原元素上动画 —— 不克隆、不操作 DOM。两个播放方向：默认按从无到有描出几何形状，`replay({ reverse: true })` 沿原路收回，从有到无。

| 属性          | 类型      | 默认值     | 说明                                     |
| ------------- | --------- | ---------- | ---------------------------------------- |
| `duration`    | `number`  | `1000`     | 动画时长（毫秒），限制在 `[0, 30000]`    |
| `easing`      | `string`  | `'linear'` | CSS 缓动函数，传递给 `element.animate()` |
| `no-autoplay` | `boolean` | `false`    | 关闭内容首次出现时的自动播放             |

三个属性均会反射（reflected）。

**自动播放：** slot 内容第一次稳定时自动播放一次画入。设置 `no-autoplay` 后保持资产原样、由调用方决定何时播放 —— `<web-ui-checkbox>` 正是靠它避免挂载时就已勾选的勾在页面首帧画出来。

**方法：** `replay(options?: { reverse?: boolean }): Promise<void>` — 取消当前动画，重新从 DOM 收集几何元素并开始新动画。所有目标以相同的 duration/easing 并行播放。动画全部完成后 resolve。收回段以「空白」收尾，并把这一末态留在 DOM 上：动画本身在收尾时撤销，但让描边隐去的 dash 值作为内联样式保留，直到下一次 `replay()` 把它替换或撤掉。画入段则恢复消费者自己写的内联样式。收回总是从完整描边起收，所以在画入途中打断也会把整条路径描回去，而不是只收掉看得见的那一段。最近主题范围为 `motion="reduced"` 时不启动任何动画 —— 但上一次收回留下的空白仍会被撤掉，几何回到资产原样，可见性完全交给消费者自己的样式；`motion="system"` 在匹配 `prefers-reduced-motion: reduce` 时行为相同。

**收回末态：** 收回留下的空白是写在被动画的几何元素上的内联样式，包括嵌套开放 Shadow Root（如 `<web-ui-icon>`）里的节点。克隆这些节点（`cloneNode`、`innerHTML` 往返）会把空白一起带走；把节点摘下来再挂回去，描边也仍然是隐去的 —— 收回结束是一个 DOM 状态而不是一条还活着的动画，没有留下任何东西去复原它。要重新显示就调用 `replay()`。由于组件会递归进入嵌套的开放 Shadow Root，两层 `<web-ui-svg-draw-lines>` 不得覆盖同一批几何元素：每个实例只在第一次动画某个元素时记录它的内联 dash 值，内层留下的空白会被外层当成「消费者自己写的值」。

**插槽：** `default` — 需要动画的 SVG 内容。接受内联 `<svg>` 元素（light DOM）以及将 SVG 渲染在开放 Shadow DOM 中的组件（如 `<web-ui-icon>`）。closed Shadow Root 被跳过。

递归遍历 light DOM 和所有开放 Shadow Root，查找 `path`、`rect`、`circle`、`line`、`polyline`、`polygon`、`ellipse` 元素。以 `Z`/`z` 结尾的 `<path>` 会临时应用缺口修复逻辑确保闭合段正确渲染。画入段完成或取消后恢复所有内联样式。

#### `<web-ui-theme>`

主题提供者，定义 CSS 自定义属性 token。

| 属性         | 类型                              | 默认值     | 说明                       |
| ------------ | --------------------------------- | ---------- | -------------------------- |
| `appearance` | `'light' \| 'dark' \| 'system'`   | `'light'`  | 配色方案                   |
| `motion`     | `'full' \| 'reduced' \| 'system'` | `'system'` | 当前嵌套主题范围的动效偏好 |
| `transition` | `boolean`                         | `false`    | 配色变化时的圆形揭示动画   |

**方法：** `getOverlayRoot()` — 返回该主题拥有的 theme-owned overlay root

**Portal 挂载契约：** 每个 active `<web-ui-theme>` 同时是默认的 scoped theme-owned overlay root。Portal 类组件在未显式传入 `overlayContainer` 时，会解析到最近的 active theme 的 `getOverlayRoot()`；无 target 的调用优先使用 root theme 的 theme-owned overlay root。没有 active theme 提供 root 时，回退到全局 fallback overlay root。

在其子树中定义基础、颜色、层级、阴影和动效 token。`motion="system"` 跟随 `prefers-reduced-motion`；使用 `motion="reduced"` 降低当前作用域动效，或在嵌套主题中使用 `motion="full"` 恢复默认 token。System 配色模式跟随 `prefers-color-scheme`。

设置 `transition` 布尔属性后，使用 View Transitions API 播放配色变化；移除属性即关闭，框架动态切换时必须绑定 boolean property。根主题揭示整页；嵌套主题只揭示自己的 capture box。圆心优先取最近一次 pointerdown 坐标，否则回退主题盒或视口中心；深浅两个方向反向播放。不支持的浏览器、reduced-motion 作用域、时长为 0 以及同一 flight 内已有未完成请求都会立即落地新 appearance；当前版本对 `appearance="system"` 的 OS 深浅翻转不做动画。

主题宿主使用 `display: contents` 且不绘制任何背景：组件库不在宿主页面画背景，嵌入方对主题子树背后的表面保留完全控制权。自定义属性仍可靠继承到 slotted 内容。

**基础 token：**

| 属性                      | 默认值  | 说明                     |
| ------------------------- | ------- | ------------------------ |
| `--wui-font-size`         | `14px`  | 控件基础字号             |
| `--wui-input-width`       | `200px` | 紧凑表单控件默认宽度     |
| `--wui-control-size`      | `36px`  | 控件默认高度和方形最小宽 |
| `--wui-overlay-min-width` | `200px` | 锚定浮层最小宽度         |
| `--wui-focus-ring-width`  | `3px`   | Focus 指示器宽度         |

**选择控件 token（radio、checkbox）：**

| 属性                           | 默认值 | 说明                                 |
| ------------------------------ | ------ | ------------------------------------ |
| `--wui-selection-control-size` | `18px` | 指示器（圆点 / 方框）宽高            |
| `--wui-radio-group-gap`        | `8px`  | `<web-ui-radio-group>` 的成员间距    |
| `--wui-checkbox-group-gap`     | `8px`  | `<web-ui-checkbox-group>` 的成员间距 |

**圆角 token：**

| 属性                   | 默认值                 | 说明                                                 |
| ---------------------- | ---------------------- | ---------------------------------------------------- |
| `--wui-radius-control` | `calc(infinity * 1px)` | 小型控件的胶囊圆角（button、input、switch、option…） |
| `--wui-radius-menu`    | `18px`                 | 菜单/Popover 浮动面板、多行 textarea 与 toast        |
| `--wui-radius-overlay` | `28px`                 | 大型覆盖层：dialog、drawer、layout sidebar           |

**层级 token：**

| 属性                         | 默认值 | 说明           |
| ---------------------------- | ------ | -------------- |
| `--wui-layer-base`           | `0`    | 基础内容       |
| `--wui-layer-inline-overlay` | `1`    | 组件内部浮层   |
| `--wui-layer-header`         | `10`   | 页面 Header    |
| `--wui-layer-auxiliary`      | `20`   | 悬浮工具控件   |
| `--wui-layer-banner`         | `30`   | Banner         |
| `--wui-layer-tabbar`         | `40`   | Tab Bar        |
| `--wui-layer-sidebar`        | `50`   | 侧边栏         |
| `--wui-layer-menu`           | `100`  | 菜单/浮动面板  |
| `--wui-layer-menu-nested`    | `110`  | 嵌套菜单       |
| `--wui-layer-toast`          | `200`  | Toast          |
| `--wui-layer-loading`        | `300`  | 阻塞式 Loading |

**动效 token：** duration 默认值为 `--wui-duration-press: 80ms`、`--wui-duration-feedback: 100ms`、`--wui-duration-trigger: 160ms`、`--wui-duration-focus: 200ms`、`--wui-duration-float-enter: 240ms`、`--wui-duration-float-exit: 160ms`、`--wui-duration-dialog-enter: 320ms`、`--wui-duration-dialog-exit: 260ms`、`--wui-duration-drawer-enter: 280ms`、`--wui-duration-drawer-exit: 240ms`、`--wui-duration-drawer-nested: 450ms`、`--wui-duration-toast-enter: 280ms`、`--wui-duration-toast-exit: 200ms`、`--wui-duration-collapse-enter: 200ms`、`--wui-duration-collapse-exit: 160ms`、`--wui-duration-layout: 200ms`、`--wui-duration-swipe-settle: 220ms`（image-preview 轮播回位）、`--wui-duration-spin: 600ms`（icon 旋转）、`--wui-duration-spinner: 800ms`（spinner 叶片追光）与 `--wui-theme-transition-duration: 500ms`（主题配色揭示）。Easing token 是 `--wui-ease-enter`、`--wui-ease-dialog`（`cubic-bezier(0.2, 0, 0, 1)`）、`--wui-ease-slide`、`--wui-ease-float`（`cubic-bezier(0.4, 0.38, 0.2, 1)`，锚定浮动面板专用的无回弹弹簧拟合曲线）、`--wui-ease-swipe`（`cubic-bezier(0.32, 0.72, 0, 1)`，轮播回位的减速收尾）与 `--wui-theme-transition-easing: ease-in`；进入缩放是 `--wui-scale-enter: 0.95`（浮动面板与 image-preview 的图片舞台层由小到大展开），dialog 使用 `--wui-dialog-scale-enter: 1.1`（由大到小收缩入场，退场反向）。`motion="reduced"` 下所有转场时长归零（轮播回位一并归零），两个无限加载循环只放慢、不停（`--wui-duration-spin` / `--wui-duration-spinner`：`600ms` / `800ms` → `1600ms`）。加载指示冻结会被读成界面卡死。hover/active 背景反馈即时切换、无过渡动画；选中态、按压与 focus 走带时长的过渡，reduce 下同样归零。

**颜色 token：**

| 属性                               | 浅色默认值                                                   | 深色默认值                                                   | 说明                   |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------- |
| `--wui-color-page`                 | `#fff`                                                       | `#242628`                                                    | 页面背景               |
| `--wui-color-surface`              | `#fff`                                                       | `#2c2c2e`                                                    | 普通 表面              |
| `--wui-color-surface-raised`       | `#f2f2f7`                                                    | `#2c2c2e`                                                    | 抬升表面               |
| `--wui-color-surface-control`      | `#dfdfdf`                                                    | `#3a3a3c`                                                    | 中性可交互控件表面     |
| `--wui-color-surface-track`        | `#e5e5ea`                                                    | `#444446`                                                    | Slider/Switch 轨道表面 |
| `--wui-color-surface-menu`         | `rgb(246 246 246 / 0.82)`                                    | `rgb(30 30 32 / 0.92)`                                       | Menu 和浮动面板表面    |
| `--wui-color-surface-glass`        | `rgb(250 250 250 / 0.34)`                                    | `rgb(44 44 46 / 0.42)`                                       | 液态玻璃表面           |
| `--wui-color-surface-glass-hover`  | `color-mix(... text 6%, surface-glass)`                      | `color-mix(... text 6%, surface-glass)`                      | Glass 完整悬停背景     |
| `--wui-color-surface-glass-active` | `color-mix(... text 15%, surface-glass)`                     | `color-mix(... text 15%, surface-glass)`                     | Glass 完整按下背景     |
| `--wui-color-surface-overlay`      | `rgb(246 246 246 / 0.82)`                                    | `rgb(32 34 34 / 0.9)`                                        | 半透明浮层表面         |
| `--wui-color-surface-segmented`    | `#e5e5ea`                                                    | `#3a3a3c`                                                    | Segmented 轨道表面     |
| `--wui-color-surface-selected`     | `#fff`                                                       | `#5c5c5e`                                                    | 选中表面               |
| `--wui-color-text`                 | `#1b1b1b`                                                    | `#e9eaea`                                                    | 主要文本               |
| `--wui-color-text-secondary`       | `#6a6a6a`                                                    | `#a1a1a6`                                                    | 次要文本               |
| `--wui-color-text-tertiary`        | `color-mix(in srgb, var(--wui-color-text) 35%, transparent)` | `color-mix(in srgb, var(--wui-color-text) 42%, transparent)` | 三级文本和弱意图图标   |
| `--wui-color-text-disabled`        | `color-mix(in srgb, var(--wui-color-text) 32%, transparent)` | `color-mix(in srgb, var(--wui-color-text) 38%, transparent)` | 禁用态前景文本         |
| `--wui-color-state-layer-hover`    | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`  | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`  | 透明悬停层             |
| `--wui-color-state-layer-active`   | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)` | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)` | 透明按下层             |
| `--wui-color-border`               | `rgb(0 0 0 / 0.1)`                                           | `rgb(255 255 255 / 0.14)`                                    | 常规边框和分隔线       |
| `--wui-color-glass-border`         | `transparent`                                                | `rgb(255 255 255 / 0.05)`                                    | Glass 边框色调         |
| `--wui-color-glass-highlight`      | `rgb(255 255 255 / 0.9)`                                     | `rgb(255 255 255 / 0.1)`                                     | Glass 高光边缘         |
| `--wui-color-glass-corner`         | `rgb(255 255 255 / 0.5)`                                     | `rgb(255 255 255 / 0.2)`                                     | Glass 边框角落光泽     |
| `--wui-color-glass-shade`          | `rgb(0 0 0 / 0.03)`                                          | `rgb(0 0 0 / 0.5)`                                           | Glass 边框背光角压暗   |
| `--wui-color-accent`               | `#08f`                                                       | `#0a84ff`                                                    | Accent 和输入焦点边框  |
| `--wui-color-on-accent`            | `#fff`                                                       | `#fff`                                                       | Accent 上的前景色      |
| `--wui-color-on-control`           | `#fff`                                                       | `#f2f2f7`                                                    | 控件内芯前景色         |
| `--wui-color-success`              | `#16a34a`                                                    | `#30d158`                                                    | 成功                   |
| `--wui-color-warning`              | `#d97706`                                                    | `#ff9f0a`                                                    | 警告                   |
| `--wui-color-danger`               | `#dc2626`                                                    | `#ff453a`                                                    | 危险                   |
| `--wui-color-info`                 | `#2563eb`                                                    | `#64d2ff`                                                    | 信息                   |
| `--wui-color-backdrop`             | `rgb(0 0 0 / 0.12)`                                          | `rgb(0 0 0 / 0.48)`                                          | Modal 遮罩             |
| `--wui-color-focus-ring`           | `rgb(0 136 255 / 0.4)`                                       | `rgb(10 132 255 / 0.62)`                                     | Focus 指示器颜色       |

**阴影 token：**

| 属性                   | 浅色默认值                       | 深色默认值                      | 说明              |
| ---------------------- | -------------------------------- | ------------------------------- | ----------------- |
| `--wui-shadow-overlay` | `2px 16px 40px rgb(0 0 0 / 0.4)` | `0 18px 48px rgb(0 0 0 / 0.48)` | Modal/Drawer 阴影 |
| `--wui-shadow-panel`   | `0 3px 9px rgb(0 0 0 / 0.27)`    | `0 4px 16px rgb(0 0 0 / 0.32)`  | 小型浮动面板阴影  |
| `--wui-shadow-glass`   | 四层扩散阴影                     | `0 8px 24px rgb(0 0 0 / 0.08)`  | 液态玻璃基础阴影  |

**玻璃效果 token：** `--wui-glass-brightness` 浅色模式为 `1.06`，深色模式为 `1.02`。`--wui-glass-corner-radius` 默认值为 `32px`；非 pill 玻璃表面以自身语义圆角（`--wui-radius-menu` / `--wui-radius-overlay`，drawer 为 `--wui-drawer-radius`）覆盖它，使对角描边光影跟随 token 覆盖联动。pill 控件例外：光影渐变需要物理尺寸，继续使用由控件实际尺寸或内部尺寸 token 派生的有限圆角值。

**内部 token：** 以 `--wui-internal-*` 为前缀的变量是 Shadow DOM 内部接线变量，不属于公共 token API，Consumer 不应覆盖。

---

### 通知

#### `<web-ui-toast>`

单个 Toast 通知。通过命令式 API 使用。

直接使用元素时，`no-close-button` 是标准布尔属性，用于隐藏关闭按钮。

**命令式 API：**

```ts
import { toast } from '@greypan/web-ui'

// 创建
toast.success('操作成功')
toast.error('出错了', { duration: 5000 })
toast.info('提示信息')
toast.warning('请注意')

// 带选项
const id = toast({ message: '自定义', type: 'info', position: 'bottom-right', duration: 4000, closable: true })

// 关闭
toast.close(id)
toast.clear()

// upsert：同一 id 再次调用是更新那一条，而不是再建一条
toast.error('网络连接中断，正在重试…', { id: 'network' })
toast.error('网络连接中断（第 2 次重试）', { id: 'network' })

// 一条 toast 走完整个生命周期
toast.info('上传中 0%', { id: 'upload', duration: 0 })
toast.info('上传中 60%', { id: 'upload' }) // 省略 duration，计时不动
toast.success('上传完成', { id: 'upload', duration: 3000 }) // 换 type，重新开始倒计时
```

每次调用都返回这条 toast 的最终 id，调用方无需区分新建还是更新。

**ToastOptions：**

| 选项        | 类型                                          | 默认值                    | 说明                                  |
| ----------- | --------------------------------------------- | ------------------------- | ------------------------------------- |
| `message`   | `string`                                      | —                         | 通知文本                              |
| `type`      | `'success' \| 'info' \| 'warning' \| 'error'` | `'info'`                  | 类型                                  |
| `duration`  | `number`                                      | `3000`（error 为 `5000`） | 自动关闭时间（0=不自动关闭）          |
| `closable`  | `boolean`                                     | `true`                    | 显示关闭按钮                          |
| `id`        | `string`                                      | auto                      | 合并键：同一 id 的调用更新同一条      |
| `heading`   | `string`                                      | `''`                      | 粗体标题                              |
| `position`  | 6 种位置                                      | `'top-right'`             | 屏幕位置                              |
| `target`    | `Element`                                     | —                         | 用于查找最近 theme-owned overlay root |
| `container` | `HTMLElement`                                 | —                         | 显式挂载容器（最高优先级）            |

**upsert 语义** —— 同一 `id` 再次调用的结果：

| 目标状态             | 结果                                             |
| -------------------- | ------------------------------------------------ |
| 已挂载               | 返回同一个 id；给出的字段覆盖，未给出的保持原值  |
| 同 tick 内仍在待挂载 | patch 待挂载的 options，挂载后生效，不产生第二条 |
| 已关闭或正在退场     | 新建一条；正在离场的那条自行走完退场动画         |

`duration` 只有显式传入才重启倒计时（悬停暂停期间是例外：只记新值不点火，指针离开后按新时长计满）；`message`、`heading`、`type` 是普通属性，不碰计时。`toast.error` 的 5000 默认值在**创建时**兜底，不算显式传入，因此重复调用 `toast.error(msg, { id })` 不会重置倒计时。`position` 变化会把元素搬到新容器并保住剩余计时（支持 `moveBefore` 的引擎直接搬，其余走暂停/续跑降级）；若倒计时在主线程被占用期间已经到期，降级路径会在续跑时直接退场，而不是让它一直挂着。`container` 与 `target` 以首次调用为准，不支持把已存在的 toast 换到另一个 overlay root。

**关闭语义** —— `toast.close(id)` 覆盖 toast 出现的每个阶段，包括「还没开始显示」的两种：

| 目标状态              | 结果                                     |
| --------------------- | ---------------------------------------- |
| 已显示                | 播放退场动画，结束后派发 `toast-close`   |
| 已挂载、`show()` 未跑 | 没有退场动画可播，立即派发 `toast-close` |
| 同 tick 仍在待挂载    | 挂载前出队：不会出现，也不派发事件       |
| 已在退场              | 空操作，由那条 toast 自己走完退场        |

`toast.clear()` 的口径相同：队列条目一并取消，已挂载的全部关闭。

**事件：** `toast-close` (`CustomEvent<{ id: string; reason: 'auto' | 'manual' | 'programmatic' | 'clear' }>`)

悬停暂停自动关闭计时器（使用 `pointerenter`/`pointerleave`），指针离开后**续跑剩余时间**，而不是重新计满。暂停期间漏掉 `pointerleave`（指针拖出窗口、元素在悬停中被搬迁或摘出）时，由 document 级 `pointerover`/`pointerout`/`pointerleave` 兜底恢复，不会永久停在屏幕上。同一微任务中批量挂载 Toast。

**CSS 自定义属性：**

| 属性                            | 默认值 | 说明                       |
| ------------------------------- | ------ | -------------------------- |
| `--wui-toast-viewport-gap`      | `16px` | Toast 到视口边缘的可见距离 |
| `--wui-toast-container-padding` | `40px` | 容器预留的扩散阴影绘制空间 |

---

### 子项

#### `<web-ui-option>`

`<web-ui-select>` 的选择选项。

| 属性       | 类型      | 默认值  | 说明                               |
| ---------- | --------- | ------- | ---------------------------------- |
| `value`    | `string`  | `''`    | 选中值                             |
| `label`    | `string`  | `''`    | 显示文本；未设置时回退默认插槽文本 |
| `selected` | `boolean` | `false` | 当前是否选中                       |
| `disabled` | `boolean` | `false` | 禁用状态                           |

**插槽：** `default`（标签文本回退）、`prefix`（标签前装饰内容）、`suffix`（标签后装饰内容）

非表单关联组件（父级 select 统一提交）。

**CSS 自定义属性：**

| 属性                         | 默认值  | 说明                      |
| ---------------------------- | ------- | ------------------------- |
| `--wui-option-check-display` | `block` | 选中勾选图标的 display 值 |

#### `<web-ui-segmented-trigger>`

`<web-ui-segmented>` 的分段按钮。

| 属性       | 类型      | 默认值  | 说明               |
| ---------- | --------- | ------- | ------------------ |
| `value`    | `string`  | `''`    | 分段值             |
| `checked`  | `boolean` | `false` | 当前选中           |
| `disabled` | `boolean` | `false` | 单独禁用该 trigger |

**事件：** `change`

非表单关联组件（父级 segmented 统一提交）。

**CSS 自定义属性：**

| 属性                                | 默认值                           | 说明             |
| ----------------------------------- | -------------------------------- | ---------------- |
| `--wui-segmented-trigger-px`        | `12px`                           | 水平内边距       |
| `--wui-segmented-trigger-bg-hover`  | `--wui-color-state-layer-hover`  | Trigger 悬停背景 |
| `--wui-segmented-trigger-bg-active` | `--wui-color-state-layer-active` | Trigger 按下背景 |
