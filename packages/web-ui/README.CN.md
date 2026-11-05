# @greypan/web-ui

> 可用于 React、Vue 与普通 HTML 的 Web Components。

[English](./README.md) | 简体中文

## 演示

- [Vue 演示](https://pan-z2l0ahvi.github.io/mono/vue-web-ui-demo/)
- [React 演示](https://pan-z2l0ahvi.github.io/mono/react-web-ui-demo/)

## 安装

```bash
npm install @greypan/web-ui
```

`lit` 是必需的 peer dependency。

React 与 Vue 的类型适配是可选的，分别要求：

- **React 19** 与 `@types/react >= 19`。React 19 会把 custom element 的 props 写成 DOM property，并通过 JSX 的 `on` 键绑定自定义事件。React 18 及更早版本只会写 attribute，对象、数组属性和自定义事件需要手动 `ref` 加 `addEventListener`。
- **Vue 3.5 或更高版本**。Vue 3.5 在 `DefineComponent` 上保留 custom element 宿主类型，模板 ref、`$el`、命名 handler 和事件载荷都能直接解析到具体组件，无需 cast。更早版本会丢失宿主类型，适配层能力随之下降。

版本要求来自 props 与事件。slot 不依赖框架版本：它是原生 Shadow DOM slot，在 React、Vue 和普通 HTML 中行为一致。

更早的框架版本仍可把组件当作普通 custom element 使用：写 attribute，并用 `addEventListener` 监听事件，只是没有类型适配。

每个适配器只需要在 `env.d.ts` 中全局引入一次类型。下方 React 与 Vue 章节给出具体引用方式和可导入的工具类型。

## 快速开始

```js
import '@greypan/web-ui'
// 或者只导入一个组件：
// import '@greypan/web-ui/components/button'
```

子路径导入只注册它点名的组件。页面用到的每个标签都要导入。

```html
<web-ui-button variant="primary">点击我</web-ui-button> <web-ui-input placeholder="姓名"></web-ui-input>
```

## CSS class

`@greypan/web-ui/classes.css` 提供两个可复用 class，组件内部使用同一份样式。

```js
import '@greypan/web-ui/classes.css'
```

### `.wui-glass`

给任意容器加 `.wui-glass` 即可获得毛玻璃表面。

```html
<div class="wui-glass">...</div>
```

- 它提供半透明底色、`backdrop-filter` 的模糊、饱和与亮度、内高光与投影，以及用 `::before` 画出的 1px 描边环。
- 容器需要有确定的尺寸和可被采样的背景。宿主没有其他 position 时，class 会补 `position: relative`，移除宿主边框，并跟随宿主的 `border-radius`。
- 非 pill 表面应把 `--wui-glass-corner-radius` 设为与元素圆角一致的值。

| Token                          | 默认值                    | 说明                                               |
| ------------------------------ | ------------------------- | -------------------------------------------------- |
| `--wui-color-surface-glass`    | `rgb(250 250 250 / 0.34)` | 半透明底色。深色主题为 `rgb(44 44 46 / 0.42)`。    |
| `--wui-glass-blur`             | `4px`                     | 背景模糊半径。设 `0px` 关闭。                      |
| `--wui-glass-saturation`       | `160%`                    | 背景饱和度。                                       |
| `--wui-glass-brightness`       | `1.06`                    | 背景亮度。深色主题为 `1.02`。                      |
| `--wui-color-glass-highlight`  | `rgb(255 255 255 / 0.9)`  | 内高光。深色主题为 `rgb(255 255 255 / 0.1)`。      |
| `--wui-glass-corner-radius`    | `32px`                    | 描边环光影的半径。                                 |
| `--wui-color-glass-ring`       | `rgb(0 0 0 / 0.05)`       | 描边环底色。深色主题为 `rgb(255 255 255 / 0.05)`。 |
| `--wui-color-glass-ring-sheen` | `rgb(255 255 255 / 0.5)`  | 受光角光泽。深色主题为 `rgb(255 255 255 / 0.2)`。  |
| `--wui-color-glass-ring-shade` | `rgb(0 0 0 / 0.03)`       | 背光角阴影。深色主题为 `rgb(0 0 0 / 0.5)`。        |
| `--wui-shadow-glass`           | 四层扩散阴影              | 元素投影。未设置时使用 class 默认值。              |

### `.wui-glow`

给任意容器加 `.wui-glow` 即可获得装饰性背景光晕。

```html
<div class="wui-glow">...</div>
```

- 渐变和模糊都是背景层，内容位于它们上方。
- 容器需要有确定的尺寸。宿主没有其他 position 时，class 会补 `position: relative`，并加 `isolation: isolate`。
- 默认从顶部绘制 `--wui-color-page` 渐变，并叠加 `blur(4px)`。模糊层向下延伸 24px 后淡出。祖先的 `overflow: hidden` 会裁掉这段。
- 宿主背景不透明时，模糊无法采样宿主背后的内容。想要毛玻璃效果，宿主表面应保持半透明。

| Token                           | 默认值                        | 说明                                      |
| ------------------------------- | ----------------------------- | ----------------------------------------- |
| `--wui-glow-color`              | `var(--wui-color-page, #fff)` | 渐变起点色。                              |
| `--wui-glow-gradient-direction` | `to bottom`                   | `linear-gradient` 方向。                  |
| `--wui-glow-gradient`           | 由起点色和方向生成            | 完整背景图。设 `none` 关闭。              |
| `--wui-glow-blur`               | `4px`                         | 背景模糊半径。设 `0px` 关闭。             |
| `--wui-glow-overhang`           | `24px`                        | 模糊层向容器下方延伸的高度。              |
| `--wui-glow-fade`               | `36px`                        | 从全强度到透明的长度，不应小于 overhang。 |

## Vite

`@greypan/web-ui/vite` 导出 `webUiOptimizeDeps`，这是需要合并到 `optimizeDeps.include` 的运行时依赖列表。

```js
import { webUiOptimizeDeps } from '@greypan/web-ui/vite'

export default {
  optimizeDeps: {
    include: [...webUiOptimizeDeps]
  }
}
```

当 Vite 的依赖扫描器无法跟随组件图时需要这份列表，例如路由或页面通过虚拟模块加载，如 file-based routing 或 `import.meta.glob`。入口静态导入了所有组件模块的应用不需要它。

- 条目使用 Vite 的 `<pkg> > <dep>` 解析形式，按 web-ui 的依赖树解析。
- 引用这个导出，不要复制条目。
- 它只影响开发期的依赖预打包，不影响构建。
- 修改带这份列表的配置后，删除一次 `node_modules/.vite` 再重启。

## 框架接入

### props、attribute、event 与 slot 的对应关系

每个 `web-ui-*` 元素都暴露同样的四个面。

| 表面      | 命名                     | 用途                                                                |
| --------- | ------------------------ | ------------------------------------------------------------------- |
| Property  | camelCase                | 对象、数组、布尔值、数字，以及运行时读写值。                        |
| Attribute | kebab-case               | 普通 HTML 中的声明式字符串值。                                      |
| Event     | kebab-case               | 用户操作，例如 `open-change`，以及原生 `click`、`input`、`change`。 |
| Slot      | 子元素上的 `slot="name"` | 把自有节点投影到默认或命名区域。                                    |

原生事件是 composed 的，可以到达框架 handler。自定义事件在宿主元素上派发。程序化赋值不会触发自定义事件。

Slot 是原生 Shadow DOM slot。你的节点留在 light DOM，由组件投影：

- 普通子元素进入默认 slot。
- 命名 slot 在子元素上写 `slot="name"`。
- Vue 的 `v-slot` 或 React 的 render props 等框架 slot 语法不适用于 custom element。

```html
<web-ui-layout>
  <div slot="header">Header</div>
  <nav slot="sidebar">Sidebar</nav>
  <main>Main content</main>
</web-ui-layout>
```

### React

#### 接入

**1. 安装运行时与工具**

安装 React 19、`@types/react >= 19` 和 `@greypan/unplugin-web-components`。

**2. 启用组件自动导入**

在 `vite.config.ts` 中：

```ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import react from '@vitejs/plugin-react'

export default {
  plugins: [unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true }), react()]
}
```

把 `unpluginWebComponents` 放在 `react()` 之前，让标签检测看到原始源码。不使用插件时，手动导入用到的组件。

**3. 全局引入类型**

在 `env.d.ts` 中引入一次：

```ts
/// <reference types="@greypan/web-ui/types/react" />
```

确认 `env.d.ts` 在 TypeScript 配置的 `include` 中：`tsconfig.app.json`，或 `tsconfig.json` 中对应的条目。这个引用会全局增强 JSX intrinsic elements，所有文件都能获得 `web-ui-*` 标签、props、事件和 ref 类型，不需要逐个文件导入。

#### props 与事件

布尔值和非字符串值使用 camelCase property 名称。React 19 会把它们写成 DOM property。普通字符串可以继续用 attribute。

```tsx
import '@greypan/web-ui'

import { useState } from 'react'

function App() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button variant="primary" onClick={() => alert('点击')}>
        button
      </web-ui-button>
      <web-ui-input onInput={event => console.log(event.currentTarget.value)} />
      <web-ui-dialog open={open} noScrollLock onopen-change={event => setOpen(event.detail.open)} />
    </>
  )
}
```

- 自定义事件按 `on<event>` 原样书写，保留连字符：写 `onopen-change`，不是 `onOpenChange`。
- 原生事件使用 React 名称：`onInput`、`onChange`、`onFocus`、`onBlur`。
- 原生事件和自定义事件的 `currentTarget` 都是组件实例类型。
- 不要写 `disabled="false"` 或 `open="false"`。attribute 存在就表示 `true`，应直接传布尔值。

#### slot

默认 slot 用普通子元素，命名 slot 用 `slot` attribute。

```tsx
<web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
  <button type="button">Show details</button>
  <div slot="content">Details</div>
</web-ui-collapse>
```

#### TypeScript 工具类型

全局引用已经提供标签、props、事件和 ref 类型。需要在代码里显式命名这些类型时，使用包导出的工具类型。

```tsx
import type { WebUiDialog, WebUiEvent, WebUiEventName } from '@greypan/web-ui'
import { useRef } from 'react'

function onDialogOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  const open: boolean = event.detail.open
  const host: WebUiDialog = event.currentTarget
}

const dialogRef = useRef<WebUiDialog>(null)
const eventName: WebUiEventName<WebUiDialog> = 'open-change'
```

- `WebUiEvent<Component, EventName>` 用于命名 handler。事件名必须是该组件声明过的事件。
- `WebUiEventName<Component>` 是该组件自定义事件名的联合类型，适合变量、映射表和泛型辅助函数。
- `WebUiDialog` 等组件类既是运行时元素类，也是 `useRef` 的元素实例类型。
- React 中 `event.currentTarget` 是组件实例；`event.target` 遵循 `SyntheticEvent` 语义，仍是 `EventTarget`。
- 需要自己封装 React 组件时，`LitReactWrapper<Component>` 提供 props 类型。从 `@greypan/web-ui/types/react` 导入。

```ts
import type { WebUiDialog } from '@greypan/web-ui'
import type { LitReactWrapper } from '@greypan/web-ui/types/react'

type DialogProps = LitReactWrapper<WebUiDialog>
```

#### portal 内容

组件把子元素移动到 portal shadow root 后，React 的合成 `onClick` 收不到该子元素的事件。请通过 `ref` 绑定原生监听器。

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

`portal` 模式下，panel 内容会被移动到 overlay shadow root：

- 裸条件子元素（例如 `{condition && <el/>}`）的节点已经移动时，panel 打开期间无法删除它。
- 把条件内容放进稳定的包装元素。React 会把包装元素记录为插入父节点，增删可以继续工作。
- 保持内容挂载并切换可见性也是可用方案。

```tsx
<web-ui-popover portal open={open} trigger="manual">
  <div className="panel-body">{editing && <TagEditor />}</div>
</web-ui-popover>
```

### Vue

#### 接入

**1. 安装运行时与工具**

安装 Vue 3.5 或更高版本、`@greypan/unplugin-web-components` 和 `@vitejs/plugin-vue`。

**2. 启用 custom element 与组件自动导入**

在 `vite.config.ts` 中：

```ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [
    vue({
      template: { compilerOptions: { isCustomElement: tag => tag.startsWith('web-ui-') } }
    }),
    unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true })
  ]
}
```

`isCustomElement` 让 Vue 不再把 `web-ui-*` 当作未知 Vue 组件。unplugin 在标签出现时导入对应组件。不使用插件时，手动导入用到的组件。

**3. 全局引入类型**

在 `env.d.ts` 中引入一次：

```ts
/// <reference types="@greypan/web-ui/types/vue" />
```

确认 `env.d.ts` 在 TypeScript 配置的 `include` 中：`tsconfig.app.json`，或 `tsconfig.json` 中对应的条目。这个引用会把所有 `web-ui-*` 标签注册进 `GlobalComponents`，模板和模板 ref 都能获得类型，不需要逐个文件导入。

#### props 与事件

用 camelCase 名称绑定 property。Vue 会把未知的 kebab-case 绑定写成 attribute，而字符串 `"false"` 是真值。

```vue
<template>
  <web-ui-button variant="primary" @click="handleClick">button</web-ui-button>
  <web-ui-input :value="value" @input="value = $event.target.value" />
  <web-ui-select :value="framework" @change="framework = $event.target.value" />
</template>
```

布尔 property 必须使用 camelCase 名称绑定。请写 `:sidebarCollapsed="false"` 或使用 `.prop` 修饰符，不要写 `:sidebar-collapsed="false"`。

```vue
<web-ui-layout
  header-glow
  sidebar-collapsible
  :sidebarCollapsed="sidebarCollapsed"
  :sidebarOpen="sidebarOpen"
  @sidebar-collapsed-change="sidebarCollapsed = $event.detail.collapsed"
  @sidebar-open-change="sidebarOpen = $event.detail.open"
/>
```

Vue 事件类型不需要 cast。带值组件上的 `@input` 和 `@change` 解析到组件 emit，`$event.target` 就是组件实例。`open-change` 等 kebab-case 事件的 `$event.detail` 保留 `CustomEvent` 载荷类型。`@click`、`@focus` 等原生事件仍可绑定到任意 `web-ui-*` 元素。命名 handler 的写法见下方 TypeScript 工具类型。

#### slot

在子元素上写 `slot` attribute。Vue 的 `v-slot` 语法面向 Vue 组件，不适用于 custom element。

```vue
<web-ui-layout>
  <div slot="header">Header</div>
  <nav slot="sidebar">Sidebar</nav>
  <main>Main content</main>
</web-ui-layout>
```

#### TypeScript 工具类型

全局引用已经把标签注册进 `GlobalComponents`，内联 `$event` 和模板 ref 都能直接获得类型，无需 cast。命名 handler 和可复用辅助函数使用包导出的工具类型。

```vue
<script setup lang="ts">
import type { WebUiDialog, WebUiEvent, WebUiEventName } from '@greypan/web-ui'
import { ref } from 'vue'

function onDialogOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  const open: boolean = event.detail.open
  const host: WebUiDialog = event.currentTarget
}

const dialogRef = ref<WebUiDialog>()
const eventName: WebUiEventName<WebUiDialog> = 'open-change'
</script>
```

- `WebUiEvent<Component, EventName>` 用于命名 handler，事件名必须是组件声明过的事件。
- `WebUiEventName<Component>` 是该组件自定义事件名的联合类型，适合变量、映射表和泛型辅助函数。
- `ref<WebUiDialog>()` 把模板 ref 标注为 custom element 实例。
- 内联 handler 如 `@input="value = $event.target.value"` 已经能直接推导，无需 cast。
- 需要自己封装 Vue 组件时，`LitVueWrapper<Component>` 提供 props 类型。从 `@greypan/web-ui/types/vue` 导入。

```ts
import type { WebUiDialog } from '@greypan/web-ui'
import type { LitVueWrapper } from '@greypan/web-ui/types/vue'

type DialogProps = LitVueWrapper<WebUiDialog>
```

#### portal 内容

panel 打开期间新增或删除的内容会自动迁入 panel，关闭时回到原锚点。panel 打开期间对 keyed `v-for` 列表做重排或中段 splice 不受支持。请在 panel 关闭后更新，或只在列表尾部追加和删除。

### Lit

Portal panel 支持 Lit child part 的实时渲染。`web-ui-popover`、`web-ui-tooltip`、`web-ui-select`、`web-ui-autocomplete` 中的条件内容会移入打开的 panel。panel 打开期间删除和替换元素可用，关闭时内容回到原锚点。

panel 打开期间对 `repeat()` 列表重排不受支持。请在 panel 关闭后重排。

`web-ui-dropdown` 通过共享菜单 portal 管理条目。panel 打开期间新增条目可用。已经位于 panel 中的条目不支持删除和替换。`web-ui-context-menu` 不监听宿主侧插入，不在这些保证范围内。

### 属性与事件边界

`web-ui-*` 元素是公开 DOM 边界。`id`、`class`、`style`、全局 HTML attribute 和 `data-*` 留在自定义元素宿主上，不会复制到 shadow root。只有组件文档定义了映射时，才会暴露原生属性。例如 `web-ui-button` 把 `type` 映射到内部 button，只接受 `button`、`submit` 或 `reset`。

ARIA attribute 需要显式支持。使用组件文档中的 attribute，不要通配 `aria-*`。组件自己管理 role 和交互状态。`click`、`input`、`change` 等原生 composed 事件是主要交互 API。`open-change` 等 kebab-case 自定义事件只描述用户操作，程序化赋值不会触发。

### 光标行为

交互控件使用箭头光标。禁用控件使用 `not-allowed`。Slider、Switch 和 Segmented 只在拖拽时切换为 `grabbing`。光标样式位于 shadow root 内，文档级选择器无法覆盖。

### 状态模型

组件使用三种状态模型。不要假设 `controlled` 在每个组件上含义相同。

- 开合类组件（collapse、popover、dropdown、tooltip、dialog、drawer、back-top）只在用户操作时发出 `*-change`。程序化赋值和命令式方法不会发出事件。除非外部协调，组件自己管理 `open`。
- Dialog 和 drawer 支持 `controlled`。用户关闭操作只请求 `open=false`，组件保持打开，直到你写入 `open=false`。
- 表单控件（input、textarea、input-number、select、checkbox、radio、switch、autocomplete）自己管理 value 或 checked。用户交互会立即翻转并派发原生 `input` 或 `change`。程序化写入会覆盖内部状态。因为值始终可读可写，所以没有 `controlled` prop。

如果 switch 或 checkbox 必须等服务端成功后才保持开启，请使用乐观更新。立即翻转，监听 `change`，请求期间设置 `loading`，失败时把 property 写回。

### 表单控件

表单控件参与原生 `FormData`、约束校验、`form.reset()` 和浏览器表单状态恢复。重置默认值在首次连接并应用声明式 attribute 后捕获一次。后续 property 更新不会改变它。禁用的祖先 `fieldset` 会禁用交互和校验，但不会修改控件公开的 `disabled` property。checkbox 和 radio group 由 group 统一负责提交、重置和恢复。

`web-ui-button` 也是 form-associated，让宿主可以持有外层 form 并转发 `submit` 和 `reset`。它不向 `FormData` 贡献值。

## 组件

每个组件都有文档页，包含 API 参考、行为说明和交互示例。下表是索引。

| 分类           | 组件                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 表单控件       | [`<web-ui-input>`](./docs/input.CN.md)、[`<web-ui-textarea>`](./docs/textarea.CN.md)、[`<web-ui-editable-text>`](./docs/editable-text.CN.md)、[`<web-ui-input-number>`](./docs/input-number.CN.md)、[`<web-ui-select>`](./docs/select.CN.md)、[`<web-ui-autocomplete>`](./docs/autocomplete.CN.md)、[`<web-ui-slider>`](./docs/slider.CN.md)、[`<web-ui-checkbox>`](./docs/checkbox.CN.md)、[`<web-ui-radio>`](./docs/radio.CN.md)、[`<web-ui-switch>`](./docs/switch.CN.md)、[`<web-ui-segmented>`](./docs/segmented.CN.md)、[`<web-ui-checkbox-group>`](./docs/checkbox-group.CN.md)、[`<web-ui-radio-group>`](./docs/radio-group.CN.md) |
| 按钮           | [`<web-ui-button>`](./docs/button.CN.md)、[`<web-ui-button-group>`](./docs/button-group.CN.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Overlay 与模态 | [`<web-ui-dialog>`](./docs/dialog.CN.md)、[`<web-ui-drawer>`](./docs/drawer.CN.md)、[`imagePreview()`](./docs/image-preview.CN.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 文档流展开     | [`<web-ui-collapse>`](./docs/collapse.CN.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 浮动层         | [`<web-ui-popover>`](./docs/popover.CN.md)、[`<web-ui-tooltip>`](./docs/tooltip.CN.md)、[`<web-ui-context-menu>`](./docs/context-menu.CN.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 菜单           | [`<web-ui-dropdown>`](./docs/dropdown.CN.md)、[`<web-ui-dropdown-item>`](./docs/dropdown-item.CN.md)、[`<web-ui-dropdown-divider>`](./docs/dropdown-divider.CN.md)、[`<web-ui-dropdown-header>`](./docs/dropdown-header.CN.md)                                                                                                                                                                                                                                                                                                                                                                                                             |
| 数据展示       | [`<web-ui-avatar>`](./docs/avatar.CN.md)、[`<web-ui-badge>`](./docs/badge.CN.md)、[`<web-ui-empty>`](./docs/empty.CN.md)、[`<web-ui-grouped-text>`](./docs/grouped-text.CN.md)、[`<web-ui-middle-ellipsis>`](./docs/middle-ellipsis.CN.md)、[`<web-ui-icon>`](./docs/icon.CN.md)、[`<web-ui-progress>`](./docs/progress.CN.md)、[`<web-ui-spinner>`](./docs/spinner.CN.md)                                                                                                                                                                                                                                                                 |
| 布局与工具     | [`<web-ui-layout>`](./docs/layout.CN.md)、[`<web-ui-back-top>`](./docs/back-top.CN.md)、[`<web-ui-svg-draw-lines>`](./docs/svg-draw-lines.CN.md)、[`<web-ui-theme>`](./docs/theme.CN.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 通知           | [`<web-ui-toast>`](./docs/toast.CN.md)、[`shake()`](./docs/shake.CN.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 子项           | [`<web-ui-option>`](./docs/option.CN.md)、[`<web-ui-segmented-trigger>`](./docs/segmented-trigger.CN.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
