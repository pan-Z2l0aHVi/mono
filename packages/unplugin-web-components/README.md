# @greypan/unplugin-web-components

> Vite and Webpack plugin that imports web components when their tags appear.

English | [简体中文](./README.CN.md)

## Install

```bash
# npm
npm install @greypan/unplugin-web-components

# pnpm
pnpm add @greypan/unplugin-web-components

# yarn
yarn add @greypan/unplugin-web-components

# bun
bun add @greypan/unplugin-web-components
```

## Quick start

```ts
// vite.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'

export default defineConfig({
  plugins: [
    unpluginWebComponents({
      tagPrefix: 'web-ui',
      packageName: '@greypan/web-ui',
      sideEffects: true
    })
  ]
})
```

When you use `<web-ui-button>` in a Vue template, React JSX or TSX, or a Vite HTML entry, the matching import is added automatically.

```vue
<!-- Vue -->
<template>
  <web-ui-button>Click me</web-ui-button>
</template>
```

```tsx
// React
function App() {
  return <web-ui-button>Click me</web-ui-button>
}
```

### Vite HTML entry

For an HTML entry processed by Vite, the plugin injects a module script with one import per component.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Vanilla + web-ui</title>
  </head>
  <body>
    <web-ui-button>Click me</web-ui-button>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

With `sideEffects: true`, the injected script is roughly:

```html
<script type="module">
  import '@greypan/web-ui/components/button'
</script>
```

HTML injection rules:

- Only kebab-case custom elements are detected. HTML tag names are case-insensitive, so `<WEB-UI-BUTTON>` and `<web-ui-Button>` match `web-ui-button`. CamelCase names such as `<WebUiButton>` do not.
- Tags inside comments, `script`, `style`, `title`, `textarea`, `iframe`, and similar raw-text regions are ignored.
- The HTML must go through a Vite build. Files in `public/` and HTML opened directly from disk are not transformed.

## API

### `unpluginWebComponents(options)`

| Parameter             | Type      | Default | Description                                        |
| --------------------- | --------- | ------- | -------------------------------------------------- |
| `options.tagPrefix`   | `string`  | -       | Component tag prefix, for example `'web-ui'`.      |
| `options.packageName` | `string`  | -       | NPM package name, for example `'@greypan/web-ui'`. |
| `options.sideEffects` | `boolean` | `false` | Use side-effect imports such as `import 'pkg'`.    |
| `options.withStyle`   | `string`  | -       | CSS file to import with each component.            |

### Supported bundlers

| Entry      | Module transforms                   | HTML injection                 |
| ---------- | ----------------------------------- | ------------------------------ |
| `/vite`    | Vue (`.vue`), React (`.tsx`/`.jsx`) | Vite HTML entry (`index.html`) |
| `/webpack` | Vue (`.vue`), React (`.tsx`/`.jsx`) | -                              |

Only `/vite` and `/webpack` subpath exports are published. HTML injection is Vite-only. The Webpack adapter transforms module sources and does not inject into HTML.
