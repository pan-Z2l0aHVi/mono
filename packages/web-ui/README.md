# @greypan/web-ui

> Lit-based web components for React, Vue, and vanilla JS

English | [简体中文](./README.CN.md)

## Features

- **Button**: Styled button with primary/secondary/ghost/danger variants
- **Icon**: Type-safe icon rendering via `.icon` property binding
- **BackTop**: Scroll-to-top with configurable threshold and smooth scroll
- **Layout**: Page layout with header/sidebar/tabbar slots
- **SVG Draw Lines**: SVG line drawing animation with easing control
- **Framework compatible**: Works with React, Vue, and vanilla HTML
- **Type safe**: Full TypeScript types for React and Vue

## Install

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

> Requires `lit` as a dependency.

## Quick Start

```js
import '@greypan/web-ui'
// import '@greypan/web-ui/components/button'
```

```html
<web-ui-button variant="primary">Click me</web-ui-button>
<web-ui-button variant="secondary">Cancel</web-ui-button>
<web-ui-button icon>
  <web-ui-icon .icon="${lucidePlus}"></web-ui-icon>
</web-ui-button>
```

## React

> Requires `@types/react >= 16` as an optional peer dependency for type support.

### Setup

**Option A — auto-import (Vite, recommended)**

Use `unplugin-web-components` to auto-register components when their tags appear in JSX:

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

**Option B — manual import**

Import the full library to register all components (side-effect registration):

```tsx
// main.tsx
import '@greypan/web-ui'
```

Or import only specific components for smaller bundle:

```tsx
// main.tsx or any component file
import '@greypan/web-ui/components/button'
import '@greypan/web-ui/components/back-top'
```

Add type augmentation so TypeScript recognizes the custom element JSX attributes:

```tsx
// env.d.ts or any type declaration file
import '@greypan/web-ui/types/react'
```

### App Layout

Wrap your router with `<web-ui-layout>` and use `<web-ui-back-top>` for global scroll-to-top:

```tsx
// root.tsx
import { Outlet } from '@tanstack/react-router'

export function Root() {
  return (
    <>
      <web-ui-layout>
        <h1>My App</h1>

        {/* Button variants */}
        <div className="flex gap-2">
          <web-ui-button>默认</web-ui-button>
          <web-ui-button variant="primary">Primary</web-ui-button>
          <web-ui-button variant="ghost">Ghost</web-ui-button>
          <web-ui-button full>Full Width</web-ui-button>
        </div>

        {/* Named slots */}
        <web-ui-button>
          <span slot="prefix">prefix</span>
          Button with prefix/suffix slots
          <span slot="suffix">suffix</span>
        </web-ui-button>

        {/* Router outlet for page content */}
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

> `onvisible-change` works in React 19+ (props forward to custom elements). For React 18, use a `ref` + `addEventListener` instead.

### SVG Draw Lines

Wrap an inline `<svg>` to animate its stroke drawing:

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

## Vue

> Requires `vue >= 3` as an optional peer dependency.

### Setup

**Option A — auto-import (Vite, recommended)**

Use `unplugin-web-components` for auto-registration:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'

export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
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

**Option B — manual import**

```ts
// main.ts
import { createApp } from 'vue'
import '@greypan/web-ui' // register all components
// import '@greypan/web-ui/components/button'
import App from './App.vue'

createApp(App).mount('#app')
```

For type augmentation in Vue templates:

```ts
// env.d.ts or any type declaration file
import '@greypan/web-ui/types/vue'
```

### App Layout

Wrap your app with `<web-ui-layout>` and use the button variants:

```vue
<template>
  <web-ui-layout>
    <h1>My App</h1>

    <div class="flex gap-2">
      <web-ui-button>默认</web-ui-button>
      <web-ui-button variant="primary">Primary</web-ui-button>
      <web-ui-button variant="ghost">Ghost</web-ui-button>
      <web-ui-button full>Full Width</web-ui-button>
    </div>

    <web-ui-button>
      <span slot="prefix">prefix</span>
      带前后缀插槽的按钮
      <span slot="suffix">suffix</span>
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

### SVG Draw Lines

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

Styled button component.

| Attribute  | Type                                                         | Default   | Description                   |
| ---------- | ------------------------------------------------------------ | --------- | ----------------------------- |
| `variant`  | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'` | Button style variant          |
| `disabled` | `boolean`                                                    | `false`   | Disabled state                |
| `loading`  | `boolean`                                                    | `false`   | Loading state (shows spinner) |
| `full`     | `boolean`                                                    | `false`   | Full width button             |
| `icon`     | `boolean`                                                    | `false`   | Icon-only mode                |

### `<web-ui-icon>`

Icon rendering component. Accepts icon data objects (not string attributes).

| Property | Type          | Description                                            |
| -------- | ------------- | ------------------------------------------------------ |
| `.icon`  | `IconifyIcon` | Icon data object (Lit property binding, not attribute) |
| `spin`   | `boolean`     | Enable CSS rotation animation                          |

```js
import { lucideLoaderCircle } from '@greypan/web-ui/icons'

html`<web-ui-icon .icon=${lucideLoaderCircle} spin></web-ui-icon>`
```

### `<web-ui-back-top>`

Scroll-to-top button.

| Attribute      | Type                    | Default  | Description                     |
| -------------- | ----------------------- | -------- | ------------------------------- |
| `smooth`       | `boolean`               | `true`   | Smooth scroll animation         |
| `threshold`    | `number`                | `200`    | Scroll threshold to show button |
| `visible`      | `boolean`               | `false`  | Current visibility state        |
| `scrollTarget` | `HTMLElement \| Window` | `window` | Scroll container                |

**Events:**

| Event            | Detail                 | Description              |
| ---------------- | ---------------------- | ------------------------ |
| `visible-change` | `{ visible: boolean }` | Visibility state changed |

### `<web-ui-layout>`

Page layout with slots.

| Slot      | Description       |
| --------- | ----------------- |
| `header`  | Header area       |
| `sidebar` | Sidebar area      |
| `tabbar`  | Tab bar area      |
| (default) | Main content area |

### `<web-ui-svg-draw-lines>`

SVG line drawing animation component. Wraps an `<svg>` element and animates stroke-dashoffset.

| Attribute  | Type     | Default    | Description              |
| ---------- | -------- | ---------- | ------------------------ |
| `duration` | `number` | `1000`     | Animation duration in ms |
| `easing`   | `string` | `'linear'` | CSS easing function      |

```html
<web-ui-svg-draw-lines duration="2000" easing="ease-in-out">
  <svg viewBox="0 0 100 100">
    <path d="M10 10 L90 10 L90 90 L10 90 Z" fill="none" stroke="black" />
  </svg>
</web-ui-svg-draw-lines>
```
