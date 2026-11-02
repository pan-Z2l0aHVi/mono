# @greypan/md-to-meta

> Generic markdown structuring engine: turn markdown into a plain meta object, emit every fenced block as a code file, and keep those artifacts in sync through a Vite plugin

English | [简体中文](./README.CN.md)

## What it does

One markdown file in, one structured module plus its code files out:

- `<basename>.meta.js` — the document as a node array (`label` / `content` / `children` / `load`), where `label` is the HTML tag name and the only exception is `codeblock`
- `<basename>.meta.d.ts` — the type declaration for that module
- `codeblock/<sha256>.<ext>` — every fenced block as its own file, named by content hash and extension equal to the fence language (`.txt` when the fence has no language)
- `theme.css` — Notion-like markdown typography, shiki light/dark token rules, and the line-number gutter, all under the `.mdm-*` prefix

The engine knows markdown structure and fences only. Locales, frameworks, example sections, API tables, demo manifests and appearance selectors belong to the host application.

## Internal use

This is a **private** workspace package; it is not published to npm. Consume it with the `workspace:*` protocol. Turborepo serves its `dist` to dependents through `^build`.

```json
{
  "devDependencies": {
    "@greypan/md-to-meta": "workspace:*"
  }
}
```

## Quick Start

```ts
// vite.config.ts
import { mdToMeta } from '@greypan/md-to-meta'

export default {
  plugins: [
    mdToMeta({
      input: ['./docs/*.md', './CHANGELOG.md'],
      output: './src/generated',
      // Only these fence languages get a `load` thunk; every fence is written to disk either way.
      exec: ['tsx'],
      darkSelector: 'html.dark'
    })
  ]
}
```

Paths are resolved against the Vite root. During dev and build the plugin generates and writes artifacts; under Vitest (`process.env.VITEST`) it only checks that artifacts are current and never writes.

## Options

| Option         | Type                 | Default | Description                                                                             |
| -------------- | -------------------- | ------- | --------------------------------------------------------------------------------------- |
| `input`        | `string \| string[]` | —       | Literal paths or globs, resolved against the Vite root; only `.md` files are accepted   |
| `output`       | `string`             | —       | Artifact directory, resolved against the Vite root                                      |
| `exec`         | `string[]`           | `[]`    | Fence languages that get a `load` thunk; does not affect which files are written        |
| `darkSelector` | `string`             | —       | Ancestor selector for the dark appearance in `theme.css`; omit to emit light rules only |

Every matched document produces artifacts name after its filename; two sources with the same basename in one output is an error, so rename the file or narrow `input`.

## Meta module

```js
// button.CN.meta.js
const meta = [
  { label: 'h1', id: 'section-1', content: 'Button' },
  { label: 'p', content: 'Supports <strong>variants</strong> and links' },
  { label: 'ul', children: [{ label: 'li', content: 'One item' }] },
  { label: 'table', children: [{ label: 'tr', children: [{ label: 'th', content: 'Prop' }] }] },
  { label: 'hr' },
  { label: 'img', src: '…', alt: '…' },
  {
    label: 'codeblock',
    lang: 'tsx',
    path: './codeblock/<hash>.tsx',
    content: '<pre class="shiki mdm-code"><code>…</code></pre>',
    load: () => import('./codeblock/<hash>.tsx')
  }
]
export default meta
```

- Inline content is already rendered HTML in `content`; `children` only carries structural nesting (lists, tables, blockquotes).
- Heading ids are `section-<n>` in document order.
- `load` is a literal dynamic import, so Rollup can analyze it and split chunks; it is present only when `lang` is listed in `exec`.
- Code files are content-addressed: the same fence in two documents shares one file.

## Generated files

- Artifacts are committed: the host owns `output/**`, and the plugin writes only through `writeIfChanged` so unchanged output does not churn the build hash or retrigger the watcher.
- `output/**/*.meta.js`, `output/**/*.meta.d.ts`, `output/theme.css` and `output/codeblock/**` are owned by the generator and swept on every run.
- Do not edit artifacts by hand. Edit the markdown and let the plugin regenerate.
