# @greypan/wuchale-vue

> wuchale 的 Vue 单文件组件适配器。

这是私有 workspace 包，用于从 Vue 单文件组件中提取可翻译文案，并接入 wuchale 的编译与运行时。

源码里直接写自然文本，不需要翻译函数、包装组件或注释标记。

```vue
<script setup>
const name = 'Ada'
const count = 2
</script>

<template>
  <p title="Welcome">Hello {{ name }}, {{ count }} items!</p>
</template>
```

上面的模板会提取 `Hello {0}, {1} items!`。译文可以调整占位符顺序，例如 `Il y a {1} articles pour {0}.`。每个表达式按源码顺序求值一次。

## 配置

消费者需要声明 workspace 依赖以及 wuchale、Vue 依赖，然后在 `wuchale.config.js` 中使用适配器：

```js
import { adapter } from '@greypan/wuchale-vue'
import { defineConfig } from 'wuchale'

export default defineConfig({
  locales: ['en', 'fr'],
  adapters: {
    main: adapter({
      files: {
        include: 'src/**/*.vue',
        ignore: ['src/generated/**', '**/__tests__/**']
      }
    })
  },
  ai: null
})
```

默认会提取普通属性。`componentAttributes` 只用于按组件标签放行被默认排除的文案属性：

```js
adapter({ componentAttributes: { MyDisplayCard: ['name'] } })
```

不要把 `value`、`to`、`href` 这类承载身份、比较、提交或路由的值加进白名单。

Vite 中使用 wuchale 自带的插件，并把它放在 Vue 插件之前：

```ts
import vue from '@vitejs/plugin-vue'
import { wuchale } from 'wuchale/vite'

export default {
  plugins: [wuchale(), vue()]
}
```

## 加载文案

在应用目录执行 wuchale 提取 PO，然后填写译文。生成的 loader 和 catalog 由 wuchale 管理，不要手改。

启动时在创建组件实例之前加载语言：

```ts
import './locales/main.loader.js'

import { createApp } from 'vue'
import { loadLocale } from 'wuchale/load-utils'

import App from './App.vue'

await loadLocale('fr')
createApp(App).mount('#app')
```

挂载后可以继续调用 `await loadLocale('en')` 或 `await loadLocale('fr')`。现有组件会更新文案并保留本地状态。

如果使用 `loading.direct: true`，改为从生成的 `main.loader.js` 导入 `setLocale` 并调用它。初始语言取配置中的第一项。

## 复数与富文本

复数使用 wuchale 生成的 `plural.js`。在渲染时函数中调用它，模板直接调用会被跳过并给出警告。

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

富文本会提取成 `Read <0>this guide</0> now.`，译文可以移动节点占位符。支持原生内联元素、链接、简单组件和普通插值。同一个父节点内重排会保留组件状态。

为了保持求值顺序，插值和动态绑定混用、多个占位节点的动态绑定，以及组件默认 slot 内的插值会整句跳过。scoped slot、`v-if`/`v-for`、Transition、KeepAlive、Teleport、Suspense 等结构也会跳过并警告。

## 开发时更新

新增文案或修改 PO 后，页面可能重新加载。语言切换能保留状态，但 HMR 不保证保留组件状态。

## 边界

- 支持内联模板、JS/TS `<script setup>` 和无 script 的 SFC。
- 普通 script、双 script、外部模板、模板预处理器、SVG 和 MathML 保留原文并警告。
- `v-pre`、`v-html`、`v-text`、`pre`、`code`、`textarea`、`script`、`style` 子树会被跳过。
- 默认处理所有属性字面量和受控 `v-bind` 表达式。`class`、`id`、`style`、`key`、`ref`、`slot`、`is`、表单与资源属性、ARIA 机器值、`data-*`、`v-*` 默认排除。
- `variant`、`status` 等枚举值仍会被当作候选。需要时用 `heuristic` 收窄。
- SSR、Nuxt 和 Vapor 尚未支持。

`onWarn(diagnostic)` 可以接收结构化诊断。省略时通过 `console.warn` 输出。
