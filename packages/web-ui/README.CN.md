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

## API 参考

---

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

多行文本输入框。

| 属性          | 类型      | 默认值  | 说明         |
| ------------- | --------- | ------- | ------------ |
| `value`       | `string`  | `''`    | 输入值       |
| `placeholder` | `string`  | `''`    | 占位文本     |
| `rows`        | `number`  | `3`     | 显示行数     |
| `name`        | `string`  | `''`    | 表单字段名   |
| `disabled`    | `boolean` | `false` | 禁用状态     |
| `required`    | `boolean` | `false` | 必填校验     |
| `clearable`   | `boolean` | `false` | 显示清除按钮 |

**事件：** `input`, `change`, `focus`, `blur`

#### `<web-ui-input-number>`

数字输入框，支持步进按钮和键盘操作。

| 属性          | 类型      | 默认值      | 说明       |
| ------------- | --------- | ----------- | ---------- |
| `value`       | `number`  | `0`         | 当前值     |
| `min`         | `number`  | `-Infinity` | 最小值     |
| `max`         | `number`  | `Infinity`  | 最大值     |
| `step`        | `number`  | `1`         | 步进值     |
| `precision`   | `number`  | auto        | 小数精度   |
| `placeholder` | `string`  | `''`        | 占位文本   |
| `name`        | `string`  | `''`        | 表单字段名 |
| `disabled`    | `boolean` | `false`     | 禁用状态   |
| `required`    | `boolean` | `false`     | 必填校验   |

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
| `full`             | `boolean`                          | `false` | 全宽触发器           |
| `portal`           | `boolean`                          | `false` | 在主题浮层容器中渲染 |
| `lock-scroll`      | `boolean`                          | `true`  | 打开时锁定页面滚动   |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —       | 显式 Portal 容器     |

**事件：** `input`, `change`, `open-change` (`CustomEvent<{ open: boolean }>`)

**插槽：** `default`（投影 `<web-ui-option>` 元素）

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

| 属性       | 类型      | 默认值  | 说明                        |
| ---------- | --------- | ------- | --------------------------- |
| `checked`  | `boolean` | `false` | 打开/关闭状态               |
| `value`    | `string`  | `''`    | 表单提交值（默认为 `'on'`） |
| `name`     | `string`  | `''`    | 表单字段名                  |
| `disabled` | `boolean` | `false` | 禁用状态                    |
| `required` | `boolean` | `false` | 必填校验                    |
| `loading`  | `boolean` | `false` | 加载状态                    |

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

关闭时触发 300ms CSS 动画后调用 `dialog.close()`。

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

通过 `pointerenter`/`pointerleave` 和 `focusin`/`focusout` 触发。

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

#### `<web-ui-dropdown-menu>`

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

**插槽：** `default`

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

| 属性    | 类型                   | 默认值     | 说明           |
| ------- | ---------------------- | ---------- | -------------- |
| `src`   | `string`               | `''`       | 图片 URL       |
| `alt`   | `string`               | `''`       | 替代文本       |
| `size`  | `number`               | `40`       | 头像尺寸（px） |
| `shape` | `'circle' \| 'square'` | `'circle'` | 形状           |

**插槽：** `default`（图片加载失败的降级内容）

#### `<web-ui-badge>`

徽标 / 通知计数。

| 属性        | 类型      | 默认值  | 说明                   |
| ----------- | --------- | ------- | ---------------------- |
| `count`     | `number`  | `0`     | 显示数字               |
| `max`       | `number`  | `99`    | 最大值（超过显示 99+） |
| `dot`       | `boolean` | `false` | 点模式（不显示数字）   |
| `show-zero` | `boolean` | `false` | count 为 0 时也显示    |
| `hidden`    | `boolean` | `false` | 完全隐藏               |

#### `<web-ui-empty>`

空状态占位。

| 属性   | 类型                              | 默认值      | 说明 |
| ------ | --------------------------------- | ----------- | ---- |
| `size` | `'small' \| 'default' \| 'large'` | `'default'` | 尺寸 |

**插槽：** `default`, `description`, `image`, `action`

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

| 属性    | 类型     | 默认值 | 说明       |
| ------- | -------- | ------ | ---------- |
| `size`  | `number` | `24`   | 尺寸（px） |
| `color` | `string` | —      | 颜色       |

角色：`status`，`aria-label="加载中"`。

**静态 API：** `spinner.show(config)`, `spinner.hide()`

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

SVG 线条绘制动画，基于 `stroke-dashoffset`。

| 属性       | 类型     | 默认值     | 说明             |
| ---------- | -------- | ---------- | ---------------- |
| `duration` | `number` | `1000`     | 动画时长（毫秒） |
| `easing`   | `string` | `'linear'` | CSS 缓动函数     |

**插槽：** `default`（单个内联 `<svg>` 元素）

动画化 `path`、`rect`、`circle`、`line`、`polyline`、`polygon`、`ellipse` 元素。克隆 `<svg>` 后分别应用线条动画。

#### `<web-ui-theme>`

主题提供者，定义 CSS 自定义属性 token。

| 属性         | 类型                            | 默认值    | 说明     |
| ------------ | ------------------------------- | --------- | -------- |
| `appearance` | `'light' \| 'dark' \| 'system'` | `'light'` | 配色方案 |

**方法：** `getOverlayRoot()` — 返回 Portal 浮层容器

定义 `--wui-color-*`、`--wui-shadow-*`、`--wui-layer-*` token。可嵌套实现作用域主题。System 模式跟随 `prefers-color-scheme`。

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
```

**ToastOptions：**

| 选项       | 类型                                          | 默认值                    | 说明                         |
| ---------- | --------------------------------------------- | ------------------------- | ---------------------------- |
| `message`  | `string`                                      | —                         | 通知文本                     |
| `type`     | `'success' \| 'info' \| 'warning' \| 'error'` | `'info'`                  | 类型                         |
| `duration` | `number`                                      | `3000`（error 为 `5000`） | 自动关闭时间（0=不自动关闭） |
| `closable` | `boolean`                                     | `true`                    | 显示关闭按钮                 |
| `id`       | `string`                                      | auto                      | 去重标识符                   |
| `heading`  | `string`                                      | `''`                      | 粗体标题                     |
| `position` | 6 种位置                                      | `'top-right'`             | 屏幕位置                     |
| `target`   | `Element`                                     | —                         | 用于查找最近主题作用域       |

**事件：** `toast-close` (`CustomEvent<{ id: string; reason: 'auto' | 'manual' | 'programmatic' | 'clear' }>`)

悬停暂停自动关闭计时器（使用 `pointerenter`/`pointerleave`）。同一微任务中批量挂载 Toast。

---

### 子项

#### `<web-ui-option>`

`<web-ui-select>` 的选择选项。

| 属性       | 类型      | 默认值  | 说明         |
| ---------- | --------- | ------- | ------------ |
| `value`    | `string`  | `''`    | 选中值       |
| `selected` | `boolean` | `false` | 当前是否选中 |
| `disabled` | `boolean` | `false` | 禁用状态     |

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

---

## 所有组件

| 标签                       | 分类        |
| -------------------------- | ----------- |
| `web-ui-input`             | 表单控件    |
| `web-ui-textarea`          | 表单控件    |
| `web-ui-input-number`      | 表单控件    |
| `web-ui-select`            | 表单控件    |
| `web-ui-slider`            | 表单控件    |
| `web-ui-checkbox`          | 表单控件    |
| `web-ui-radio`             | 表单控件    |
| `web-ui-switch`            | 表单控件    |
| `web-ui-segmented`         | 表单控件    |
| `web-ui-checkbox-group`    | 表单控件    |
| `web-ui-radio-group`       | 表单控件    |
| `web-ui-button`            | 按钮        |
| `web-ui-button-group`      | 按钮        |
| `web-ui-dialog`            | 浮层 / 模态 |
| `web-ui-drawer`            | 浮层 / 模态 |
| `web-ui-popover`           | 浮动        |
| `web-ui-tooltip`           | 浮动        |
| `web-ui-context-menu`      | 浮动        |
| `web-ui-dropdown-menu`     | 菜单        |
| `web-ui-dropdown-item`     | 菜单        |
| `web-ui-dropdown-divider`  | 菜单        |
| `web-ui-dropdown-header`   | 菜单        |
| `web-ui-avatar`            | 数据展示    |
| `web-ui-badge`             | 数据展示    |
| `web-ui-empty`             | 数据展示    |
| `web-ui-icon`              | 数据展示    |
| `web-ui-spinner`           | 数据展示    |
| `web-ui-layout`            | 布局与工具  |
| `web-ui-back-top`          | 布局与工具  |
| `web-ui-svg-draw-lines`    | 布局与工具  |
| `web-ui-theme`             | 布局与工具  |
| `web-ui-toast`             | 通知        |
| `web-ui-option`            | 子项        |
| `web-ui-segmented-trigger` | 子项        |
