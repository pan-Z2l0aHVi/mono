# @greypan/md-to-comp

> Markdown example-doc engine: turn fenced examples and API tables into sample data, compilable demo files, and a Vite plugin that keeps them in sync

English | [简体中文](./README.CN.md)

## What it does

One Markdown file per component is the source of truth for its documentation. The engine parses it and emits:

- `examples.ts` — example metadata (`ExampleDocPayload`) and rendered API tables for the host page
- `demos/<component>--<sample>.<ext>` — one compilable file per sample, named after the sample heading
- `examples.css` — Markdown typography, code highlighting tokens, and line-number styling

It is library-agnostic: component names, tag prefixes, attributes, and appearance selectors all come from configuration. React and Vue are built-in flavors.

## Internal use

This is a **private** workspace package; it is not published to npm. Consume it with the `workspace:*` protocol. Turborepo serves its `dist` to dependents through `^build`.

```json
{
  "devDependencies": {
    "@greypan/md-to-comp": "workspace:*"
  }
}
```

## Markdown contract

A doc file has YAML frontmatter and two optional skeleton sections:

````md
---
component: button
tag: web-ui-button
---

One-paragraph introduction.

## Samples

### Basic

Prose explaining the sample.

```tsx
export default function Demo() {
  return <web-ui-button>Click me</web-ui-button>
}
```

```vue
<template>
  <web-ui-button>Click me</web-ui-button>
</template>
```

## API

### Properties

| Name | Description | Type | Default |
| ---- | ----------- | ---- | ------- |
| ...  | ...         | ...  | ...     |
````

- `component` must equal the filename without its locale suffix; `tag` is the custom-element tag.
- `## Samples` and `## API` keep these exact names in every language. Sample headings (`### Basic`) also stay in English: they become ids, filenames, and `demoKey`s.
- Each sample must contain exactly one fence per configured flavor, in `flavors` order. Fence languages are `tsx` for `react` and `vue` for `vue`; the fence language is also the output extension.
- `## API` subsections are either registered tables (headers and column count come from the locale's `apiTables`) or prose. Prose renders as HTML and must not contain table lines. The whole `## API` section may be omitted for a purely presentational component.
- The first table column is the row identity, the second is rich-text description, and later columns are plain values. Empty value cells are not allowed; write `—` as the placeholder.

## Quick Start

The Vite entry is a thin wrapper that pins the flavor. `@greypan/md-to-comp/react` and
`@greypan/md-to-comp/vue` export ready-made plugin factories:

```ts
// vite.config.ts
import mdToComp from '@greypan/md-to-comp/react'

export default {
  plugins: [
    mdToComp({
      input: '../../packages/web-ui/docs',
      flavors: ['react', 'vue'],
      locales: [
        {
          locale: 'en',
          suffix: '.md',
          apiTables: { columns: { Properties: ['Name', 'Description', 'Type', 'Default'] } }
        },
        {
          locale: 'zh-CN',
          suffix: '.CN.md',
          apiTables: { columns: { 属性: ['名称', '说明', '类型', '默认值'] } }
        }
      ],
      outputs: [
        { output: 'src/generated/en', locale: 'en' },
        { output: 'src/generated/zh-CN', locale: 'zh-CN' }
      ],
      styles: 'src/generated/examples.css',
      darkSelector: 'html.dark'
    })
  ]
}
```

Paths are resolved against the Vite root. During dev and build the plugin generates and writes artifacts; under Vitest (`process.env.VITEST`) it only checks that artifacts are current and never writes.

## Exports

| Entry                       | Contents                                                                         |
| --------------------------- | -------------------------------------------------------------------------------- |
| `@greypan/md-to-comp`       | Parser, generator, renderer, highlighter, emit helpers, and `createMdToCompVite` |
| `@greypan/md-to-comp/react` | Vite plugin pinned to the `react` flavor                                         |
| `@greypan/md-to-comp/vue`   | Vite plugin pinned to the `vue` flavor                                           |

## Options

`MdToCompConfig` (engine) and `MdToCompViteOptions` (Vite entry) share these fields; the Vite entry resolves paths relative to the Vite root.

| Option         | Type                   | Default     | Description                                                                    |
| -------------- | ---------------------- | ----------- | ------------------------------------------------------------------------------ |
| `input`        | `string`               | —           | Directory containing the Markdown docs                                         |
| `dir`          | `string`               | `'demos'`   | Subdirectory for generated demo files, relative to each output                 |
| `anchor`       | `AnchorFn`             | `titleSlug` | Derives a sample id from its heading                                           |
| `flavors`      | `FenceFlavor[]`        | —           | Required fences per sample, in pairing order                                   |
| `locales`      | `DocsLocale[]`         | —           | Locale suffix and API table columns per language                               |
| `darkSelector` | `string`               | —           | Ancestor selector for the dark appearance; omit to emit light rules only       |
| `outputs`      | `{ output; locale }[]` | —           | Output directories and the locale each one renders                             |
| `styles`       | `string`               | per-output  | Shared `examples.css` path; omitted means one per output (contents must match) |

## Generated files

- Artifacts are committed: the host demo owns `src/generated/**`, and the plugin writes only through `writeIfChanged` so unchanged output does not churn the build hash or retrigger the watcher.
- The demo directory (`dir`) is owned by the generator and swept on every run, so renamed or deleted samples do not leave orphan files behind.
- Do not edit `src/generated/**` by hand. Edit the Markdown docs and let the plugin regenerate.
