# @greypan/web-ui

[English](./README.md) | 简体中文

## 快速安装

```npm
npm install @greypan/web-ui
```

```pnpm
pnpm add @greypan/web-ui
```

```bun
bun add @greypan/web-ui
```

```yarn
yarn add @greypan/web-ui
```

`lit` 是必需的 peer dependency。如果项目尚未安装，请同时安装 `lit`。React 的类型支持需要 React 19 和 `@types/react` 19 或更高版本；Vue 的类型支持需要 Vue 3.5 或更高版本。

## 如何使用

组件是原生 custom element。使用标签前，先导入组件模块完成注册。可以在应用入口注册全部组件：

```ts
import '@greypan/web-ui'
```

也可以按需导入；每个用到的标签都需要对应的导入：

```ts
import '@greypan/web-ui/components/button'
import '@greypan/web-ui/components/input'
```

### React

以下示例使用 React 19 和 TypeScript。

1. 在应用入口导入需要的组件，例如 `@greypan/web-ui/components/button` 和 `@greypan/web-ui/components/input`。
2. 在项目的 `env.d.ts` 中引入类型，并确保该文件包含在 TypeScript 配置的 `include` 中：

```ts
/// <reference types="@greypan/web-ui/types/react" />
```

3. 在 JSX 中使用组件：

```tsx
import { useState } from 'react'

export function App() {
  const [name, setName] = useState('')

  return (
    <>
      <web-ui-input value={name} placeholder="姓名" onInput={event => setName(event.currentTarget.value)} />
      <web-ui-button variant="primary" onClick={() => alert(name)}>
        问候
      </web-ui-button>
    </>
  )
}
```

使用 camelCase property 名称传递布尔值、数字、数组和对象，例如 `noScrollLock={true}`。布尔值应传入 `true` 或 `false`，不要写 `disabled="false"`：HTML 布尔 attribute 只要存在就表示启用。

原生事件使用 React 名称，如 `onClick`、`onInput`。自定义事件保留原事件名及连字符，例如：

```tsx
<web-ui-dialog open={open} onopen-change={event => setOpen(event.detail.open)} />
```

命名 slot 写在子元素上，例如 `<div slot="header">`。需要元素实例时，可使用 `useRef<WebUiDialog>(null)`；`WebUiDialog` 等类型从 `@greypan/web-ui` 导入。

#### 可选：自动导入组件

使用 Vite 时，可安装 `@greypan/unplugin-web-components`，让插件根据标签导入组件。在 `vite.config.ts` 中将它放在 React 插件之前：

```ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true }), react()]
})
```

### Vue

以下示例使用 Vue 3.5、Vite 和 TypeScript。

1. 在应用入口导入需要的组件，例如 `@greypan/web-ui/components/button` 和 `@greypan/web-ui/components/input`。
2. 在 `vite.config.ts` 中配置 Vue 编译器，将 `web-ui-*` 识别为 custom element：

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue({ template: { compilerOptions: { isCustomElement: tag => tag.startsWith('web-ui-') } } })]
})
```

3. 在项目的 `env.d.ts` 中引入类型，并确保该文件包含在 TypeScript 配置的 `include` 中：

```ts
/// <reference types="@greypan/web-ui/types/vue" />
```

4. 在模板中使用组件：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const name = ref('')
function greet() {
  alert(name.value)
}
</script>

<template>
  <web-ui-input :value="name" placeholder="姓名" @input="name = $event.target.value" />
  <web-ui-button variant="primary" @click="greet">问候</web-ui-button>
</template>
```

动态绑定布尔值和非字符串值时使用 camelCase property 名称，例如 `:sidebarCollapsed="false"`；也可以使用 Vue 的 `.prop` 修饰符。自定义事件使用原事件名，例如 `@open-change="open = $event.detail.open"`。命名 slot 写在子元素的 `slot` attribute 上，不使用 Vue 的 `v-slot`。

#### 可选：自动导入组件

安装 `@greypan/unplugin-web-components`，并将插件加入 Vite 配置；上面的 `isCustomElement` 配置仍然需要：

```ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue({ template: { compilerOptions: { isCustomElement: tag => tag.startsWith('web-ui-') } } }),
    unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true })
  ]
})
```

组件的属性、事件及完整示例见对应文档，例如 [Button](./docs/button.CN.md) 和 [Input](./docs/input.CN.md)。
