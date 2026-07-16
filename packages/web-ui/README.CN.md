# @greypan/web-ui

基于 Lit 的 Web Components，支持 React、Vue 和原生 HTML

[English](./README.md) | 简体中文

## 功能

- **Button**：带 full/primary/text/icon 变体的样式化按钮
- **BackTop**：可配置阈值和平滑滚动的回到顶部按钮
- **Layout**：带 header/sidebar/tabbar 插槽的页面布局
- **SVG Draw Lines**：带缓动控制的 SVG 线条绘制动画
- **框架兼容**：支持 React、Vue 和原生 HTML
- **类型安全**：为 React 和 Vue 提供完整的 TypeScript 类型

## 安装

```bash
# npm
npm install @greypan/web-ui

# pnpm
pnpm add @greypan/web-ui

# yarn
yarn add @greypan/web-ui

# bun
bun add @greypan/web-ui
```

> 需要 `lit` 作为依赖。

## 快速开始

```js
import '@greypan/web-ui'
// import '@greypan/web-ui/components/button'
```

```html
<web-ui-button primary>点击我</web-ui-button>
<web-ui-button text>取消</web-ui-button>
<web-ui-button icon>
  <iconify-icon icon="lucide:plus"></iconify-icon>
</web-ui-button>
```

## React 中使用

> 需要 `@types/react >= 16` 作为可选 peer 依赖，用于类型支持。

### 初始化

**方式 A — auto-import（Vite，推荐）**

使用 `unplugin-web-components` 自动注册自定义组件：

```ts
// vite.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'

export default {
  plugins: [
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    })
  ]
}
```

**方式 B — 手动导入**

在应用入口全量导入，注册所有组件（side-effect 注册）：

```tsx
// main.tsx
import '@greypan/web-ui'
```

或按需导入，只注册需要的组件：

```tsx
// main.tsx 或任意组件文件
import '@greypan/web-ui/components/button'
import '@greypan/web-ui/components/back-top'
```

添加类型声明以让 TypeScript 识别自定义元素 JSX 属性：

```tsx
// env.d.ts 或任意类型声明文件
import '@greypan/web-ui/types/react'
```

### 应用布局

用 `<web-ui-layout>` 包裹路由，配合 `<web-ui-back-top>` 实现全局回到顶部：

```tsx
// root.tsx
import { Outlet } from '@tanstack/react-router'

export function Root() {
  return (
    <>
      <web-ui-layout>
        <h1>My App</h1>

        {/* 按钮变体 */}
        <div className="flex gap-2">
          <web-ui-button>默认</web-ui-button>
          <web-ui-button primary>Primary</web-ui-button>
          <web-ui-button text>Text</web-ui-button>
          <web-ui-button full>Full Width</web-ui-button>
        </div>

        {/* 具名插槽 */}
        <web-ui-button>
          <span slot="prefix">前缀</span>
          带前后缀插槽的按钮
          <span slot="suffix">后缀</span>
        </web-ui-button>

        {/* 路由出口 */}
        <Outlet />
      </web-ui-layout>

      <web-ui-back-top
        threshold={300}
        onvisible-change={e => {
          console.log('visible: ', e.detail.visible)
        }}
      />
    </>
  )
}
```

> `onvisible-change` 在 React 19+ 中可用（props 转发到 custom element）。React 18 请改用 `ref` + `addEventListener`。

### SVG 线条动画

包裹内联 `<svg>` 来实现线条绘制动画：

```tsx
function SvgDemo() {
  return (
    <web-ui-svg-draw-lines>
      <svg viewBox="0 0 24 24" width="100" height="100" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4v16M8 6h12M8 12h6m-6 6h10" />
      </svg>
    </web-ui-svg-draw-lines>
  )
}
```

## Vue 中使用

> 需要 `vue >= 3` 作为可选 peer 依赖。

### 初始化

**方式 A — auto-import（Vite，推荐）**

使用 `unplugin-web-components` 自动注册：

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'

export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 告诉 Vue 模板编译器将 web-ui-* 标签视为自定义元素
          isCustomElement: tag => tag.startsWith('web-ui-') || tag.startsWith('WebUi')
        }
      }
    }),
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    })
  ]
}
```

**方式 B — 手动导入**

```ts
// main.ts
import { createApp } from 'vue'
import '@greypan/web-ui' // 全量导入
// import '@greypan/web-ui/components/button'
import App from './App.vue'

createApp(App).mount('#app')
```

同时配置 Vue 编译器以识别自定义元素：

```ts
// vite.config.ts
vue({
  template: {
    compilerOptions: {
      isCustomElement: tag => tag.startsWith('web-ui-') || tag.startsWith('WebUi')
    }
  }
})
```

Vue 模板中的类型增强：

```ts
// env.d.ts 或任意类型声明文件
import '@greypan/web-ui/types/vue'
```

### 应用布局

用 `<web-ui-layout>` 包裹应用，使用按钮的各种变体：

```vue
<template>
  <web-ui-layout>
    <h1>My App</h1>

    <div class="flex gap-2">
      <web-ui-button>默认</web-ui-button>
      <web-ui-button primary>Primary</web-ui-button>
      <web-ui-button text>Text</web-ui-button>
      <web-ui-button full>Full Width</web-ui-button>
    </div>

    <web-ui-button>
      <span slot="prefix">前缀</span>
      带前后缀插槽的按钮
      <span slot="suffix">后缀</span>
    </web-ui-button>

    <RouterView />
  </web-ui-layout>

  <web-ui-back-top :threshold="300" @visible-change="onVisibleChange" />
</template>

<script setup lang="ts">
function onVisibleChange(e: CustomEvent<{ visible: boolean }>) {
  console.log('visible: ', e.detail.visible)
}
</script>
```

### SVG 线条动画

```vue
<template>
  <web-ui-svg-draw-lines>
    <svg viewBox="0 0 24 24" width="100" height="100" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 4v16M8 6h12M8 12h6m-6 6h10" />
    </svg>
  </web-ui-svg-draw-lines>
</template>
```

## API

### `<web-ui-button>`

样式化按钮组件。

| 属性      | 类型      | 默认值  | 说明       |
| --------- | --------- | ------- | ---------- |
| `full`    | `boolean` | `false` | 全宽按钮   |
| `primary` | `boolean` | `false` | 主要样式   |
| `text`    | `boolean` | `false` | 纯文本样式 |
| `icon`    | `boolean` | `false` | 纯图标模式 |

### `<web-ui-back-top>`

回到顶部按钮。

| 属性           | 类型                    | 默认值   | 说明               |
| -------------- | ----------------------- | -------- | ------------------ |
| `smooth`       | `boolean`               | `true`   | 平滑滚动动画       |
| `threshold`    | `number`                | `200`    | 显示按钮的滚动阈值 |
| `visible`      | `boolean`               | `false`  | 当前可见状态       |
| `scrollTarget` | `HTMLElement \| Window` | `window` | 滚动容器           |

**事件：**

| 事件名           | 详情                   | 说明         |
| ---------------- | ---------------------- | ------------ |
| `visible-change` | `{ visible: boolean }` | 可见状态变更 |

### `<web-ui-layout>`

带插槽的页面布局。

| 插槽      | 说明           |
| --------- | -------------- |
| `header`  | 顶部区域       |
| `sidebar` | 侧边栏区域     |
| `tabbar`  | 底部标签栏区域 |
| （默认）  | 主内容区域     |

### `<web-ui-svg-draw-lines>`

SVG 线条绘制动画组件。包裹 `<svg>` 元素并动画化 stroke-dashoffset。

| 属性       | 类型     | 默认值     | 说明             |
| ---------- | -------- | ---------- | ---------------- |
| `duration` | `number` | `1000`     | 动画时长（毫秒） |
| `easing`   | `string` | `'linear'` | CSS 缓动函数     |

```html
<web-ui-svg-draw-lines duration="2000" easing="ease-in-out">
  <svg viewBox="0 0 100 100">
    <path d="M10 10 L90 10 L90 90 L10 90 Z" fill="none" stroke="black" />
  </svg>
</web-ui-svg-draw-lines>
```
