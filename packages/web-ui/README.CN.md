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

### Vue

需要 `vue >= 3.5` 作为可选 peer 依赖。

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

### 表单关联控件

所有表单控件均参与原生 `FormData`、约束校验、`form.reset()` 和浏览器表单状态恢复。控件会在**首次连接且声明式属性完成初始化后**捕获一次重置默认值；之后的运行时 property 更新不会改写该默认值。祖先 `fieldset` 的禁用状态会禁用交互和校验，但不会改写控件公开的 `disabled` 属性。对于 checkbox/radio group，父 group 是提交、重置和状态恢复的唯一所有者；被管理的子项不会独立提交或恢复状态。

## 所有组件

| 分类            | 组件                                                      |
| --------------- | --------------------------------------------------------- |
| **表单控件**    | [`<web-ui-input>`](#web-ui-input)                         |
|                 | [`<web-ui-textarea>`](#web-ui-textarea)                   |
|                 | [`<web-ui-input-number>`](#web-ui-input-number)           |
|                 | [`<web-ui-select>`](#web-ui-select)                       |
|                 | [`<web-ui-autocomplete>`](#web-ui-autocomplete)           |
|                 | [`<web-ui-slider>`](#web-ui-slider)                       |
|                 | [`<web-ui-checkbox>`](#web-ui-checkbox)                   |
|                 | [`<web-ui-radio>`](#web-ui-radio)                         |
|                 | [`<web-ui-switch>`](#web-ui-switch)                       |
|                 | [`<web-ui-segmented>`](#web-ui-segmented)                 |
|                 | [`<web-ui-checkbox-group>`](#web-ui-checkbox-group)       |
|                 | [`<web-ui-radio-group>`](#web-ui-radio-group)             |
| **按钮**        | [`<web-ui-button>`](#web-ui-button)                       |
|                 | [`<web-ui-button-group>`](#web-ui-button-group)           |
| **浮层 / 模态** | [`<web-ui-dialog>`](#web-ui-dialog)                       |
|                 | [`<web-ui-drawer>`](#web-ui-drawer)                       |
| **浮动**        | [`<web-ui-popover>`](#web-ui-popover)                     |
|                 | [`<web-ui-tooltip>`](#web-ui-tooltip)                     |
|                 | [`<web-ui-context-menu>`](#web-ui-context-menu)           |
| **菜单**        | [`<web-ui-dropdown>`](#web-ui-dropdown)                   |
|                 | [`<web-ui-dropdown-item>`](#web-ui-dropdown-item)         |
|                 | [`<web-ui-dropdown-divider>`](#web-ui-dropdown-divider)   |
|                 | [`<web-ui-dropdown-header>`](#web-ui-dropdown-header)     |
| **数据展示**    | [`<web-ui-avatar>`](#web-ui-avatar)                       |
|                 | [`<web-ui-badge>`](#web-ui-badge)                         |
|                 | [`<web-ui-empty>`](#web-ui-empty)                         |
|                 | [`<web-ui-icon>`](#web-ui-icon)                           |
|                 | [`<web-ui-spinner>`](#web-ui-spinner)                     |
| **布局与工具**  | [`<web-ui-layout>`](#web-ui-layout)                       |
|                 | [`<web-ui-back-top>`](#web-ui-back-top)                   |
|                 | [`<web-ui-svg-draw-lines>`](#web-ui-svg-draw-lines)       |
|                 | [`<web-ui-theme>`](#web-ui-theme)                         |
| **通知**        | [`<web-ui-toast>`](#web-ui-toast)                         |
| **子项**        | [`<web-ui-option>`](#web-ui-option)                       |
|                 | [`<web-ui-segmented-trigger>`](#web-ui-segmented-trigger) |

## API 参考

### 表单控件

表单控件声明 `static formAssociated = true`，集成原生 `<form>`：通过 `FormData` 提交值，实现 `formResetCallback()` / `formDisabledCallback()`。

#### `<web-ui-input>`

文本输入框，支持清除按钮和前后缀插槽。

| 属性          | 类型      | 默认值   | 说明            |
| ------------- | --------- | -------- | --------------- |
| `value`       | `string`  | `''`     | 输入值          |
| `type`        | `string`  | `'text'` | HTML input 类型 |
| `placeholder` | `string`  | `''`     | 占位文本        |
| `name`        | `string`  | `''`     | 表单字段名      |
| `disabled`    | `boolean` | `false`  | 禁用状态        |
| `readonly`    | `boolean` | `false`  | 只读状态        |
| `required`    | `boolean` | `false`  | 必填校验        |
| `clearable`   | `boolean` | `false`  | 显示清除按钮    |
| `full`        | `boolean` | `false`  | 全宽            |
| `borderless`  | `boolean` | `false`  | 无边框          |
| `aria-label`  | `string`  | —        | 无障碍标签      |

**事件：** `input`, `change`, `focus`, `blur`

**插槽：** `prefix`, `default`, `suffix`

**CSS 自定义属性：**

| 属性                      | 默认值                           | 说明         |
| ------------------------- | -------------------------------- | ------------ |
| `--wui-input-clear-color` | `var(--wui-color-text-tertiary)` | 清除按钮颜色 |

#### `<web-ui-textarea>`

多行文本输入框，支持自动调整高度。

| 属性              | 类型      | 默认值  | 说明                               |
| ----------------- | --------- | ------- | ---------------------------------- |
| `value`           | `string`  | `''`    | 输入值                             |
| `placeholder`     | `string`  | `''`    | 占位文本                           |
| `rows`            | `number`  | `3`     | 显示行数                           |
| `name`            | `string`  | `''`    | 表单字段名                         |
| `disabled`        | `boolean` | `false` | 禁用状态                           |
| `readonly`        | `boolean` | `false` | 只读状态                           |
| `required`        | `boolean` | `false` | 必填校验                           |
| `clearable`       | `boolean` | `false` | 显示清除按钮                       |
| `full`            | `boolean` | `false` | 全宽                               |
| `borderless`      | `boolean` | `false` | 无边框                             |
| `autosize`        | `boolean` | `false` | 自动调整高度                       |
| `max-height`      | `number`  | `0`     | 自动高度上限（px），`0` 表示不限制 |
| `minlength`       | `number`  | —       | 最小长度校验                       |
| `maxlength`       | `number`  | —       | 最大长度校验                       |
| `aria-label`      | `string`  | —       | 无障碍标签                         |
| `aria-labelledby` | `string`  | —       | 无障碍标签引用                     |

**事件：** `input`, `change`, `focus`, `blur`

**方法：** `focus()`, `blur()`, `select()`

**插槽：** `prefix`, `suffix`

**CSS 自定义属性：**

| 属性                         | 默认值                           | 说明         |
| ---------------------------- | -------------------------------- | ------------ |
| `--wui-textarea-width`       | `200px`                          | 文本域宽度   |
| `--wui-textarea-clear-color` | `var(--wui-color-text-tertiary)` | 清除按钮颜色 |

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

| 属性               | 类型                               | 默认值  | 说明                 |
| ------------------ | ---------------------------------- | ------- | -------------------- |
| `value`            | `string`                           | `''`    | 选中值               |
| `placeholder`      | `string`                           | `''`    | 占位文本             |
| `name`             | `string`                           | `''`    | 表单字段名           |
| `disabled`         | `boolean`                          | `false` | 禁用状态             |
| `required`         | `boolean`                          | `false` | 必填校验             |
| `portal`           | `boolean`                          | `false` | 在主题浮层容器中渲染 |
| `no-scroll-lock`   | `boolean`                          | `false` | 打开时不锁定页面滚动 |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —       | 显式 Portal 容器     |

**事件：** `input`, `change`, `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `default`（投影 `<web-ui-option>` 元素）、`trigger`（自定义触发区域内容，替换默认 label 和箭头）

子 `<web-ui-option>` 通过 `option-register` / `option-unregister` 注册。支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航。

**CSS 自定义属性：**

| 属性                      | 默认值  | 说明           |
| ------------------------- | ------- | -------------- |
| `--wui-select-max-width`  | `500px` | 下拉框最大宽度 |
| `--wui-overlay-min-width` | `200px` | 下拉框最小宽度 |

#### `<web-ui-autocomplete>`

可输入并过滤候选的单值选择器。

| 属性               | 类型                               | 默认值       | 说明                                                    |
| ------------------ | ---------------------------------- | ------------ | ------------------------------------------------------- |
| `value`            | `string`                           | `''`         | 当前输入文本（表单值）                                  |
| `selected-value`   | `string`                           | `''`         | 输入文本精确匹配 label 的 option 的 value（派生，只读） |
| `placeholder`      | `string`                           | `''`         | 占位文本                                                |
| `filter`           | `'none' \| 'prefix' \| 'contains'` | `'contains'` | 候选过滤模式（按 option label 匹配）                    |
| `name`             | `string`                           | `''`         | 表单字段名                                              |
| `disabled`         | `boolean`                          | `false`      | 禁用状态                                                |
| `readonly`         | `boolean`                          | `false`      | 只读状态（不可输入、不可展开下拉）                      |
| `required`         | `boolean`                          | `false`      | 必填校验                                                |
| `portal`           | `boolean`                          | `false`      | 在主题浮层容器中渲染                                    |
| `no-scroll-lock`   | `boolean`                          | `false`      | 打开时不锁定页面滚动                                    |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —            | 显式 Portal 容器                                        |
| `aria-label`       | `string`                           | —            | 无障碍名称                                              |
| `aria-labelledby`  | `string`                           | —            | 无障碍名称引用                                          |

**事件：** `input`, `change`, `focus`, `blur`, `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `default`（投影 `<web-ui-option>` 元素）

键入时按 label 过滤候选（`contains` 或 `prefix`，`none` 关闭过滤）。选择 option 时文本回填为该项 label，`selected-value` 暴露该项的 value；`change` 在选择提交时触发。支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航。

**CSS 自定义属性：**

| 属性                           | 默认值  | 说明           |
| ------------------------------ | ------- | -------------- |
| `--wui-autocomplete-max-width` | `500px` | 下拉框最大宽度 |
| `--wui-overlay-min-width`      | `200px` | 下拉框最小宽度 |

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

支持 ArrowLeft/Right/Up/Down、Home/End、PageUp/PageDown 键盘导航。使用 pointer capture 处理鼠标、触控笔和触摸交互。

**CSS 自定义属性：**

| 属性                           | 默认值                              | 说明         |
| ------------------------------ | ----------------------------------- | ------------ |
| `--wui-slider-width`           | `200px`                             | 滑块宽度     |
| `--wui-slider-vertical-height` | `200px`                             | 垂直滑块高度 |
| `--wui-slider-height`          | `var(--wui-slider-track-size, 6px)` | 轨道厚度     |
| `--wui-slider-track-size`      | `6px`                               | 轨道尺寸     |
| `--wui-slider-thumb-width`     | `24px`                              | 滑块短轴     |
| `--wui-slider-thumb-height`    | `32px`                              | 滑块长轴     |
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

#### `<web-ui-checkbox-group>`

多选复选框组。

| 属性       | 类型       | 默认值  | 说明           |
| ---------- | ---------- | ------- | -------------- |
| `value`    | `string[]` | `[]`    | 已选项的值数组 |
| `name`     | `string`   | `''`    | 表单字段名     |
| `disabled` | `boolean`  | `false` | 禁用全部子项   |
| `required` | `boolean`  | `false` | 必填校验       |

**事件：** `input`, `change`

**插槽：** `default`（投影 `<web-ui-checkbox>` 元素）

同步子 checkbox 的 `checked` 状态。`disabled` 提供继承的有效禁用状态，不改写子项自身的 `disabled` 属性。监听子项 `change` 事件。

#### `<web-ui-radio-group>`

单选组。

| 属性       | 类型      | 默认值  | 说明                     |
| ---------- | --------- | ------- | ------------------------ |
| `value`    | `string`  | `''`    | 当前选中值               |
| `name`     | `string`  | `''`    | 表单字段名（传递到子项） |
| `disabled` | `boolean` | `false` | 禁用全部子项             |
| `required` | `boolean` | `false` | 必填校验                 |

**事件：** `input`, `change`

**插槽：** `default`（投影 `<web-ui-radio>` 元素）

`disabled` 提供继承的有效禁用状态，不改写子项自身的 `disabled` 属性。

---

### 按钮

#### `<web-ui-button>`

样式化按钮，支持多种变体和加载状态。

| 属性         | 类型                                                         | 默认值     | 说明                                                          |
| ------------ | ------------------------------------------------------------ | ---------- | ------------------------------------------------------------- |
| `variant`    | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'`  | 按钮变体                                                      |
| `type`       | `'button' \| 'submit' \| 'reset'`                            | `'button'` | 内部按钮类型；非法值回退为 `button`                           |
| `disabled`   | `boolean`                                                    | `false`    | 禁用状态                                                      |
| `loading`    | `boolean`                                                    | `false`    | 加载旋转动画                                                  |
| `full`       | `boolean`                                                    | `false`    | 全宽                                                          |
| `icon`       | `boolean`                                                    | `false`    | 纯图标模式                                                    |
| `size`       | `string`                                                     | `''`       | 按钮高度（px）；icon 模式下同时设为 min-width，默认保持正方形 |
| `aria-label` | `string`                                                     | —          | 无障碍标签（委托给内部按钮）                                  |

**事件：** 标准 `click`

**插槽：** `prefix`, `default`, `suffix`

`submit` 和 `reset` 不会提交或重置组件 Shadow DOM 外祖先 `<form>`。如需外部表单行为，请使用 form-associated 控件。

禁用和加载状态阻止 `click` 事件。

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

| 属性                | 类型      | 默认值  | 说明                 |
| ------------------- | --------- | ------- | -------------------- |
| `open`              | `boolean` | `false` | 对话框可见性         |
| `no-scroll-lock`    | `boolean` | `false` | 打开时不锁定页面滚动 |
| `no-backdrop-close` | `boolean` | `false` | 禁止点击遮罩关闭     |
| `no-escape-close`   | `boolean` | `false` | 禁止按 Escape 关闭   |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `body`, `title`, `default`, `footer`

**方法：** `showModal()`, `close()`

使用原生 `<dialog>`，`@cancel` 阻止默认关闭行为。除非存在 `no-escape-close`，否则 Escape 调用 `close()`；除非存在 `no-backdrop-close`，否则点击遮罩关闭。

**CSS 自定义属性：**

| 属性                      | 默认值                      | 说明           |
| ------------------------- | --------------------------- | -------------- |
| `--wui-dialog-max-width`  | `360px`                     | 对话框最大宽度 |
| `--wui-dialog-overlay-bg` | `var(--wui-color-backdrop)` | 遮罩背景色     |

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
| `request-only`      | `boolean`                                | `false`   | 用户关闭仅请求 `open=false`，由 Consumer 回写 `open` |
| `headless`          | `boolean`                                | `false`   | 仅保留 overlay 行为，默认插槽不渲染内置抽屉 UI       |
| `dialog-label`      | `string`                                 | `''`      | 内部原生 dialog 的可访问名称；headless 模式必须提供  |
| `draggable`         | `boolean`                                | `false`   | 打开时在抽屉内缘显示 drag bar，支持拖拽关闭手势      |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)。启用 `request-only` 后，Escape、遮罩和内置关闭按钮仅请求 `open=false`；Consumer 写入 `open=false` 前抽屉保持打开。若原生 dialog 在请求被拒绝期间关闭，组件会恢复其打开的 top layer 状态并发出同一关闭请求。

**插槽：** `header`, `default`, `footer`；启用 `headless` 时仅渲染 `default` 插槽。

**方法：** `show()`, `close()`

`headless` 保留原生 dialog、遮罩、placement 动画、Escape/遮罩关闭行为和滚动锁定，但不渲染内置 glass 主体、header、关闭按钮或 footer；Consumer 负责完整定义默认插槽内容的样式，并且必须提供 `dialog-label`，确保原生 dialog 具有可访问名称。

关闭时保留原生 dialog 的 top layer，待退出过渡完成后调用 `dialog.close()`。Escape 始终走此关闭路径；`no-backdrop-close` 仅控制遮罩点击。

**拖拽关闭：** 启用 `draggable` 后，打开的抽屉在内缘显示灰色胶囊 drag bar（`right` 在左缘、`left` 在右缘、`top` 在下缘、`bottom` 在上缘）。拖拽实时跟手（遮罩透明度按比例淡出）；松手时位移超过抽屉尺寸约 1/3 或快速甩动即弹簧关闭，否则弹回打开位，方向随 placement 适配。启用 `request-only` 后，超过阈值松手仅派发 `open-change(false)`；抽屉在闭合位短暂等待，Consumer 拒绝回写时弹回打开位。不支持拖拽打开——关闭态的抽屉在原生 dialog 之外没有任何渲染物。`prefers-reduced-motion` 下松手即时到位，不播放弹簧动画。

**CSS 自定义属性：**

| 属性                      | 默认值                             | 说明                                               |
| ------------------------- | ---------------------------------- | -------------------------------------------------- |
| `--wui-drawer-width`      | `320px`                            | 抽屉宽度                                           |
| `--wui-drawer-height`     | `300px`                            | 抽屉高度（上/下）                                  |
| `--wui-drawer-bg`         | `var(--wui-color-surface-overlay)` | 抽屉背景色                                         |
| `--wui-drawer-radius`     | `28px`                             | 浮动卡片圆角（非 headless）                        |
| `--wui-drawer-inset`      | `8px`                              | 浮动卡片视口留边（非 headless）；置 `0` 为贴边几何 |
| `--wui-drawer-overlay-bg` | `rgb(0 0 0 / 0.12)`                | 遮罩背景色                                         |

---

### 浮动

#### `<web-ui-popover>`

锚定触发元素的弹出层。

| 属性               | 类型                               | 默认值     | 说明                 |
| ------------------ | ---------------------------------- | ---------- | -------------------- |
| `open`             | `boolean`                          | `false`    | 弹出层可见性         |
| `disabled`         | `boolean`                          | `false`    | 禁用状态             |
| `placement`        | `Placement`                        | `'bottom'` | Floating UI 位置     |
| `trigger`          | `'click' \| 'hover' \| 'manual'`   | `'click'`  | 触发方式             |
| `offset`           | `number`                           | `8`        | 与锚点距离           |
| `portal`           | `boolean`                          | `false`    | 在主题浮层容器中渲染 |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —          | 显式 Portal 容器     |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `trigger`, `default`

**方法：** `show()`, `close()`, `toggle()`

Hover 模式使用 `pointerenter`/`pointerleave` 加延迟控制。Click 模式点击切换。Manual 模式仅响应命令式调用。

#### `<web-ui-tooltip>`

工具提示，支持指针和焦点触发。

| 属性               | 类型                               | 默认值  | 说明                 |
| ------------------ | ---------------------------------- | ------- | -------------------- |
| `placement`        | `Placement`                        | `'top'` | Floating UI 位置     |
| `content`          | `string`                           | `''`    | 提示文本（替代插槽） |
| `open`             | `boolean`                          | `false` | 可见性               |
| `disabled`         | `boolean`                          | `false` | 禁用状态             |
| `show-delay`       | `number`                           | `200`   | 显示延迟（毫秒）     |
| `hide-delay`       | `number`                           | `100`   | 隐藏延迟（毫秒）     |
| `offset`           | `number`                           | `6`     | 与触发器的距离       |
| `portal`           | `boolean`                          | `false` | 在主题浮层容器中渲染 |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —       | 显式 Portal 容器     |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `default`（触发器）、`content`（提示面板）

`open` 是受控可见性属性。指针/焦点触发会更新它，直接设置也会同步本地或 Portal 面板。第一个 Tooltip 显示后，相邻 Tooltip 会立即切换；其余 pointer/focus 触发使用延迟计时器。

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

| 属性               | 默认值    | 说明     |
| ------------------ | --------- | -------- |
| `--wui-icon-color` | `inherit` | 图标颜色 |

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

---

### 布局与工具

#### `<web-ui-layout>`

响应式页面布局：支持可选全宽 Banner、桌面端可折叠侧边栏，以及移动端 headless drawer。页面本身滚动；Banner 滚出后，桌面端 sidebar 和 header 固定在视口内。

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

**侧边栏调整宽度：** 启用 `sidebar-resizable` 后，桌面端侧边栏右边缘会出现调整手柄（折叠状态下隐藏）。悬停或拖拽时显示 3px 宽的强调色垂直线和 `col-resize` 光标。拖拽时实时更新宽度（禁止过渡动画，限制在 `[min, max]` 和视口范围内）；释放时触发 `sidebar-width-change` 事件并携带最终像素宽度，控制权交还给 `sidebar-width` 属性等待 Consumer 回写。`pointercancel` 会恢复属性控制的宽度且不触发事件。手柄同时支持键盘（WAI-ARIA splitter 模式）：聚焦后用 ←/→ 以 16px 步进调整（Shift 加速到 64px），Home/End 跳到 min/max，Enter 以同一 `sidebar-width-change` 请求提交，Escape 撤回未提交的调整。移动端 Drawer 始终通过其内置 `draggable` 抽屉支持拖拽关闭。

| 插槽      | 说明                                                         |
| --------- | ------------------------------------------------------------ |
| `banner`  | 位于布局主体上方的可选全宽 Banner                            |
| `header`  | 内容区的 sticky header                                       |
| `sidebar` | 侧边栏卡片内容；内部固定区域与滚动容器均由 Consumer 自行定义 |
| `default` | 主内容区                                                     |
| `tabbar`  | 底部 tabbar                                                  |

`web-ui-layout` 只约束侧边栏卡片的可用空间并管理桌面端 Toggle，不创建侧边栏 scrollport。若仅让侧边栏的一部分滚动，请将 `sidebar` 插槽根节点设为 `height: 100%; min-height: 0` 的 flex column，再将 `overflow-y: auto` 设置到目标子元素。这样 Consumer 可自行固定头部和底部，无需额外的公共 slot。

在 `640px` 及以下，侧边栏会切换为 headless 模式的 `web-ui-drawer`。Consumer 内容仍渲染在相同的圆角侧边栏卡片中，移动端 Toggle 位于 header 行内。

`header-glow` 会在 header 插槽内容和移动端 Toggle 的背后添加 `pointer-events: none` 的装饰性晕染。它属于 Header 背景而非前景层，因此插槽内容始终位于其上方；可通过 `--wui-layout-header-glow-color` 覆盖颜色，默认值为 `--wui-color-page`。晕染浓度和范围由内部变量 `--wui-layout-header-glow-height`（默认 `150%`）控制；增大可加强覆盖，减小则更柔和。布局层级顺序为 Header（`10`）< Auxiliary（`20`）< Banner（`30`）< Tabbar（`40`）< Sidebar（`50`）。

**CSS 自定义属性：**

| 属性                          | 默认值 | 说明                                 |
| ----------------------------- | ------ | ------------------------------------ |
| `--wui-layout-sidebar-radius` | `28px` | 侧边栏卡片圆角（桌面端和移动端共用） |

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

SVG 线条绘制动画，基于 `stroke-dashoffset`。直接在原元素上动画 —— 不克隆、不操作 DOM。

| 属性       | 类型     | 默认值     | 说明                                         |
| ---------- | -------- | ---------- | -------------------------------------------- |
| `duration` | `number` | `1000`     | 动画时长（毫秒），限制在 `[0, 30000]` 范围内 |
| `easing`   | `string` | `'linear'` | CSS 缓动函数，传递给 `element.animate()`     |

两个属性均会反射（reflected）。

**方法：** `replay(): Promise<void>` — 取消当前动画，重新从 DOM 收集几何元素并开始新动画。所有目标以相同的 duration/easing 并行播放。动画全部完成后 resolve。最近主题范围为 `motion="reduced"` 时立即返回，不播放动画；`motion="system"` 则在匹配 `prefers-reduced-motion: reduce` 时执行相同行为。

**插槽：** `default` — 需要动画的 SVG 内容。接受内联 `<svg>` 元素（light DOM）以及将 SVG 渲染在开放 Shadow DOM 中的组件（如 `<web-ui-icon>`）。closed Shadow Root 被跳过。

递归遍历 light DOM 和所有开放 Shadow Root，查找 `path`、`rect`、`circle`、`line`、`polyline`、`polygon`、`ellipse` 元素。以 `Z`/`z` 结尾的 `<path>` 会临时应用缺口修复逻辑确保闭合段正确渲染。动画完成或取消后恢复所有内联样式。

#### `<web-ui-theme>`

主题提供者，定义 CSS 自定义属性 token。

| 属性         | 类型                              | 默认值     | 说明                       |
| ------------ | --------------------------------- | ---------- | -------------------------- |
| `appearance` | `'light' \| 'dark' \| 'system'`   | `'light'`  | 配色方案                   |
| `motion`     | `'full' \| 'reduced' \| 'system'` | `'system'` | 当前嵌套主题范围的动效偏好 |

**方法：** `getOverlayRoot()` — 返回 Portal 浮层容器

在其子树中定义基础、颜色、层级、阴影和动效 token。`motion="system"` 跟随 `prefers-reduced-motion`；使用 `motion="reduced"` 降低当前作用域动效，或在嵌套主题中使用 `motion="full"` 恢复默认 token。System 配色模式跟随 `prefers-color-scheme`。

**基础 token：**

| 属性                      | 默认值  | 说明                     |
| ------------------------- | ------- | ------------------------ |
| `--wui-font-size`         | `14px`  | 控件基础字号             |
| `--wui-input-width`       | `200px` | 紧凑表单控件默认宽度     |
| `--wui-control-size`      | `40px`  | 控件默认高度和方形最小宽 |
| `--wui-overlay-min-width` | `200px` | 锚定浮层最小宽度         |
| `--wui-focus-ring-width`  | `3px`   | Focus 指示器宽度         |

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

**动效 token：** duration 默认值为 `--wui-duration-press: 80ms`、`--wui-duration-feedback: 100ms`、`--wui-duration-trigger: 160ms`、`--wui-duration-focus: 200ms`、`--wui-duration-menu-enter: 140ms`、`--wui-duration-menu-exit: 100ms`、`--wui-duration-overlay-enter: 180ms`、`--wui-duration-overlay-exit: 140ms`、`--wui-duration-drawer-enter: 280ms`、`--wui-duration-drawer-exit: 240ms`、`--wui-duration-layout: 200ms`。Easing token 是 `--wui-ease-enter` 和 `--wui-ease-slide`；进入缩放是 `--wui-scale-enter: 0.97`。

**颜色 token：**

| 属性                               | 浅色默认值                                                   | 深色默认值                                                   | 说明                   |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------- |
| `--wui-color-page`                 | `#fff`                                                       | `#18181a`                                                    | 页面背景               |
| `--wui-color-surface`              | `#fff`                                                       | `#2c2c2e`                                                    | 普通 表面              |
| `--wui-color-surface-raised`       | `#f2f2f7`                                                    | `#2c2c2e`                                                    | 抬升表面               |
| `--wui-color-surface-control`      | `#dfdfdf`                                                    | `#3a3a3c`                                                    | 中性可交互控件表面     |
| `--wui-color-surface-track`        | `#e5e5ea`                                                    | `#444446`                                                    | Slider/Switch 轨道表面 |
| `--wui-color-surface-glass`        | `rgb(250 250 250 / 0.34)`                                    | `rgb(44 44 46 / 0.42)`                                       | 液态玻璃表面           |
| `--wui-color-surface-glass-hover`  | `color-mix(... text 6%, surface-glass)`                      | `color-mix(... text 6%, surface-glass)`                      | Glass 完整悬停背景     |
| `--wui-color-surface-glass-active` | `color-mix(... text 15%, surface-glass)`                     | `color-mix(... text 15%, surface-glass)`                     | Glass 完整按下背景     |
| `--wui-color-surface-overlay`      | `rgb(246 246 246 / 0.82)`                                    | `rgb(44 44 46 / 0.82)`                                       | 半透明浮层表面         |
| `--wui-color-text`                 | `#1b1b1b`                                                    | `#f5f5f7`                                                    | 主要文本               |
| `--wui-color-text-secondary`       | `#6a6a6a`                                                    | `#a1a1a6`                                                    | 次要文本               |
| `--wui-color-text-tertiary`        | `color-mix(in srgb, var(--wui-color-text) 35%, transparent)` | `color-mix(in srgb, var(--wui-color-text) 42%, transparent)` | 三级文本和弱意图图标   |
| `--wui-color-text-disabled`        | `color-mix(in srgb, var(--wui-color-text) 32%, transparent)` | `color-mix(in srgb, var(--wui-color-text) 38%, transparent)` | 禁用态前景文本         |
| `--wui-color-state-layer-hover`    | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`  | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`  | 透明悬停层             |
| `--wui-color-state-layer-active`   | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)` | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)` | 透明按下层             |
| `--wui-color-border`               | `rgb(0 0 0 / 0.1)`                                           | `rgb(255 255 255 / 0.14)`                                    | 常规边框和分隔线       |
| `--wui-color-glass-border`         | `rgb(51 51 51 / 0.12)`                                       | `rgb(255 255 255 / 0.16)`                                    | Glass 边框色调         |
| `--wui-color-glass-highlight`      | `rgb(255 255 255 / 0.9)`                                     | `rgb(255 255 255 / 0.22)`                                    | Glass 高光边缘         |
| `--wui-color-accent`               | `#08f`                                                       | `#0a84ff`                                                    | Accent 和输入焦点边框  |
| `--wui-color-on-accent`            | `#fff`                                                       | `#fff`                                                       | Accent 上的前景色      |
| `--wui-color-success`              | `#16a34a`                                                    | `#30d158`                                                    | 成功                   |
| `--wui-color-warning`              | `#d97706`                                                    | `#ff9f0a`                                                    | 警告                   |
| `--wui-color-danger`               | `#dc2626`                                                    | `#ff453a`                                                    | 危险                   |
| `--wui-color-info`                 | `#2563eb`                                                    | `#64d2ff`                                                    | 信息                   |
| `--wui-color-backdrop`             | `rgb(0 0 0 / 0.12)`                                          | `rgb(0 0 0 / 0.48)`                                          | Modal 遮罩             |
| `--wui-color-focus-ring`           | `rgb(0 136 255 / 0.4)`                                       | `rgb(10 132 255 / 0.62)`                                     | Focus 指示器颜色       |

**阴影 token：**

| 属性                   | 浅色默认值                       | 深色默认值                      | 说明              |
| ---------------------- | -------------------------------- | ------------------------------- | ----------------- |
| `--wui-shadow-overlay` | `2px 16px 40px rgb(0 0 0 / 0.4)` | `0 18px 48px rgb(0 0 0 / 0.54)` | Modal/Drawer 阴影 |
| `--wui-shadow-panel`   | `0 3px 9px rgb(0 0 0 / 0.27)`    | `0 4px 16px rgb(0 0 0 / 0.35)`  | 小型浮动面板阴影  |
| `--wui-shadow-glass`   | 四层扩散阴影                     | `0 12px 32px rgb(0 0 0 / 0.38)` | 液态玻璃基础阴影  |

**内部 token：** 以 `--wui-internal-*` 为前缀的变量是 Shadow DOM 内部接线变量，不属于公共 token API，消费方不应覆盖。

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

// 更新可见内容，不重置自动关闭计时
toast.updateMessage(id, { message: '上传已完成 60%', heading: '正在上传' })
```

**ToastOptions：**

| 选项        | 类型                                          | 默认值                    | 说明                         |
| ----------- | --------------------------------------------- | ------------------------- | ---------------------------- |
| `message`   | `string`                                      | —                         | 通知文本                     |
| `type`      | `'success' \| 'info' \| 'warning' \| 'error'` | `'info'`                  | 类型                         |
| `duration`  | `number`                                      | `3000`（error 为 `5000`） | 自动关闭时间（0=不自动关闭） |
| `closable`  | `boolean`                                     | `true`                    | 显示关闭按钮                 |
| `id`        | `string`                                      | auto                      | 去重标识符                   |
| `heading`   | `string`                                      | `''`                      | 粗体标题                     |
| `position`  | 6 种位置                                      | `'top-right'`             | 屏幕位置                     |
| `target`    | `Element`                                     | —                         | 用于查找最近主题作用域       |
| `container` | `HTMLElement`                                 | —                         | 显式挂载容器（最高优先级）   |

**`toast.updateMessage(id, options)`** 更新可见 Toast 的 `message`，并在传入时更新 `heading`；不会重置自动关闭计时。`options` 类型为 `ToastMessageUpdateOptions`：`{ message: string; heading?: string }`。

**事件：** `toast-close` (`CustomEvent<{ id: string; reason: 'auto' | 'manual' | 'programmatic' | 'clear' }>`)

悬停暂停自动关闭计时器（使用 `pointerenter`/`pointerleave`）。同一微任务中批量挂载 Toast。

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
