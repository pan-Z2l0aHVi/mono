# Mono — Architecture Context

## Overview

A pnpm monorepo publishing Lit-based web component UI library (`@greypan/web-ui`) and supporting JS utilities under `@greypan/*` to npm. Includes two private demo apps (React 19 + Vue 3) for development and preview.

## Architectural Principles

- **Plugin over inheritance**: Extensibility through function composition (see `packages/js-kit/src/plugin-system/`), not class hierarchies
- **Shadow DOM encapsulation**: all web components use Shadow DOM. External CSS resets (Tailwind etc.) cannot penetrate component internals — only `:host` and CSS custom properties are exposed
- **Framework-agnostic components**: web components work in React, Vue, and vanilla JS. Framework-specific type wrappers in `packages/web-ui/src/types/`
- **Monorepo discipline**: dependency graph is a DAG — `js-kit` is root leaf, all packages depend `^build`, no circular deps

## Key Decisions

| ADR  | Title                  | Summary                                                                             |
| ---- | ---------------------- | ----------------------------------------------------------------------------------- |
| 0001 | CI Pipeline            | Build + lint + type-check + test via Turborepo. Release via changesets              |
| 0002 | Build Toolchain        | `vite-plus` as unified wrapper over Vite/Rolldown for build/test/lint/format        |
| 0003 | Web Component Strategy | Lit elements in Shadow DOM. `:host` only for `display`. Framework types in `types/` |
| 0004 | Plugin System          | js-kit's `definePlugin` with `use()`/`make()` chain for composable utilities        |

## Package Boundaries

| Package       | Public API             | Owns                                                       |
| ------------- | ---------------------- | ---------------------------------------------------------- |
| `js-kit`      | `@greypan/js-kit`      | Type utilities, plugin system, platform-agnostic helpers   |
| `browser-kit` | `@greypan/browser-kit` | DOM utilities, offline queue, network interception via MSW |
| `test-kit`    | `@greypan/test-kit`    | Vitest + Playwright test infrastructure, MSW composition   |
| `web-ui`      | `@greypan/web-ui`      | Lit web components, framework type wrappers, icons         |
| `tsconfig`    | `@greypan/tsconfig`    | Shared TypeScript profiles (no build step)                 |

## Known Constraints

- All packages are ES modules only (`"type": "module"`)
- Registry uses npmmirror (overridden to official registry in CI)
- `web-ui` bundles no framework code — requires consumers to install `lit` as dependency
- Apps are private, never published to npm
