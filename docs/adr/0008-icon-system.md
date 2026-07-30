# ADR 0008: Build-Time Icon System

## Status

Accepted

## Context

`web-ui` needs built-in and consumer-facing icons without a runtime icon web component, CDN dependency, or a runtime name lookup that weakens tree shaking.

## Decision

Generate typed icon data modules at build time from Iconify JSON packages.

- `packages/web-ui/icons.used.json` is the manifest of built-in icons.
- `pnpm --filter @greypan/web-ui generate-icons` generates one module per icon under `src/icons/generated/` and the icon barrel.
- The Vite build runs generation automatically. Generated files are not edited manually.
- Internal components import icon data from `@/icons`; consumers import it from `@greypan/web-ui/icons` and pass it through the property-only `.icon` API of `<web-ui-icon>`.
- Icon names and generated file names retain the Iconify set prefix to avoid collisions.

The implementation workflow is documented in [`docs/agents/web-ui.md`](../agents/web-ui.md).

## Consequences

- Icons are typed, tree-shakable modules with no runtime lookup dependency.
- Adding a built-in icon requires updating the manifest and regenerating outputs.
- `iconify-icon` is not a runtime dependency of `web-ui`.
