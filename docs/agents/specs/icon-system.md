---
title: 'Icon System for @greypan/web-ui'
status: 'Implemented'
labels: ['implemented']
created: '2026-07-16'
updated: '2026-07-17'
---

# Icon System for @greypan/web-ui

## Problem Statement

`@greypan/web-ui` previously depended on `iconify-icon` (a 6KB+ runtime web component) for rendering icons internally. This brought unnecessary runtime overhead, CDN dependency concerns for Chinese users, and prevented clean tree-shaking. Components like `back-top` and `button` used `<iconify-icon>` for built-in icons, locking the library into a specific runtime icon solution.

The user wanted a zero-runtime, tree-shakable, type-safe icon system that:

- Serves **internal** component icons (spinner, back-top arrow, etc.)
- Provides a **general-purpose** `<web-ui-icon>` component for external consumers
- Doesn't force external consumers to adopt `iconify-icon`

## Solution

A two-layer icon architecture:

1. **Build-time generation**: A script reads `@iconify-json/*/icons.json` and generates individual TypeScript icon modules under `packages/web-ui/src/icons/generated/`. Each icon is a standalone file exporting its SVG body, width, and height. Generation is triggered automatically by a Vite plugin during `vp build`, and can also be run manually via `pnpm generate-icons`.

2. **Two consumption APIs**:
   - **Internal**: Components `import` icon data directly (via barrel or sub-path) → render via `<web-ui-icon .icon=${icon}>`. Zero overhead, fully tree-shakable.
   - **External**: A `<web-ui-icon>` web component accepts a `.icon` property (Lit property binding, not string attribute). Consumers import icon data from `@greypan/web-ui/icons` and pass it via `.icon=${myIcon}`. Type-safe, tree-shakable, no runtime lookup.

## User Stories

1. As a component developer, I want to import an icon by its set-prefixed name (e.g., `import { lucideLoaderCircle } from '@greypan/web-ui/icons'`), so that the icon's source set is always clear
2. As a component developer, I want to add a new icon to the library by adding its name to a manifest file and running a script, so that I don't manually craft SVG paths
3. As an external consumer, I want to use icons via `<web-ui-icon .icon=${myIcon}>`, so that icons are type-safe and tree-shaken
4. As an external consumer, I want to import icons as data objects (`.icon` property), so that I can reuse them outside `<web-ui-icon>` if needed
5. As a build pipeline, I want each icon to be its own module under `icons/generated/`, so that unused icons are tree-shaken via the existing `preserveModules` build
6. As a CI pipeline, I want the icon generation to happen automatically during build, and also be runnable on demand via CLI
7. As an agent (Claude Code), I want a documented icon naming convention, so that I can fetch icon names from the Iconify website and add them correctly
8. As a maintainer, `iconify-icon` has been removed from `dependencies`, so the library has fewer runtime dependencies

## Implementation Decisions

### 1. Generation Script (`scripts/generate-icons.ts`)

Location: `packages/web-ui/scripts/generate-icons.ts`

Input: `packages/web-ui/icons.used.json` — a JSON array of strings, each in `"set:icon-name"` format:

```json
["lucide:loader-circle", "lucide:arrow-up-to-line"]
```

Source: Reads the corresponding `@iconify-json/<set>/icons.json` for each set used via ESM dynamic import with JSON import attributes.

Output: For each icon, generates a file at `packages/web-ui/src/icons/generated/<set>-<name>.ts`:

```ts
import type { IconifyIcon } from '@iconify/types'

export default {
  width: 24,
  height: 24,
  body: '<path d="..." stroke="currentColor" .../>'
} satisfies IconifyIcon
```

**Naming convention**: Always prefix with set name (`lucide:loader-circle` → `lucide-loader-circle.ts`). This ensures:

- Cross-set name conflicts are impossible
- The source set is always visible in the import
- Easy for agents to map between `icons.used.json` and import names

The script also generates `packages/web-ui/src/icons/index.ts` as a barrel export:

```ts
export { default as lucideLoaderCircle } from './generated/lucide-loader-circle'
export { default as lucideArrowUpToLine } from './generated/lucide-arrow-up-to-line'
```

### 2. Vite Plugin Integration

A Vite plugin in `vite.config.ts` calls `generateIcons()` during `buildStart`, ensuring icons are generated before the build runs. The plugin uses `writeIfChanged` to avoid triggering the file watcher during `vp build --watch` (prevents infinite rebuild loops).

### 3. Icon Data Type

Uses `@iconify/types` `IconifyIcon` as the canonical type — it's the defacto standard and already typed in our source package. No custom type needed.

```ts
import type { IconifyIcon } from '@iconify/types'
```

### 4. `<web-ui-icon>` Web Component

Component at `packages/web-ui/src/components/icon/index.ts`.

```ts
@customElement('web-ui-icon')
export class WebUiIcon extends LitElement {
  @property({ attribute: false }) icon?: IconifyIcon
  @property({ type: Boolean, reflect: true }) spin = false

  override render() {
    if (!this.icon) return nothing
    return html`
      <svg viewBox="0 0 ${this.icon.width} ${this.icon.height}" width="1em" height="1em" aria-hidden="true">
        ${unsafeSVG(this.icon.body)}
      </svg>
    `
  }
}
```

Key decisions:

- `.icon` is `{attribute: false}` — never uses string attribute, only Lit property binding
- `spin` property triggers CSS rotation animation via `:host([spin]) svg`
- `aria-hidden="true"` by default (decorative icons)
- `width="1em"` `height="1em"` to scale with surrounding text
- Exported from the package entry point (`@/components/icon`)

### 5. Internal Component Migration

**Button** — loading spinner:

```ts
import { lucideLoaderCircle } from '@/icons'

// render:
html`<web-ui-icon .icon=${lucideLoaderCircle} spin></web-ui-icon>`
```

**Back-top** — arrow:

```ts
import { lucideArrowUpToLine } from '@/icons'

// render icon mode button:
html`<web-ui-button icon><web-ui-icon .icon=${lucideArrowUpToLine}></web-ui-icon></web-ui-button>`
```

Internal components use barrel imports (`@/icons`) for convenience. Tree-shaking still works because the barrel is not in `sideEffects` and each icon is a separate module via `preserveModules`.

### 6. Package Exports

`packages/web-ui/package.json` exports:

```json
{
  "exports": {
    ".": {
      "types": "./dist/components/index.d.ts",
      "import": "./dist/components/index.js"
    },
    "./icons": {
      "types": "./dist/icons/index.d.ts",
      "import": "./dist/icons/index.js"
    },
    "./icons/*": {
      "types": "./dist/icons/*.d.ts",
      "import": "./dist/icons/*.js"
    },
    "./components/*": {
      "types": "./dist/components/*/index.d.ts",
      "import": "./dist/components/*/index.js"
    }
  }
}
```

Both `import { lucideLoaderCircle } from '@greypan/web-ui/icons'` (barrel) and `import { lucideLoaderCircle } from '@greypan/web-ui/icons/lucide-loader-circle'` (sub-path) work and support tree-shaking.

### 7. Dependency Changes

Removed from `dependencies`:

- `iconify-icon`

Added to `devDependencies`:

- `@iconify-json/lucide` (catalog:)
- `@iconify/types` (catalog:)

### 8. Build Config

`packages/web-ui/vite.config.ts`:

- `iconify-icon` removed from `rollupOptions.external`
- `icons/index` added as second entry point for barrel output
- `vite-plugin-dts` configured with `include: ['src/components/**/*', 'src/icons/**/*']` to generate `.d.ts` for both components and icons

### 9. File Structure

```
packages/web-ui/
├── icons.used.json              # Manifest of icons used by the library
├── scripts/
│   └── generate-icons.ts        # Generation script (CLI + Vite plugin import)
├── vite.config.ts               # Vite plugin calls generateIcons() at buildStart
└── src/
    └── icons/
        ├── index.ts             # Barrel export (auto-generated, gitignored)
        └── generated/           # Auto-generated, gitignored
            ├── lucide-loader-circle.ts
            ├── lucide-arrow-up-to-line.ts
            └── ...
```

Generated files are gitignored — the Vite plugin regenerates them during build, and the CLI script (`pnpm generate-icons`) regenerates them on demand.

### 10. Agent Conventions

- When adding a built-in icon to a component, search the icon name on https://icon-sets.iconify.design/ first
- Add the icon name (e.g. `lucide:search`) to `icons.used.json`
- Run `pnpm generate-icons` or just `pnpm build` to regenerate
- The generated file name always includes the set prefix (e.g. `lucide:search` → `lucide-search.ts`)
- Import into component: `import { lucideSearch } from '@/icons'`

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
- Empty icon → restores nothing
- `spin` attribute reflects and toggles
- Via module import tests for `lucideLoaderCircle` and `lucideArrowUpToLine`

**`packages/web-ui/src/components/button/__tests__/button.spec.ts`** (updated)

- Loading test checks for `web-ui-icon` element with `spin` attribute
- Loading-off test checks `web-ui-icon` is null

## Out of Scope

- Dynamic icon loading at runtime (import() etc.) — the `.icon` property is a static type-safe API
- Icon search/filter UI — not a component library concern
- Image/svg icons from non-Iconify sources — future consideration
- CSS-only icons (like unicode/emoji fallbacks)
- Animate SVG icons beyond CSS animation
- The `icon` string attribute on `<web-ui-icon>` — explicitly NOT supported. Use `.icon=${icon}` only

## Further Notes

- The generation script uses `writeIfChanged` to skip writes when content hasn't changed, preventing Vite watcher infinite loops during dev
- Adding a new set (e.g. `@iconify-json/mdi`) follows the same pattern: install devDep, add icons to `icons.used.json` with the set prefix, rebuild
- `vue-tsc` / `tsc` has been removed from individual package build scripts — type-checking is handled by `vp check` at workspace level
