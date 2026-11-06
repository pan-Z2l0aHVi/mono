# @greypan/md-to-meta

> Turn Markdown files into a structured meta module and one file per fenced code block.

English | [简体中文](./README.CN.md)

## Internal use

This is a private workspace package. Add it to a workspace package with the `workspace:*` protocol.

## Output

For each Markdown file, the generator writes:

- `<basename>.meta.js`, the document as an array of nodes.
- `<basename>.meta.d.ts`, the type declaration for that module.
- `codeblock/<hash>.<ext>`, one file per fenced code block. The extension is the fence language, or `.txt` when the fence has no language.
- `theme.css`, Markdown typography and syntax highlighting styles under the `.mdm-*` prefix.

The generator handles Markdown structure and code fences only. Locales, frameworks, example sections, API tables, and appearance selectors belong to the host app.

## Setup

```ts
// vite.config.ts
import { mdToMeta } from '@greypan/md-to-meta'

export default {
  plugins: [
    mdToMeta({
      input: ['./docs/*.md', './CHANGELOG.md'],
      output: './src/generated',
      exec: ['tsx'],
      darkSelector: 'html.dark'
    })
  ]
}
```

Paths resolve against the Vite root. During dev and build the plugin writes the artifacts. Under Vitest it only checks that the artifacts are current and writes nothing.

## Options

| Option         | Type                 | Default | Description                                                                                 |
| -------------- | -------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `input`        | `string \| string[]` | -       | File paths or globs, resolved against the Vite root. Only `.md` files are accepted.         |
| `output`       | `string`             | -       | Artifact directory, resolved against the Vite root.                                         |
| `exec`         | `string[]`           | `[]`    | Fence languages that get a `load` function. This does not change which files are written.   |
| `darkSelector` | `string`             | -       | Ancestor selector for the dark appearance in `theme.css`. Omit it to emit light rules only. |

Each matched document produces artifacts named after its filename. Two sources with the same basename in one output cause an error. Rename the file or narrow `input`.

## Meta module

```js
// button.CN.meta.js
const meta = [
  { label: 'h1', id: 'section-1', content: 'Button' },
  { label: 'p', content: 'Supports <strong>variants</strong> and links' },
  { label: 'ul', children: [{ label: 'li', content: 'One item' }] },
  { label: 'table', children: [{ label: 'tr', children: [{ label: 'th', content: 'Prop' }] }] },
  { label: 'hr' },
  { label: 'img', src: '...', alt: '...' },
  {
    label: 'codeblock',
    lang: 'tsx',
    path: './codeblock/<hash>.tsx',
    content: '<pre class="shiki mdm-code"><code>...</code></pre>',
    load: () => import('./codeblock/<hash>.tsx')
  }
]
export default meta
```

- `label` is an HTML tag name. The only exception is `codeblock`.
- Inline formatting is already rendered as HTML in `content`.
- `children` carries structural nesting for lists, tables, and blockquotes.
- Heading ids are `section-<n>` in document order.
- `load` is a dynamic import, so the bundler can split it into its own chunk. It exists only when `lang` is listed in `exec`.
- Identical code blocks share one file.

## Generated files

Commit the generated files. The host app owns `output/**`. The generator writes the meta modules, the declarations, `theme.css`, and the `codeblock` directory on each run.

Do not edit generated files by hand. Edit the Markdown and let the plugin regenerate them.
