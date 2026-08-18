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

| 属性         | 类型                                                         | 默认值     | 说明                                |
| ------------ | ------------------------------------------------------------ | ---------- | ----------------------------------- |
| `variant`    | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'`  | 按钮变体                            |
| `type`       | `'button' \| 'submit' \| 'reset'`                            | `'button'` | 内部按钮类型；非法值回退为 `button` |
| `disabled`   | `boolean`                                                    | `false`    | 禁用状态                            |
| `loading`    | `boolean`                                                    | `false`    | 加载旋转动画                        |
| `full`       | `boolean`                                                    | `false`    | 全宽                                |
| `icon`       | `boolean`                                                    | `false`    | 纯图标模式                          |
| `size`       | `string`                                                     | `''`       | 尺寸格式 `高度` 或 `高度x宽度`      |
| `aria-label` | `string`                                                     | —          | 无障碍标签（委托给内部按钮）        |

**事件：** 标准 `click`

**插槽：** `prefix`, `default`, `suffix`

`submit` 和 `reset` 不会提交或重置组件 Shadow DOM 外祖先 `<form>`。如需外部表单行为，请使用 form-associated 控件。

禁用和加载状态阻止 `click` 事件。

#### `<web-ui-button-group>`

按钮组，管理子按钮布局和方向。

| 属性        | 类型                         | 默认值         | 说明     |
| ----------- | ---------------------------- | -------------- | -------- |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | 布局方向 |

**插槽：** `default`（投影 `<web-ui-button>` 元素）

向子按钮传递 `direction` 属性。

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

#### `<web-ui-drawer>`

侧边抽屉，使用原生 `<dialog>` 并自带关闭动画。

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

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)。启用 `request-only` 后，Escape、遮罩和内置关闭按钮仅请求 `open=false`；Consumer 写入 `open=false` 前抽屉保持打开。若原生 dialog 在请求被拒绝期间关闭，组件会恢复其打开的 top layer 状态并发出同一关闭请求。

**插槽：** `header`, `default`, `footer`；启用 `headless` 时仅渲染 `default` 插槽。

**方法：** `show()`, `close()`

`headless` 保留原生 dialog、遮罩、placement 动画、Escape/遮罩关闭行为和滚动锁定，但不渲染内置 glass 主体、header、关闭按钮或 footer；Consumer 负责完整定义默认插槽内容的样式，并且必须提供 `dialog-label`，确保原生 dialog 具有可访问名称。

关闭时保留原生 dialog 的 top layer，待退出过渡完成后调用 `dialog.close()`。Escape 始终走此关闭路径；`no-backdrop-close` 仅控制遮罩点击。

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

| 属性                | 类型      | 默认值    | 说明                                 |
| ------------------- | --------- | --------- | ------------------------------------ |
| `sidebar-collapsed` | `boolean` | `false`   | 桌面端侧边栏受控折叠状态             |
| `sidebar-open`      | `boolean` | `false`   | 移动端侧边栏 Drawer 受控打开状态     |
| `header-glow`       | `boolean` | `false`   | 在 header 插槽内容背后显示装饰性晕染 |
| `sidebar-width`     | `string`  | `'240px'` | 桌面端和移动端展开时的侧边栏宽度     |
| `collapsed-width`   | `string`  | `'72px'`  | 桌面端折叠时的侧边栏宽度             |

**事件：** `sidebar-collapsed-change`（`CustomEvent<{ collapsed: boolean }>`）用于请求更新桌面端折叠状态；`sidebar-open-change`（`CustomEvent<{ open: boolean }>`）用于请求更新移动端 Drawer 打开状态。Consumer 必须将请求值回写到对应的受控属性。

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

**定位：** `scrollTarget` 为 `window` 时按钮固定在视口角落；为 `HTMLElement` 时需将元素放置在容器内部，按钮通过 `position: sticky` 悬浮于容器底部角落。偏移量沿用 `--web-ui-back-top-top/right/bottom/left` CSS 变量。

角色：`button`，键盘 Enter 触发回到顶部。

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

定义 `--wui-color-*`、`--wui-shadow-*`、`--wui-layer-*` 与 motion token。布局层级 token 依次为 `--wui-layer-header: 10`、`--wui-layer-auxiliary: 20`、`--wui-layer-banner: 30`、`--wui-layer-tabbar: 40`、`--wui-layer-sidebar: 50`。motion token 是稳定的主题契约，可在主题范围覆盖：`--wui-duration-press`、`--wui-duration-feedback`、`--wui-duration-trigger`、`--wui-duration-focus`、`--wui-duration-menu-enter`、`--wui-duration-menu-exit`、`--wui-duration-overlay-enter`、`--wui-duration-overlay-exit`、`--wui-duration-drawer-enter`、`--wui-duration-drawer-exit`、`--wui-ease-enter`、`--wui-ease-slide`、`--wui-scale-enter`。`motion="system"` 跟随 `prefers-reduced-motion`；使用 `motion="reduced"` 降低当前作用域动效，或在嵌套主题中使用 `motion="full"` 恢复默认 token。System 配色模式跟随 `prefers-color-scheme`。

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

#### `<web-ui-segmented-trigger>`

`<web-ui-segmented>` 的分段按钮。

| 属性       | 类型      | 默认值  | 说明               |
| ---------- | --------- | ------- | ------------------ |
| `value`    | `string`  | `''`    | 分段值             |
| `checked`  | `boolean` | `false` | 当前选中           |
| `disabled` | `boolean` | `false` | 单独禁用该 trigger |

**事件：** `change`

非表单关联组件（父级 segmented 统一提交）。
