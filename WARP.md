# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Overview

This is a pnpm-based monorepo using Turborepo for build orchestration. It contains both React and Vue applications with shared utility packages and web components built with Lit.

**Key characteristics:**

- Uses `rolldown-vite` (a Vite fork) instead of standard Vite
- Supports both Vue 3 and React 19 within the same monorepo
- Node version: >=22.17.0, pnpm: >=10.15.0
- TypeScript project references for cross-package type checking

## Common Commands

### Development

**Run development servers:**

```bash
# React demo app
pnpm dev:react-app-demo

# Vue demo app
pnpm dev:vue-app-demo
```

**Watch mode for packages (auto-rebuild on changes):**

```bash
# Watch specific packages
pnpm watch:utils-core
pnpm watch:game-hud
pnpm watch:web-ui
pnpm watch:unplugin-web-components
```

### Building

```bash
# Build all packages and apps
pnpm build

# Build from individual package/app directory
pnpm -C packages/utils-core build
pnpm -C apps/react-app-demo build
```

### Testing

```bash
# Run all tests (uses Vitest)
pnpm test

# Run tests from individual package
pnpm -C packages/utils-core test

# Tests are located in __tests__ directories or as *.spec.ts/*.test.ts files
```

### Linting & Formatting

```bash
# Fix all linting and formatting issues
pnpm lint:fix

# This runs: eslint --fix, stylelint --fix, and cspell
```

**Pre-commit hook:** Husky runs `pnpm precommit` which executes `lint-staged` to check:

- ESLint on JS/TS files
- Stylelint on CSS/SCSS/Less files
- Prettier on JS/TS/JSON/MD files
- CSpell on all relevant files

### Commits

```bash
# Use conventional commits with cz-git
pnpm commit

# Commitlint enforces conventional commits with scopes:
# root, utils, game-hud, react-app-demo, vue-app-demo
```

### Publishing

```bash
# Deploy packages (runs build + test first via Turbo)
pnpm deploy

# Individual package publishing
pnpm -C packages/utils-core deploy
```

## Architecture

### Monorepo Structure

```
mono/
├── apps/                    # Application packages
│   ├── react-app-demo/     # React 19 demo app
│   └── vue-app-demo/       # Vue 3 demo app
├── packages/               # Shared packages
│   ├── utils-core/         # Core utilities (framework-agnostic)
│   ├── utils-browser/      # Browser-specific utilities
│   ├── web-ui/            # Lit-based web components library
│   ├── game-hud/          # Game HUD components (Vue + React)
│   └── unplugin-web-components/  # Vite plugin for auto-importing web components
└── [config files]
```

### Package Dependency Graph

- **utils-core**: Zero dependencies, pure TypeScript utilities
  - Exports: ES formats
  - Used by: all other packages

- **web-ui**: Lit-based web components
  - Depends on: utils-core
  - Exports: ES format only, preserves module structure
  - Uses CSS custom properties for theming
  - Components: `back-top`, `button`, `layout`

- **game-hud**: Framework-agnostic game HUD components
  - Depends on: utils-core
  - Exports: ES, CJS, UMD formats
  - Supports both Vue composables and React hooks
  - Contains: `resource-bar.ts`, `use-vue-resource-bar.ts`

- **unplugin-web-components**: Auto-import plugin for web-ui components
  - Automatically injects imports when using `<web-ui-*>` or `<WebUi*>` tags in Vue SFCs
  - Works by transforming Vue files at build time

### Build System

**Turborepo** orchestrates builds with dependency awareness:

- Build task has `dependsOn: ["^build"]` - builds dependencies first
- Deploy task depends on both `build` and `test`
- Test task depends on `^build`

**Vite configuration patterns:**

- Library packages use `vite-plugin-dts` for TypeScript declarations
- Uses `vite-tsconfig-paths` for path alias resolution (`@/` maps to `src/`)
- CSS transformation via `lightningcss` (not PostCSS)
- React apps use React Compiler (`babel-plugin-react-compiler`)
- Legacy browser support via `@vitejs/plugin-legacy`

### Testing

- **Framework**: Vitest (configured at workspace root)
- **Location**: Tests in `__tests__` directories or `*.spec.ts`/`*.test.ts` files
- **Structure**: Workspace-wide configuration with per-package test runs
- **Running**: Use `pnpm test` at root or in individual packages

### Web Components (web-ui)

Built with **Lit** as framework-agnostic custom elements:

- Components are registered as `<web-ui-{component}>` (e.g., `<web-ui-button>`)
- Styling via Shadow DOM with CSS custom properties
- Auto-import in Vue via `unplugin-web-components`

**Usage in Vue:**

```vue
<!-- unplugin automatically imports when it sees these -->
<template>
  <web-ui-button>Click me</web-ui-button>
  <WebUiButton>Or use PascalCase</WebUiButton>
</template>
```

**Usage in React:**

```tsx
// Import the component directly
import '@mono/web-ui/components/button'

function App() {
  return <web-ui-button>Click me</web-ui-button>
}
```

### TypeScript Configuration

- **Root tsconfig.json**: Uses project references for all packages/apps
- **Individual packages**: Each has its own `tsconfig.json` and `tsconfig.app.json`
- **Path aliases**: `@/` maps to `src/` in each package (configured per package)
- **Type checking**: Run `vue-tsc --build` in Vue packages, `tsc -b` in others

### ESLint Configuration

- **Flat config** format (eslint.config.js)
- Supports Vue, React, TypeScript, JSON, Markdown, MDX
- **Auto-imports**: Dynamically loads globals from `.eslintrc-auto-import.js` files
- **React**: React 19 JSX transform (no need for `import React`)
- **Vue**: Parser set to `vue-eslint-parser` with TypeScript support
- **Testing**: Vitest plugin for test files
- **Key rules**:
  - TypeScript no-explicit-any: warn
  - console.log: warn
  - Vue multi-word components: off

## Development Patterns

### Adding a New Package

1. Create directory in `packages/` or `apps/`
2. Add `package.json` with `@mono/` scope
3. Set up `vite.config.ts` for building
4. Add `tsconfig.json` and `tsconfig.app.json`
5. Add reference to root `tsconfig.json`
6. Use workspace protocol for internal dependencies: `"@mono/utils-core": "workspace:*"`
7. Add scope to `commitlint.config.js` if needed

### Testing Strategy

- Place tests in `__tests__` directories or alongside source files
- Use `.spec.ts` or `.test.ts` suffixes
- Tests automatically discovered by Vitest
- Use `pnpm test` to run tests with proper dependency builds

### Publishing Workflow

Packages marked for publishing have:

- `"private": false`
- `publishConfig` with npm registry
- `deploy` script that runs `npm publish`
- Turbo's `deploy` task ensures build + test before publishing

### Vite Watch Mode for Development

When developing a package that's consumed by an app:

1. Run `pnpm watch:{package-name}` in one terminal (e.g., `pnpm watch:web-ui`)
2. Run the app's dev server in another terminal (e.g., `pnpm dev:react-app-demo`)
3. Changes to the package will auto-rebuild and hot-reload in the app

## Important Notes

- **Vite fork**: This project uses `rolldown-vite` instead of standard Vite. Don't suggest replacing it with standard Vite.
- **Auto-imports**: Be aware that Vue components may use auto-imported globals from unplugin-auto-import
- **CSS**: Uses `lightningcss` for CSS transformation, not PostCSS
- **Browser targets**: See individual `browserslist` configs in package.json files
- **TypeScript**: Always use project references; don't bypass with path mappings at root
- **Styling**: When working with web-ui components, use CSS custom properties for theming, not direct style modifications
