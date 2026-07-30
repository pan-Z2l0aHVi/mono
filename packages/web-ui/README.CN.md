# @greypan/web-ui

> 基于 Lit 的 Web Components，支持 React、Vue 和原生 HTML

[English](./README.md) | 简体中文

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

需要 `@types/react >= 16` 作为可选 peer 依赖。

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
      <web-ui-input onInput={e => console.log((e.target as any).value)} />
    </>
  )
}
```

### Vue

需要 `vue >= 3` 作为可选 peer 依赖。

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
</template>
```

## 所有组件

| 分类            | 组件                                                      |
| --------------- | --------------------------------------------------------- |
| **表单控件**    | [`<web-ui-input>`](#web-ui-input)                         |
|                 | [`<web-ui-textarea>`](#web-ui-textarea)                   |
|                 | [`<web-ui-input-number>`](#web-ui-input-number)           |
|                 | [`<web-ui-select>`](#web-ui-select)                       |
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
| `required`    | `boolean` | `false`  | 必填校验        |
| `clearable`   | `boolean` | `false`  | 显示清除按钮    |
| `full`        | `boolean` | `false`  | 全宽            |
| `borderless`  | `boolean` | `false`  | 无边框          |

**事件：** `input`, `change`, `focus`, `blur`

**插槽：** `prefix`, `default`, `suffix`

#### `<web-ui-textarea>`

多行文本输入框，支持自动调整高度。

| 属性              | 类型      | 默认值  | 说明           |
| ----------------- | --------- | ------- | -------------- |
| `value`           | `string`  | `''`    | 输入值         |
| `placeholder`     | `string`  | `''`    | 占位文本       |
| `rows`            | `number`  | `3`     | 显示行数       |
| `name`            | `string`  | `''`    | 表单字段名     |
| `disabled`        | `boolean` | `false` | 禁用状态       |
| `readonly`        | `boolean` | `false` | 只读状态       |
| `required`        | `boolean` | `false` | 必填校验       |
| `clearable`       | `boolean` | `false` | 显示清除按钮   |
| `full`            | `boolean` | `false` | 全宽           |
| `borderless`      | `boolean` | `false` | 无边框         |
| `autosize`        | `boolean` | `false` | 自动调整高度   |
| `minlength`       | `number`  | —       | 最小长度校验   |
| `maxlength`       | `number`  | —       | 最大长度校验   |
| `aria-label`      | `string`  | —       | 无障碍标签     |
| `aria-labelledby` | `string`  | —       | 无障碍标签引用 |

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
| `required`    | `boolean` | `false`    | 必填校验   |

**事件：** `input`, `change`

ArrowUp/ArrowDown 键增减数值。

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
| `lock-scroll`      | `boolean`                          | `true`  | 打开时锁定页面滚动   |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —       | 显式 Portal 容器     |

**事件：** `input`, `change`, `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `default`（投影 `<web-ui-option>` 元素）、`trigger`（自定义触发区域内容，替换默认 label 和箭头）

子 `<web-ui-option>` 通过 `option-register` / `option-unregister` 注册。支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航。

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

| 属性       | 类型      | 默认值  | 说明       |
| ---------- | --------- | ------- | ---------- |
| `value`    | `string`  | `''`    | 当前选中值 |
| `name`     | `string`  | `''`    | 表单字段名 |
| `disabled` | `boolean` | `false` | 禁用状态   |
| `required` | `boolean` | `false` | 必填校验   |

**事件：** `input`, `change`

**插槽：** `default`（投影 `<web-ui-segmented-trigger>` 元素）

与原生 `<form>` 集成（通过 `ElementInternals`）。

根据 `value` 同步子 trigger 的 `checked` 状态。直接设 `value` 不派发事件。

#### `<web-ui-checkbox-group>`

多选复选框组。

| 属性       | 类型       | 默认值  | 说明                   |
| ---------- | ---------- | ------- | ---------------------- |
| `value`    | `string[]` | `[]`    | 已选项的值数组         |
| `name`     | `string`   | `''`    | 表单字段名             |
| `disabled` | `boolean`  | `false` | 禁用状态（传递到子项） |
| `required` | `boolean`  | `false` | 必填校验               |

**事件：** `input`, `change`

**插槽：** `default`（投影 `<web-ui-checkbox>` 元素）

通过子项公开属性同步 `checked`/`disabled`。监听子项 `change` 事件。

#### `<web-ui-radio-group>`

单选组。

| 属性       | 类型      | 默认值  | 说明                     |
| ---------- | --------- | ------- | ------------------------ |
| `value`    | `string`  | `''`    | 当前选中值               |
| `name`     | `string`  | `''`    | 表单字段名（传递到子项） |
| `disabled` | `boolean` | `false` | 禁用状态（传递到子项）   |
| `required` | `boolean` | `false` | 必填校验                 |

**事件：** `input`, `change`

**插槽：** `default`（投影 `<web-ui-radio>` 元素）

---

### 按钮

#### `<web-ui-button>`

样式化按钮，支持多种变体和加载状态。

| 属性       | 类型                                                         | 默认值    | 说明                           |
| ---------- | ------------------------------------------------------------ | --------- | ------------------------------ |
| `variant`  | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'` | 按钮变体                       |
| `disabled` | `boolean`                                                    | `false`   | 禁用状态                       |
| `loading`  | `boolean`                                                    | `false`   | 加载旋转动画                   |
| `full`     | `boolean`                                                    | `false`   | 全宽                           |
| `icon`     | `boolean`                                                    | `false`   | 纯图标模式                     |
| `size`     | `string`                                                     | `''`      | 尺寸格式 `高度` 或 `高度x宽度` |

**事件：** 标准 `click`

**插槽：** `prefix`, `default`, `suffix`

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

| 属性               | 类型      | 默认值  | 说明               |
| ------------------ | --------- | ------- | ------------------ |
| `open`             | `boolean` | `false` | 对话框可见性       |
| `lock-scroll`      | `boolean` | `true`  | 打开时锁定页面滚动 |
| `overlay-closable` | `boolean` | `true`  | 点击遮罩关闭对话框 |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `body`, `title`, `default`, `footer`

**方法：** `showModal()`, `close()`

使用原生 `<dialog>`，`@cancel` 阻止默认关闭行为（Escape 调用 `close()`）。点击遮罩关闭。

#### `<web-ui-drawer>`

侧边抽屉，使用原生 `<dialog>` 并自带关闭动画。

| 属性               | 类型                                     | 默认值    | 说明                             |
| ------------------ | ---------------------------------------- | --------- | -------------------------------- |
| `open`             | `boolean`                                | `false`   | 抽屉可见性                       |
| `placement`        | `'right' \| 'left' \| 'top' \| 'bottom'` | `'right'` | 滑入方向                         |
| `heading`          | `string`                                 | `''`      | 标题文字（无 header 插槽时显示） |
| `closable`         | `boolean`                                | `false`   | 显示关闭按钮                     |
| `lock-scroll`      | `boolean`                                | `true`    | 打开时锁定页面滚动               |
| `overlay-closable` | `boolean`                                | `true`    | 点击遮罩关闭抽屉                 |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `header`, `default`, `footer`

**方法：** `show()`, `close()`

关闭时保留原生 dialog 的 top layer，待 `--wui-duration-drawer` 过渡完成（默认 280ms）后调用 `dialog.close()`。Escape 始终走此关闭路径；`overlay-closable` 仅控制遮罩点击。

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

| 属性          | 类型      | 默认值  | 说明         |
| ------------- | --------- | ------- | ------------ |
| `disabled`    | `boolean` | `false` | 禁用状态     |
| `lock-scroll` | `boolean` | `true`  | 阻止背景滚动 |

**事件：** `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `default`（菜单项内容）

**方法：** `openAt(x: number, y: number)`, `close()`

通过 `contextmenu` 事件打开。菜单项：`web-ui-dropdown-item`、`web-ui-dropdown-divider`、`web-ui-dropdown-header`。支持键盘导航和子菜单 hover。

---

### 菜单

#### `<web-ui-dropdown>`

下拉菜单，支持多级子菜单。

| 属性          | 类型        | 默认值           | 说明             |
| ------------- | ----------- | ---------------- | ---------------- |
| `open`        | `boolean`   | `false`          | 菜单可见性       |
| `disabled`    | `boolean`   | `false`          | 禁用状态         |
| `placement`   | `Placement` | `'bottom-start'` | Floating UI 位置 |
| `offset`      | `number`    | `4`              | 与触发器距离     |
| `match-width` | `boolean`   | `false`          | 匹配触发器宽度   |
| `lock-scroll` | `boolean`   | `true`           | 锁定页面滚动     |

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

| 属性        | 类型                                                           | 默认值        | 说明                   |
| ----------- | -------------------------------------------------------------- | ------------- | ---------------------- |
| `count`     | `number`                                                       | `0`           | 显示数字               |
| `max`       | `number`                                                       | `99`          | 最大值（超过显示 99+） |
| `dot`       | `boolean`                                                      | `false`       | 点模式（不显示数字）   |
| `show-zero` | `boolean`                                                      | `false`       | count 为 0 时也显示    |
| `hidden`    | `boolean`                                                      | `false`       | 完全隐藏               |
| `offset-x`  | `number`                                                       | `0`           | 水平偏移               |
| `offset-y`  | `number`                                                       | `0`           | 垂直偏移               |
| `placement` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` | 徽标位置               |

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

页面布局网格。

| 插槽      | 说明       |
| --------- | ---------- |
| `header`  | 顶部横幅   |
| `default` | 主内容区   |
| `sidebar` | 侧边栏     |
| `tabbar`  | 底部标签栏 |

#### `<web-ui-back-top>`

回到顶部按钮。

| 属性           | 类型                    | 默认值   | 说明               |
| -------------- | ----------------------- | -------- | ------------------ |
| `smooth`       | `boolean`               | `true`   | 平滑滚动           |
| `threshold`    | `number`                | `200`    | 显示按钮的滚动阈值 |
| `visible`      | `boolean`               | `false`  | 当前可见状态       |
| `scrollTarget` | `HTMLElement \| Window` | `window` | 滚动容器           |

**插槽：** `default`（自定义按钮内容）

**方法：** `toTop()`

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

定义 `--wui-color-*`、`--wui-shadow-*`、`--wui-layer-*` 与 motion token。motion token 是稳定的主题契约，可在主题范围覆盖：`--wui-duration-press`、`--wui-duration-fast`、`--wui-duration-overlay-enter`、`--wui-duration-overlay-exit`、`--wui-duration-drawer`、`--wui-ease-out`、`--wui-ease-standard`、`--wui-scale-press`、`--wui-scale-enter`。`motion="system"` 跟随 `prefers-reduced-motion`；使用 `motion="reduced"` 降低当前作用域动效，或在嵌套主题中使用 `motion="full"` 恢复默认 token。System 配色模式跟随 `prefers-color-scheme`。

---

### 通知

#### `<web-ui-toast>`

单个 Toast 通知。通过命令式 API 使用。

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

| 属性       | 类型      | 默认值  | 说明     |
| ---------- | --------- | ------- | -------- |
| `value`    | `string`  | `''`    | 分段值   |
| `checked`  | `boolean` | `false` | 当前选中 |
| `disabled` | `boolean` | `false` | 禁用状态 |

**事件：** `change`

非表单关联组件（父级 segmented 统一提交）。
