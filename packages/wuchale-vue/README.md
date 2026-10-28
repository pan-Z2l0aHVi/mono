# @greypan/wuchale-vue

mono 内部的 private Vue SFC adapter，当前验证版本为 wuchale 0.26.7、Vue/compiler-sfc 3.5.42、plugin-vue 6.0.8。

支持 HTML 与组件/slot 容器内的模板文本、文字与普通插值组成的整句，以及 `title`、`alt`、`placeholder`、`aria-label`、`aria-description` 文案属性。JS/TS setup 函数内的字符串和受控模板表达式也参与提取。源码直接写自然文本，无须翻译函数、包装组件或注释标记。

```vue
<script setup>
const name = 'Ada'
const count = 2
</script>

<template>
  <p title="Welcome">Hello {{ name }}, {{ count }} items!</p>
</template>
```

上例提取 `Hello {0}, {1} items!`。译文可以重排为 `Il y a {1} articles pour {0}.`；每个表达式按源码顺序求值一次，并在下一个表达式执行前用 Vue `toDisplayString` 转为字符串。

## 配置

消费者须声明 workspace 依赖和 wuchale/Vue 依赖，然后在其 `wuchale.config.js` 中配置：

```js
import { adapter } from '@greypan/wuchale-vue'
import { defineConfig } from 'wuchale'

export default defineConfig({
  locales: ['en', 'fr'],
  adapters: {
    main: adapter({
      componentAttributes: { 'web-ui-option': ['label'], 'web-ui-tooltip': ['content'] },
      files: {
        include: 'src/**/*.vue',
        ignore: ['src/generated/**', '**/__tests__/**']
      }
    })
  },
  ai: null
})
```

Vite 使用 wuchale 自带的插件，在 Vue 插件之前登记：

```ts
import vue from '@vitejs/plugin-vue'
import { wuchale } from 'wuchale/vite'

export default {
  plugins: [wuchale(), vue()]
}
```

当前 wuchale 0.26.7 的 Vite 插件通过 `env.mode === 'build'` 选择 core 的 build 路径，见安装包 `dist/bundlers/vite.js:57`。本包分别验收默认 mode 和显式 `mode: 'build'` 的构建；消费者需要严格使用已有消息索引时，应显式执行 `vite build --mode build`，并核对项目对应的 `.env.build` 配置。

在消费者目录显式执行 `mise exec -- pnpm exec wuchale --clean` 提取 PO，再填写译文。生成的 loader/catalog 由 wuchale 管理，不手工编辑。启动时须在创建组件实例前调用 `loadLocale`：

```ts
import './locales/main.loader.js'

import { createApp } from 'vue'
import { loadLocale } from 'wuchale/load-utils'

import App from './App.vue'

await loadLocale('fr')
createApp(App).mount('#app')
```

挂载后继续调用 `await loadLocale('en')` 或 `await loadLocale('fr')`，现有组件会更新文案并保留本地状态。adapter 的 loader 用 Vue `shallowRef` 跟踪 Runtime；组件在 render 时读取当前 Runtime。

`loading.direct: true` 使用独立的 bundle loader；此模式从生成的 `main.loader.js` 导入 `setLocale` 并调用 `setLocale('fr')`。它不通过 `loadLocale` 切换；初始语言取配置中的第一项。直接模式与默认模式的响应式更新都有回归测试。

## 复数与富文本

复数使用 wuchale 生成的 `plural.js` 表达数量语义，编译器整体提取候选并自动传入当前语种，无须写翻译函数：

```vue
<script setup>
import plural from './locales/plural.js'
function quantity(count) {
  return plural(count, ['One item', '# items'])
}
</script>

<template>
  <p>{{ quantity(2) }}</p>
  <p>Read <a href="/guide">this guide</a> now.</p>
</template>
```

候选数量按源语种的 plural categories 编写。在 script setup 的渲染时函数内识别生成 `plural.js` 的 default import，支持 import 别名；同名局部绑定、动态候选、spread 或显式第三参数整体保留并警告。模板直接调用 helper 也整体跳过并警告，应像上例放入渲染时函数。模板字符串按整句提取，每个表达式沿用 JavaScript 模板插值的字符串化语义、求值顺序和次数；setup 快照仍需 computed 或渲染时函数才能随语种更新。

富文本提取为 `Read <0>this guide</0> now.`，译文可移动节点占位符。原节点的属性、事件与文案属性仍由 SFC 编译；生成的小型 Vue renderer 消费核心已编译的 composite，不解析译文 HTML。支持原生内联元素、链接、简单组件及普通插值；同一父节点内重排保留组件状态。为保留表达式求值顺序，插值与动态绑定混用、多个占位节点的动态绑定，以及组件默认 slot 内的插值或动态绑定整句跳过；单个链接绑定与事件仍可使用。scoped slot、`v-if/v-for`、Transition/TransitionGroup/KeepAlive/Teleport/Suspense 等复杂内建、块级结构和原始内容也安全跳过并警告。译文移除、重复或跨父节点移动节点时警告并回退源句结构。

`loading: { granular: true, group: ['src/features/**'] }` 使用核心的分组 catalog。group 与 granular 一起启用；已验证同组共享索引、不同组隔离、延迟 commit、语种切回，以及真实 SFC 构建。direct loader 保留独立的 setLocale 用法。

## Dev 更新

内置 wuchale Vite 插件支持新增文案和修改 PO。当前组合不保证 HMR 保留组件状态：新增文案会改变注入的 setup header，可能重建组件；PO 修改会重编译 catalog 并触发页面重载。真实 Chrome fixture 已验证新增文案 fallback、填写译文后更新，以及更新后的语言切换。不要把语言切换保留状态的保证延伸到 HMR。

## 当前边界

- 支持 inline HTML template、JS/TS `<script setup>` 和无 script 的 SFC。无 script 时按需增加 `<script setup>`。
- 运行时复用 wuchale 的编译后 catalog、索引查找与插值函数，并增加 Vue 响应式状态；没有运行时源码扫描或字符串全局替换。
- 遍历原生元素、组件、template 和 slot 容器。空图标元素旁的文本可以单独提取；内联富文本可整句提取并重排原生节点和简单组件；注释、块级节点、结构指令和 scoped slot 打断整句时保留整个元素并警告。纯插值中的字符串字面量参与提取，普通动态数据保持原样。
- 普通 script、双 script、外部 template、模板预处理器、SVG/MathML 保留原文并警告。`v-pre`、`v-html`、`v-text`、`pre`、`code`、`textarea`、`script`、`style` 子树也跳过。
- 处理上述白名单属性和它们的 `v-bind` 表达式；`componentAttributes` 按 tag 开放额外文案属性。编码后的绑定表达式无法可靠映射源码时跳过并警告。URL、`id`、class、data 属性不参与提取。默认使用标准 `{{ }}` delimiter 和 Vue 的默认 whitespace 规则；自定义模板编译选项尚不支持。
- JS/TS setup 中仅转换函数体内的字符串、插值模板字符串，以及 TS 断言包裹的这些表达式。顶层 setup 字符串保持快照语义；需随语言更新的数据可写成渲染时调用的函数或 computed getter。事件回调中的提示文案在调用时读取当前语言。
- 对象键、成员索引、比较值、switch case 测试、类型、函数参数、编译宏参数与 console 调用保持原样。已知对象键 API（Object.hasOwn、Reflect 等）及 localStorage/sessionStorage 调用不提取。tagged template 保留并警告；脚本字符串拼接和构造器参数暂不提取。候选仍须通过 wuchale heuristic，业务协议值应由消费端 heuristic 限定。
- 静态属性与同名显式 `v-bind` 共存时，保留该静态属性并警告，避免生成重复 directive 或改变覆盖语义。
- script 中出现 `_w_` 开头的 identifier 时保留整个 SFC，避免与核心生成的 loader/header 绑定冲突。
- 生成的 runtime 绑定同时避让原始源码与 AST 解码后的名称。静态文案若包含 wuchale 保留的 `{数字}`、`<数字>` 或 `<数字/>` 语法，会保留原文并警告，避免被误编译为占位符。属性前后空白单独保留，不参与消息索引。
- SSR、Nuxt、Vapor 尚未支持和验收。

`onWarn(diagnostic)` 可接收结构化诊断，包含 `code`、`filename`、`message`、UTF-16 `offset`，以及从 1 开始的 `line`、`column`。省略时通过 `console.warn` 输出。`heuristic` 接受 wuchale 的 `HeuristicFunc`；只有结果为 `message` 的候选会被处理。`files`、`storage`、`loading`、`sourceLocale` 传递给核心。

## 验证

从仓库根目录执行：

```sh
mise exec -- pnpm exec turbo test --filter=@greypan/wuchale-vue
mise exec -- pnpm exec turbo build --filter=@greypan/wuchale-vue
mise exec -- pnpm exec tsc --noEmit -p packages/wuchale-vue/tsconfig.json
CI=true mise exec -- pnpm exec vp check packages/wuchale-vue
```

测试覆盖 AST 位置、entity/CRLF、绑定注入、安全跳过、插值重排与求值、默认/direct loader、延迟 commitLocale、PO 提取，以及生成 catalog 和真实 SFC 的 Vite 构建。这些检查不替代浏览器中的语言切换与 HMR 验收。
