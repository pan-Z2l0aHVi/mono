# ADR-0002: Build Toolchain

- **Date**: 2025-01-01
- **Status**: Accepted

## Context

Multiple packages with different build needs (tsdown for single-entry, Vite lib mode for multi-entry, apps needing full bundling) require a consistent build interface.

## Decision

Use `vite-plus` (`vp`) as the unified build/dev/lint/test/format wrapper:

- **Single-entry packages** (test-kit, unplugin-web-components, deps-reload): `vp pack` (tsdown) → `.mjs` + `.d.mts`
- **Sub-path export packages** (js-kit, browser-kit, web-ui): `vp build` (Vite lib mode + preserveModules + vite-plugin-dts) →`.js` + `.d.ts`
- **React app**: `tsc -b && vp build`
- **Type-checking**: `vue-tsc` for all packages (including non-Vue), `tsc` for React app

## Consequences

- All package scripts delegate to `vp build`/`vp test`/`vp check`/`vp lint`/`vp fmt`
- Workspace deps MUST be externalized (regex preferred) for dev watch mode to work
- CSS nesting in web-ui requires LightningCSS transpilation (configured in `vp build`)
