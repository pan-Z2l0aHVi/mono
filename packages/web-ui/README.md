# @greypan/web-ui

English | [简体中文](./README.CN.md)

## Quick install

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

`lit` is a required peer dependency. Install it too if your project does not already have it. React type support requires React 19 and `@types/react` 19 or later; Vue type support requires Vue 3.5 or later.

## Usage

Components are native custom elements. Import their modules to register them before using their tags. To register all components, import the package in your application entry point:

```ts
import '@greypan/web-ui'
```

Alternatively, import individual components. Each tag you use needs its corresponding import:

```ts
import '@greypan/web-ui/components/button'
import '@greypan/web-ui/components/input'
```

### React

This example uses React 19 and TypeScript.

1. Import the components you need in your application entry point, such as `@greypan/web-ui/components/button` and `@greypan/web-ui/components/input`.
2. Add the type reference to your project's `env.d.ts`, and ensure that file is included in your TypeScript configuration:

```ts
/// <reference types="@greypan/web-ui/types/react" />
```

3. Use the components in JSX:

```tsx
import { useState } from 'react'

export function App() {
  const [name, setName] = useState('')

  return (
    <>
      <web-ui-input value={name} placeholder="Name" onInput={event => setName(event.currentTarget.value)} />
      <web-ui-button variant="primary" onClick={() => alert(name)}>
        Greet
      </web-ui-button>
    </>
  )
}
```

Use camelCase property names for booleans, numbers, arrays, and objects, such as `noScrollLock={true}`. Pass booleans as `true` or `false` instead of writing `disabled="false"`: an HTML boolean attribute is enabled whenever it is present.

Use React names for native events, such as `onClick` and `onInput`. For custom events, retain the original name and hyphens:

```tsx
<web-ui-dialog open={open} onopen-change={event => setOpen(event.detail.open)} />
```

Place named slots on child elements, for example `<div slot="header">`. To access an element instance, use `useRef<WebUiDialog>(null)`; import types such as `WebUiDialog` from `@greypan/web-ui`.

#### Optional: automatic component imports

With Vite, you can install `@greypan/unplugin-web-components` to import components based on the tags you use. Place it before the React plugin in `vite.config.ts`:

```ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true }), react()]
})
```

### Vue

This example uses Vue 3.5, Vite, and TypeScript.

1. Import the components you need in your application entry point, such as `@greypan/web-ui/components/button` and `@greypan/web-ui/components/input`.
2. Configure the Vue compiler in `vite.config.ts` to recognize `web-ui-*` as custom elements:

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue({ template: { compilerOptions: { isCustomElement: tag => tag.startsWith('web-ui-') } } })]
})
```

3. Add the type reference to your project's `env.d.ts`, and ensure that file is included in your TypeScript configuration:

```ts
/// <reference types="@greypan/web-ui/types/vue" />
```

4. Use the components in your template:

```vue
<script setup lang="ts">
import { ref } from 'vue'

const name = ref('')
function greet() {
  alert(name.value)
}
</script>

<template>
  <web-ui-input :value="name" placeholder="Name" @input="name = $event.target.value" />
  <web-ui-button variant="primary" @click="greet">Greet</web-ui-button>
</template>
```

Use camelCase property names when dynamically binding booleans and non-string values, such as `:sidebarCollapsed="false"`. You can also use Vue's `.prop` modifier. Use the original name for custom events, for example `@open-change="open = $event.detail.open"`. Put named slots on child elements with the `slot` attribute instead of Vue's `v-slot`.

#### Optional: automatic component imports

Install `@greypan/unplugin-web-components` and add the plugin to your Vite configuration. The `isCustomElement` configuration above is still required:

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

For properties, events, and complete examples, see the component documentation, such as [Button](./docs/button.md) and [Input](./docs/input.md).
