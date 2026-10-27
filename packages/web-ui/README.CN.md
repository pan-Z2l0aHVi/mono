# @greypan/web-ui

> 基于 Lit 的 Web Components，支持 React、Vue 和原生 HTML

[English](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/README.md) | 简体中文

## 演示

[查看组件在 vue 中使用](https://pan-z2l0ahvi.github.io/mono/vue-web-ui-demo/)

[查看组件在 react 中使用](https://pan-z2l0ahvi.github.io/mono/react-web-ui-demo/)

## 安装

```bash
npm install @greypan/web-ui
```

`lit` 是必需的 peer dependency；`vue >= 3.5` 与 `@types/react >= 19` 是可选 peer，仅用于各自的
框架类型适配。

## 快速开始

```js
import '@greypan/web-ui'
// import '@greypan/web-ui/components/button'
```

subpath 导入只注册它点名的那个组件，页面用到的每个 tag 都要单独导入。

```html
<web-ui-button variant="primary">点击我</web-ui-button> <web-ui-icon .icon="${lucidePlus}"></web-ui-icon>
```

## Icons

`@greypan/web-ui/icons` 导出组件所用图标的 [Iconify](https://iconify.design/) 数据对象，消费方不需要
额外的图标包或网络请求。命名是 camelCase 的 `<set><Name>`：`lucideSearch` 对应 `lucide:search`。

```js
import { lucideSearch } from '@greypan/web-ui/icons'
```

```html
<web-ui-icon .icon="${lucideSearch}"></web-ui-icon>
```

`web-ui-icon` 通过 `icon` property（不是 attribute）接收 Iconify 对象，任何 Iconify 数据对象都可用，
包括内置的或自己的。内置列表由 `icons.used.json` 生成；新增条目后运行
`pnpm --filter @greypan/web-ui generate-icons` 即可扩展。

## scrollbar

滚动条使用原生 CSS。`web-ui-theme` 把 thumb 颜色暴露为 `--wui-scrollbar-handle`；自带滚动容器的组件
（`select`、`autocomplete`、dropdown / context-menu panel、`dialog`、`drawer`、`toast`）在各自的
shadow root 内通过 `scrollbar-color` 与 `scrollbar-width` 读取它。不需要 scrollbar 库，也不需要额外
导入样式表。

要让文档级滚动条也使用同一主题，在 `html` 上读同一个 token——最外层主题会把它镜像到 `documentElement`：

```css
html {
  scrollbar-color: var(--wui-scrollbar-handle) transparent;
  scrollbar-width: thin;
}
```

- `scrollbar-color` 与 `scrollbar-width` 都是继承属性，这一条规则也会作用到组件 shadow root 内的
  滚动容器。
- 原生 scrollbar 没有 hover / active 状态，token 只控制静止态的 thumb 颜色。
- 刻意不用 `::-webkit-scrollbar`：声明它会让引擎放弃平台的覆盖式 scrollbar、固定占一条布局宽度，
  而这些 scrollbar 不能占宽度。

## Classes

`@greypan/web-ui/classes.css` 汇总可复用的公共 class，组件内部与消费方共用同一份源码：
`.wui-glass`（毛玻璃表面）与 `.wui-glow`（装饰性背景晕染）。

```js
import '@greypan/web-ui/classes.css'
```

### .wui-glass

给任意容器加 `.wui-glass` 即可获得毛玻璃表面；组件内部（drawer body、dialog / toast、tooltip /
popover、input 等）用的也是同一份样式。

```html
<div class="wui-glass">...</div>
```

- 同时提供半透明底色、`backdrop-filter`（模糊 / 饱和 / 亮度）、元素自身的 inset 高光与投影，
  以及用 `::before` 挖出的 1px 描边环：环的左上 / 右下受光、右上 / 左下背光，半径由
  `--wui-glass-corner-radius` 控制。
- 容器需要有确定的盒子尺寸和可被采样的背景。`.wui-glass` 只在宿主没有其他 `position` 时补
  `position: relative`，并移除自身 border（描边由环承担）；圆角仍跟随宿主的 `border-radius`。
- 非 pill 表面应把 `--wui-glass-corner-radius` 覆盖成与自身圆角同源的值，否则角部光影半径与
  盒形不匹配。颜色 token 由主题给出浅 / 深两套默认值，优先覆盖 token 而不是重写 `backdrop-filter`。

| token                          | 默认值                    | 说明                                                 |
| ------------------------------ | ------------------------- | ---------------------------------------------------- |
| `--wui-color-surface-glass`    | `rgb(250 250 250 / 0.34)` | 半透明底色；深色主题为 `rgb(44 44 46 / 0.42)`        |
| `--wui-glass-blur`             | `4px`                     | `backdrop-filter` 模糊半径；设 `0px` 关闭            |
| `--wui-glass-saturation`       | `160%`                    | 背景饱和度                                           |
| `--wui-glass-brightness`       | `1.06`                    | 背景亮度；深色主题为 `1.02`                          |
| `--wui-color-glass-highlight`  | `rgb(255 255 255 / 0.9)`  | 元素 inset 高光；深色主题为 `rgb(255 255 255 / 0.1)` |
| `--wui-glass-corner-radius`    | `32px`                    | 描边环径向光影的半径                                 |
| `--wui-color-glass-ring`       | `rgb(0 0 0 / 0.05)`       | 1px 环底色；深色主题为 `rgb(255 255 255 / 0.05)`     |
| `--wui-color-glass-ring-sheen` | `rgb(255 255 255 / 0.5)`  | 受光角光泽；深色主题为 `rgb(255 255 255 / 0.2)`      |
| `--wui-color-glass-ring-shade` | `rgb(0 0 0 / 0.03)`       | 背光角压暗；深色主题为 `rgb(0 0 0 / 0.5)`            |
| `--wui-shadow-glass`           | 四层扩散阴影              | 元素投影；未设置时使用类内默认值                     |

### .wui-glow

给任意容器加 `.wui-glow` 即可，不需要额外组件或 DOM；`web-ui-layout` 的 `header-glow` 与
collapse 的 peek 边缘用的也是同一份样式。

```html
<div class="wui-glow">...</div>
```

- 渐变与模糊都是容器的背景层，内容始终位于其上方。容器需要有确定的盒子尺寸；`.wui-glow` 只在
  宿主没有其他 `position` 时补 `position: relative`，并加 `isolation: isolate`。
- 默认从容器顶部向下铺 `--wui-color-page` 渐变，再叠 `blur(4px)`；模糊层向下探出 24px 后收尾。
  容器或祖先的 `overflow: hidden` 会裁掉这段尾巴。
- 宿主是不透明背景时，渐变会叠在它上方，但模糊采样不到宿主背后的内容——只会模糊自身的纯色背景。
  想要毛玻璃观感，宿主表面应保持半透明。

| token                           | 默认值                                 | 说明                                        |
| ------------------------------- | -------------------------------------- | ------------------------------------------- |
| `--wui-glow-color`              | `var(--wui-color-page, #fff)`          | 渐变起点色                                  |
| `--wui-glow-gradient-direction` | `to bottom`                            | `linear-gradient` 的方向                    |
| `--wui-glow-gradient`           | 由起点色与方向生成的 `linear-gradient` | 完整 background-image；设 `none` 关闭渐变   |
| `--wui-glow-blur`               | `4px`                                  | `backdrop-filter` 模糊半径；设 `0px` 关闭   |
| `--wui-glow-overhang`           | `24px`                                 | 模糊层向容器下方探出的高度                  |
| `--wui-glow-fade`               | `36px`                                 | 从全强度到透明的衰减总长，应不小于 overhang |

## Vite

`@greypan/web-ui/vite` 导出 `webUiOptimizeDeps`，即需要并进应用 `optimizeDeps.include` 的 web-ui 运行时
依赖清单。

web-ui 的组件从自己的 dist 里带出 `lit`、`@lit/context`、`@floating-ui/dom`。这些包不在应用的
dependencies 里，Vite 从应用侧解析不到，写裸名会被静默跳过；扫描器直到请求模块时才发现它们，打印
`optimized dependencies changed. reloading`，那次模块加载随之失败，报 `Failed to fetch dynamically
imported module`。

扫描器跟不进组件图时才需要这份清单，典型场景是路由或页面由虚拟模块加载，比如 file-based routing
（`vue-router/vite`）或 `import.meta.glob`。启动入口静态 import 到每个组件模块的应用，组件图本来就在启动
扫描里，不必列出。

```js
import { webUiOptimizeDeps } from '@greypan/web-ui/vite'

export default {
  optimizeDeps: {
    include: [...webUiOptimizeDeps]
  }
}
```

- 条目用 Vite 的 `<pkg> > <dep>` 解析写法，按 web-ui 的依赖树解析，而不是应用的。
- 直接引用这个导出，不要抄条目，它跟随 web-ui 的运行时依赖。
- 它只影响 dev 期的依赖预打包，构建不受影响。
- 改过带清单的配置后清一次 `node_modules/.vite` 再启动。热缓存会把缺失的条目一直藏到 CI，而 CI 没有缓存。

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
        button
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

当组件会把子元素移入自身的 Portal Shadow DOM（例如 `web-ui-dropdown` 的 menu item）时，React 根节点的
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

在 `portal` 模式下，库会把 panel 内容物理移入 overlay Shadow DOM：

- React 按记录的插入父节点执行删除，因此裸条件子元素（`{condition && <el/>}`）的节点一旦已迁移，在 panel 打开期间无法删除：commit 失败，且该节点可能在 panel 关闭时重新出现。
- 请改为在稳定的包装元素内部做条件渲染——React 记录的插入父节点是包装元素，包装元素内部的增删在 panel 打开期间与开合周期内都保持可用（示例如下）。
- panel 打开期间的裸条件新增（向宿主追加内容）不受影响，会自动迁入 panel。
- 保持内容始终挂载、仅切换可见性仍是有效的回退方案。

```tsx
<web-ui-popover portal open={open} trigger="manual">
  <div className="panel-body">{editing && <TagEditor />}</div>
</web-ui-popover>
```

### Vue

需要 `vue >= 3.5` 作为可选 peer 依赖。

Portal panel 支持实时渲染：overlay 打开期间条件新增或删除的内容（`web-ui-select`、`web-ui-autocomplete`、
`web-ui-popover`、`web-ui-tooltip`、`web-ui-dropdown`、`web-ui-context-menu` 内的 Vue `v-if`）会按模板序
自动迁入打开中的 panel；关闭时所有内容按原锚点位置恢复，后续 patch 继续正常工作。边界：panel 打开期间对
keyed `v-for` 列表做中段 splice 或重排不受支持——Vue 的 keyed children diff 会以已迁入 panel 的兄弟节点
计算插入锚点，patch 失败且可能丢项；与编译路径无关（编译模板同样命中）。此类列表更新请在 panel 关闭后
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
  <web-ui-button variant="primary" @click="handleClick">button</web-ui-button>
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
映射到内部 button，且仅接受 `button`、`submit`、`reset`；非法值会回退为 `button`。

ARIA 属性同样必须显式支持：使用组件文档化的命名属性，而不是通配 `aria-*` 透传。组件拥有自己的 role 和交互状态。
`click`、`input`、`change` 等浏览器 composed 原生事件仍是主要交互 API。`open-change` 等 kebab-case 自定义事件
仅描述用户操作导致的组件状态变化；程序化赋值 property 不会触发它们。

### Cursor 行为

交互控件使用原生箭头光标，而不是手型光标；disabled 控件使用 `not-allowed`。Slider、Switch 和 Segmented 在
hover 与按压反馈阶段保持箭头光标，仅在真实拖拽进行中切换为 `grabbing`。专用拖拽 drag bar 和 resize 控件保留各自
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
状态，保持打开，直到Consumer写回 `open=false`。这是模态确认语义——关 dialog/drawer 通常是需要Consumer批准的操作（未保存
表单、需确认），与即时开合不同，不能由组件自行提交。只有这两个模态组件使用该模式；即时开合家族（collapse、popover、
dropdown、tooltip）不需要它。

**原生表单模型（input、textarea、input-number、select、checkbox、radio、switch、autocomplete）。**
控件内部自管理 value/checked 状态；用户交互立即翻转，然后派发原生 `input`/`change` 事件。程序化赋值
（`el.checked = true`）覆盖内部状态。这与原生 `<input type="checkbox">` 一致——**没有 `controlled` prop 是因为
值总是可读可写**，React/Vue 层自备受控包装。

若翻转的持久化需要外部往返（例如 switch 应只有 API 调用成功后保持开启），使用**乐观更新**路径：

- 立即翻转，然后监听 `change`。
- 请求期间设 `loading`，阻断后续交互并显示 spinner。
- 失败后回写 property（`el.checked = false`）并提示 toast。

翻转先于批准的窗口被接受；不提供「批准前不翻转」的 `controlled` prop。

### 表单关联控件

所有表单控件均参与原生 `FormData`、约束校验、`form.reset()` 和浏览器表单状态恢复。控件会在**首次连接且声明式属性完成初始化后**捕获一次重置默认值；之后的运行时 property 更新不会改写该默认值。祖先 `fieldset` 的禁用状态会禁用交互和校验，但不会改写控件公开的 `disabled` 属性。对于 checkbox/radio group，父 group 是提交、重置和状态恢复的唯一所有者；被管理的子项不会独立提交或恢复状态。

`web-ui-button` 同样声明为 form-associated，使宿主可以持有外层 form 的 form owner 并转发 `submit`/`reset` 激活；它不向 `FormData` 贡献值。

## 所有组件

每个组件都有自己的文档页，API 参考、行为说明和可交互示例都在 [`docs/`](https://github.com/pan-Z2l0aHVi/mono/tree/main/packages/web-ui/docs) 下。下面的表只是索引。

| 分类                  | 组件                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **表单控件**          | [`<web-ui-input>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/input.CN.md)                         |
|                       | [`<web-ui-textarea>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/textarea.CN.md)                   |
|                       | [`<web-ui-editable-text>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/editable-text.CN.md)         |
|                       | [`<web-ui-input-number>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/input-number.CN.md)           |
|                       | [`<web-ui-select>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/select.CN.md)                       |
|                       | [`<web-ui-autocomplete>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/autocomplete.CN.md)           |
|                       | [`<web-ui-slider>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/slider.CN.md)                       |
|                       | [`<web-ui-checkbox>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/checkbox.CN.md)                   |
|                       | [`<web-ui-radio>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/radio.CN.md)                         |
|                       | [`<web-ui-switch>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/switch.CN.md)                       |
|                       | [`<web-ui-segmented>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/segmented.CN.md)                 |
|                       | [`<web-ui-checkbox-group>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/checkbox-group.CN.md)       |
|                       | [`<web-ui-radio-group>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/radio-group.CN.md)             |
| **button**            | [`<web-ui-button>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/button.CN.md)                       |
|                       | [`<web-ui-button-group>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/button-group.CN.md)           |
| **overlay / 模态**    | [`<web-ui-dialog>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/dialog.CN.md)                       |
|                       | [`<web-ui-drawer>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/drawer.CN.md)                       |
|                       | [`imagePreview()`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/image-preview.CN.md)                 |
| **文档流 Disclosure** | [`<web-ui-collapse>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/collapse.CN.md)                   |
| **浮动**              | [`<web-ui-popover>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/popover.CN.md)                     |
|                       | [`<web-ui-tooltip>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/tooltip.CN.md)                     |
|                       | [`<web-ui-context-menu>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/context-menu.CN.md)           |
| **menu**              | [`<web-ui-dropdown>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/dropdown.CN.md)                   |
|                       | [`<web-ui-dropdown-item>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/dropdown-item.CN.md)         |
|                       | [`<web-ui-dropdown-divider>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/dropdown-divider.CN.md)   |
|                       | [`<web-ui-dropdown-header>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/dropdown-header.CN.md)     |
| **数据展示**          | [`<web-ui-avatar>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/avatar.CN.md)                       |
|                       | [`<web-ui-badge>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/badge.CN.md)                         |
|                       | [`<web-ui-empty>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/empty.CN.md)                         |
|                       | [`<web-ui-middle-ellipsis>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/middle-ellipsis.CN.md)     |
|                       | [`<web-ui-icon>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/icon.CN.md)                           |
|                       | [`<web-ui-spinner>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/spinner.CN.md)                     |
| **布局与工具**        | [`<web-ui-layout>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/layout.CN.md)                       |
|                       | [`<web-ui-back-top>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/back-top.CN.md)                   |
|                       | [`<web-ui-svg-draw-lines>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/svg-draw-lines.CN.md)       |
|                       | [`<web-ui-theme>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/theme.CN.md)                         |
| **通知**              | [`<web-ui-toast>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/toast.CN.md)                         |
| **子项**              | [`<web-ui-option>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/option.CN.md)                       |
|                       | [`<web-ui-segmented-trigger>`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/web-ui/docs/segmented-trigger.CN.md) |
