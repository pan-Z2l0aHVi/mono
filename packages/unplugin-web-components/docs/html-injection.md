# HTML Injection

English | [简体中文](./html-injection.CN.md)

Inject component module imports automatically into Vite HTML entry files via `transformIndexHtml`.

## Usage

Enable the Vite plugin in `vite.config.ts`:

```ts
// vite.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import { defineConfig } from 'vite'

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

Given an HTML entry processed by Vite:

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

The plugin runs `transformIndexHtml` with `order: 'pre'` and prepends a module script to `<head>` (`injectTo: 'head-prepend'`):

```html
<script type="module">
  import '@greypan/web-ui/components/button'
</script>
```

## Detection & exclusion rules

- **kebab-case only**: HTML tag names are case-insensitive, so `<WEB-UI-BUTTON>` and `<web-ui-Button>` match `web-ui-button`. PascalCase tags such as `<WebUiButton>` are not recognized in HTML entries.
- **Quoted attribute values ignored**: Angle brackets inside attribute strings (for example `title="<web-ui-dialog>"` or `data-code="<script>"`) are stripped before scanning so they never trigger false imports or swallow following markup.
- **Raw-text elements & comments ignored**: Tags inside HTML comments (`<!-- ... -->`) and `<script>`, `<style>`, `<title>`, `<textarea>`, `<xmp>`, `<iframe>`, `<noembed>`, `<noframes>`, `<noscript>` are ignored. Tags inside `<template>` are still scanned.

## Boundaries

- **Vite-only**: HTML injection is implemented via Vite's `transformIndexHtml` hook. The `/webpack` adapter transforms module sources only and does not inject into HTML.
- **Vite build entries only**: The HTML must pass through Vite dev server or `vite build`. Static files in `public/` or HTML opened directly from disk are not transformed.
