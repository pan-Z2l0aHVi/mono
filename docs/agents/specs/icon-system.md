---
title: 'Icon System for @greypan/web-ui'
status: 'Ready for Agent'
labels: ['ready-for-agent']
created: '2026-07-16'
---

# Icon System for @greypan/web-ui

## Problem Statement

`@greypan/web-ui` currently depends on `iconify-icon` (a 6KB+ runtime web component) for rendering icons internally. This brings unnecessary runtime overhead, CDN dependency concerns for Chinese users, and prevents clean tree-shaking. Components like `back-top` and `button` use `<iconify-icon>` for built-in icons, locking the library into a specific runtime icon solution.

The user wants a zero-runtime, tree-shakable, type-safe icon system that:

- Serves **internal** component icons (spinner, back-top arrow, etc.)
- Provides a **general-purpose** `<web-ui-icon>` component for external consumers
- Doesn't force external consumers to adopt `iconify-icon`

## Solution

A two-layer icon architecture:

1. **Build-time generation**: A script reads `@iconify-json/lucide/icons.json` (and potentially other sets) and generates individual TypeScript icon modules under `packages/web-ui/src/icons/generated/`. Each icon is a standalone file exporting its SVG body, width, and height.

2. **Two consumption APIs**:
   - **Internal**: Components `import` icon data directly → render inline SVG via `unsafeSVG`. Zero overhead, fully tree-shakable.
   - **External**: A new `<web-ui-icon>` web component accepts a `.icon` property (Lit property binding, not string attribute). Consumers import icon data from `@greypan/web-ui/icons` and pass it via `.icon=${myIcon}`. Type-safe, tree-shakable, no runtime lookup.

## User Stories

1. As a component developer, I want to import an icon by its Lucide name (e.g., `import loader from '@greypan/web-ui/icons/loader'`), so that inline SVG rendering is a one-liner
2. As a component developer, I want to add a new icon to the library by adding its name to a manifest file and running a script, so that I don't manually craft SVG paths
3. As an external consumer, I want to use icons via `<web-ui-icon .icon=${myIcon}>`, so that icons are type-safe and tree-shaken
4. As an external consumer, I want to import icons as data objects (`.icon` property), so that I can reuse them outside `<web-ui-icon>` if needed
5. As a build pipeline, I want each icon to be its own module under `icons/generated/`, so that unused icons are tree-shaken via the existing `preserveModules` build
6. As a CI pipeline, I want the icon generation script to be runnable on demand, so that generated files are committed and reviewed
7. As an agent (Claude Code), I want a documented icon naming convention, so that I can fetch icon names from the Iconify website and add them correctly
8. As a maintainer, I want to remove `iconify-icon` from `dependencies`, so that the library has fewer runtime dependencies

## Implementation Decisions

### 1. Generation Script (`scripts/generate-icons.ts`)

Location: `packages/web-ui/scripts/generate-icons.ts`

Input: `packages/web-ui/icons.used.json` — a JSON array of strings, each in `"set:icon-name"` format:

```json
["lucide:loader-circle", "octicon:move-to-top-16"]
```

Source: Reads the corresponding `@iconify-json/<set>/icons.json` for each set used.

Output: For each icon, generates a file at `packages/web-ui/src/icons/generated/<normalized-name>.ts`:

```ts
import type { IconifyIcon } from '@iconify/types'

export default {
  width: 24,
  height: 24,
  body: '<path d="..." stroke="currentColor" .../>'
} satisfies IconifyIcon
```

Normalization rules:

- Strip set prefix from filename (`lucide:loader-circle` → `loader-circle`)
- Convert kebab-case for filename
- If a name collides across sets, prefix with set name (`mdi:account` → `mdi-account.ts`)

The script also generates `packages/web-ui/src/icons/index.ts` as a barrel export:

```ts
export { default as loaderCircle } from './generated/loader-circle'
export { default as moveToTop16 } from './generated/move-to-top-16'
```

### 2. Icon Data Type

Uses `@iconify/types` `IconifyIcon` as the canonical type — it's the defacto standard and already typed in our source package. No custom type needed.

```ts
import type { IconifyIcon } from '@iconify/types'
```

### 3. `<web-ui-icon>` Web Component

New component at `packages/web-ui/src/components/icon/index.ts`.

```ts
@customElement('web-ui-icon')
export class WebUiIcon extends LitElement {
  @property({ attribute: false }) icon?: IconifyIcon

  override render() {
    if (!this.icon) return nothing
    return html`
      <svg viewBox="0 0 ${this.icon.width} ${this.icon.height}" width="1em" height="1em" fill="none" aria-hidden="true">
        ${unsafeSVG(this.icon.body)}
      </svg>
    `
  }
}
```

Key decisions:

- `.icon` is `{attribute: false}` — never uses string attribute, only Lit property binding
- `aria-hidden="true"` by default (decorative icons)
- `fill="none"` on the `<svg>` to let the icon's own stroke/fill rules apply
- `width="1em"` `height="1em"` to scale with surrounding text
- Exported from the package entry point (`@/components/icon`)

### 4. Internal Component Migration

**Button** — loading spinner:

```ts
import { loaderCircle } from '@greypan/web-ui/icons/loader-circle'

// render:
html`<web-ui-icon .icon=${loaderCircle} spin></web-ui-icon>`
```

**Back-top** — arrow:

```ts
import { moveToTop16 } from '@greypan/web-ui/icons/move-to-top-16'

// render icon mode button:
html`<web-ui-button icon><web-ui-icon .icon=${moveToTop16}></web-ui-icon></web-ui-button>`
```

### 5. Package Exports Update

`packages/web-ui/package.json` — add icons sub-path export:

```json
{
  "exports": {
    "./icons/*": {
      "types": "./dist/icons/*.d.ts",
      "import": "./dist/icons/*.js"
    }
  }
}
```

With `preserveModules: true` in the build config, each icon file at `src/icons/generated/*.ts` will output to `dist/icons/generated/*.js`, and the barrel at `src/icons/index.ts` will output to `dist/icons/index.js`.

### 6. Dependency Changes

Remove from `dependencies`:

- `iconify-icon`

Add to `devDependencies`:

- `@iconify-json/lucide` (catalog:)
- `@iconify/types` (catalog: or direct)
- `@types/node` (already at root)

### 7. Build Config Update

`packages/web-ui/vite.config.ts` — remove `'iconify-icon'` from `rollupOptions.external`.

### 8. File Structure Summary

```
packages/web-ui/
├── icons.used.json              # Manifest of icons used by the library
├── scripts/
│   └── generate-icons.ts        # Build-time generation script
└── src/
    └── icons/
        ├── index.ts             # Barrel export of all icons (auto-generated)
        └── generated/           # Auto-generated, committed to git
            ├── loader-circle.ts
            ├── move-to-top-16.ts
            └── ...
```

Generated files are committed to git — they change infrequently and reviewing diffs is valuable.

### 9. Agent Conventions (CLAUDE.md)

Add to CLAUDE.md or domain docs:

- When adding a built-in icon to a component, search the icon name on https://icon-sets.iconify.design/ first
- Add the icon name (e.g. `lucide:search`) to `icons.used.json`
- Run `pnpm --filter @greypan/web-ui scripts/generate-icons.ts` to regenerate
- The generated file name strips the set prefix (e.g. `lucide:search` → `search.ts`)
- Import into component: `import { search } from '@greypan/web-ui/icons/search'`

## Testing Decisions

### What makes a good test

- Test **external behavior** only: rendered SVG structure, icon property changes, attribute reflection
- Don't test the generation script's output structure — the `IconifyIcon` type is the contract
- Prefer DOM assertions (query `svg`, check `viewBox`, check `path` presence) over snapshot testing

### Test modules

**`packages/web-ui/src/components/icon/__tests__/icon.spec.ts`**

- Renders `<web-ui-icon>` with no icon → renders nothing
- Renders with an icon object → renders an `svg` with correct `viewBox`
- Changing `.icon` → updates the SVG
- Icon object with `width`/`height` → `viewBox` reflects them
- Check `aria-hidden="true"` attribute
- Prior art: `button.spec.ts` (Lit component testing pattern with `element.updateComplete`)

**`packages/web-ui/src/components/button/__tests__/button.spec.ts`** (update)

- Existing loading test: update assertion to check for `svg.spinner` instead of `iconify-icon.spinner`
- Prior art: existing button tests

**`packages/web-ui/src/components/back-top/__tests__/back-top.spec.ts`**

- No existing tests — defer if the component is stable

**Generation script** — manual verification during development; not CI-tested since output is committed and changes are reviewed

## Out of Scope

- Dynamic icon loading at runtime (import() etc.) — the `.icon` property is a static type-safe API
- Icon search/filter UI — not a component library concern
- Image/svg icons from non-Iconify sources — future consideration
- Supporting the `iconify-icon` web component as an optional renderer — we're removing it
- CSS-only icons (like unicode/emoji fallbacks)
- Animate SVG icons beyond CSS animation
- Multi-set icon name collision beyond the simple prefix fallback described above
- The `icon` string attribute on `<web-ui-icon>` — explicitly NOT supported. Use `.icon=${icon}` only

## Further Notes

- The generation script is safe to re-run at any time — it overwrites generated files with identical content
- Adding a new set (e.g. `@iconify-json/octicon`) follows the same pattern: install devDep, add icons to manifest with the set prefix, re-run generation
- In a dev server (`vp build --watch`), icons directory is watched like any other source file; changes take effect on hot reload. Generated files are already in `src/` so they're included in the build watch automatically.
- After building, `dist/icons/` will reflect the same structure as `src/icons/` due to `preserveModules: true`
- When adding the first `@iconify-json/*` devDep, verify that `pnpm-workspace.yaml` catalog doesn't need updating (it doesn't unless the package is used across the workspace)
