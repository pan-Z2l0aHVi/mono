# @greypan/unplugin-web-components

> Unplugin for web components auto-import in React, Vue, and Vite HTML entries

English | [简体中文](./README.CN.md)

## Features

- **Auto-import**: Automatically import web components when detected in templates
- **Dual tag detection**: Supports both kebab-case (`<web-ui-button>`) and PascalCase (`<WebUiButton>`) in module source
- **Style injection**: Optional CSS import for component styles
- **Vite HTML entries**: Inject component imports into `index.html` and other Vite HTML build inputs
- **Entry points**: `/vite` and `/webpack` sub-path exports only

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

## Quick Start

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

Now when you use `<web-ui-button>` in a Vue template, React JSX/TSX, or a Vite HTML entry, the import is automatically added:

```vue
<!-- Vue: auto-imported -->
<template>
  <web-ui-button>Click me</web-ui-button>
</template>
```

```tsx
// React: auto-imported
function App() {
  return <web-ui-button>Click me</web-ui-button>
}
```

### Vite HTML entry

For an HTML entry processed by Vite, the plugin scans the markup and injects a `<script type="module">` at the top of `<head>` with a static import per component:

```html
<!-- index.html -->
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

With `sideEffects: true` the injected script is roughly:

```html
<script type="module">
  import '@greypan/web-ui/components/button'
</script>
```

Notes on HTML injection:

- Only kebab-case custom elements (`<web-ui-*>` → `web-ui-button`) are detected. Matching is case-insensitive because HTML tag names are normalized to lowercase by the parser: `<WEB-UI-BUTTON>` and `<web-ui-Button>` are both treated as `web-ui-button`. CamelCase names like `<WebUiButton>` are not — the parser normalizes them to a different tag (`webuibutton`).
- HTML comments and raw-text/RCDATA regions (`script`, `style`, `title`, `textarea`, `iframe`, `xmp`, `noembed`, `noframes`, `noscript`) are ignored, so pseudo-tags in them never produce imports. Unclosed regions are normally treated as running to the end of the file; because a regex scanner cannot model comment and RAWTEXT tokenizer states simultaneously, an unclosed `<script>`/`style` pseudo-tag inside a comment (for example, `<!-- <script> --><web-ui-button>`) may swallow a real tag that follows it. Quoted attribute values are also skipped, including values with whitespace around `=` — `<div data-template = "<web-ui-button>">` does not trigger an import.
- The HTML must pass through a Vite build (`vite build`). Files in `public/` are served as-is, and HTML opened directly from disk is not transformed.

## API

### `unpluginWebComponents(options)`

Create an unplugin instance for web component auto-import.

| Parameter             | Type      | Default | Description                                 |
| --------------------- | --------- | ------- | ------------------------------------------- |
| `options.tagPrefix`   | `string`  | -       | Component tag prefix (e.g. `'web-ui'`)      |
| `options.packageName` | `string`  | -       | NPM package name (e.g. `'@greypan/web-ui'`) |
| `options.sideEffects` | `boolean` | `false` | Use side-effect imports (`import 'pkg'`)    |
| `options.withStyle`   | `string`  | -       | CSS file to import with each component      |

### Supported bundlers

| Entry      | Module transforms                   | HTML injection                 |
| ---------- | ----------------------------------- | ------------------------------ |
| `/vite`    | Vue (`.vue`), React (`.tsx`/`.jsx`) | Vite HTML entry (`index.html`) |
| `/webpack` | Vue (`.vue`), React (`.tsx`/`.jsx`) | —                              |

- Only `/vite` and `/webpack` sub-path exports are published; Rollup and esbuild entries are not provided.
- HTML injection is a Vite-only capability. The Webpack adapter performs module-source transforms only and does not inject into HTML — Webpack HTML injection would require a separate `HtmlWebpackPlugin` integration.
