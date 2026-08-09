# Mono — Architecture Context

## Overview

A pnpm monorepo publishing Lit-based web component UI library (`@greypan/web-ui`) and supporting JS utilities under `@greypan/*` to npm. Includes two private demo apps (React 19 + Vue 3) for development and preview.

## Architectural Principles

- **Plugin over inheritance**: Extensibility through function composition (see `packages/js-kit/src/plugin-system/`), not class hierarchies
- **Shadow DOM encapsulation**: all web components use Shadow DOM. External CSS resets (Tailwind etc.) cannot penetrate component internals — only `:host` and CSS custom properties are exposed
- **Framework-agnostic components**: web components work in React, Vue, and vanilla JS. Framework-specific type wrappers in `packages/web-ui/src/types/`
- **Monorepo discipline**: dependency graph is a DAG — `js-kit` is root leaf, all packages depend `^build`, no circular deps

## Key Decisions

| ADR  | Title                       | Summary                                                                                       |
| ---- | --------------------------- | --------------------------------------------------------------------------------------------- |
| 0001 | CI Pipeline                 | Build + lint + type-check + test via Turborepo. Release via changesets                        |
| 0002 | Build Toolchain             | `vite-plus` as unified wrapper over Vite/Rolldown for build/test/lint/format                  |
| 0003 | Web Component Strategy      | Lit elements in Shadow DOM. `:host` only for `display`. Framework types in `types/`           |
| 0004 | Plugin System               | js-kit's `definePlugin` with `use()`/`make()` chain for composable utilities                  |
| 0005 | Overlay Interaction Policy  | Click-outside, focus-out, keyboard Escape, and child-parent event coordination                |
| 0006 | Layout Layering             | Local overlay stacking in layout, portal overlay z-index scale                                |
| 0007 | Web UI Contract Convergence | Unified Pointer Events, standard event model, form-associated controls, public contract tests |
| 0008 | Icon System                 | Build-time Iconify data modules; no runtime icon component or lookup                          |
| 0009 | Release Planes              | Shared version PR with independent npm and desktop delivery                                   |
| 0010 | Design Token Restructure    | Reorganize duration/easing/scale tokens into semantic names; breaking change for consumers    |

## Package Boundaries

| Package       | Public API             | Owns                                                       |
| ------------- | ---------------------- | ---------------------------------------------------------- |
| `js-kit`      | `@greypan/js-kit`      | Type utilities, plugin system, platform-agnostic helpers   |
| `browser-kit` | `@greypan/browser-kit` | DOM utilities, offline queue, network interception via MSW |
| `test-kit`    | `@greypan/test-kit`    | Vitest + Playwright test infrastructure, MSW composition   |
| `web-ui`      | `@greypan/web-ui`      | Lit web components, framework type wrappers, icons         |
| `tsconfig`    | `@greypan/tsconfig`    | Shared TypeScript profiles (no build step)                 |

## Web UI Language

**Theme Appearance**:
The explicit user preference controlling a `web-ui-theme` scope: `light`, `dark`, or `system`. Applications may persist this preference and must fall back to `light` when a stored value is absent or invalid.

**Lock Scroll**:
An overlay policy that prevents background document scrolling while an overlay is open. It does not imply modal accessibility semantics.
_Avoid_: Modal

**Modal Overlay**:
An overlay that prevents background interaction and manages focus as a modal dialog. It is distinct from Lock Scroll.

**Overlay Focus Model**:
The component-specific rule defining where focus moves when an overlay opens and closes.

**Layout Layer**:
The `web-ui-layout` stacking relationship between its sibling regions. Base content and sidebar remain below the sticky header so non-portal header overlays retain pointer interaction when they overflow their grid area.
_Avoid_: Global z-index scale, overlay layer

**Portal Overlay**:
An overlay mounted in the nearest theme overlay root or an explicit overlay container. Select, Popover, and Tooltip become menu-layer portal overlays only when their `portal` property is enabled.
_Avoid_: Local overlay

**Application Auxiliary Layer**:
Persistent fixed application affordances, such as BackTop, positioned above base content but below portal menus.
_Avoid_: Overlay, modal

**Public Component Contract**:
The stable, documented surface of a component: props, default values, allowed values, slots, methods, events, accessibility semantics, and form behavior. Implementation details (shadow DOM structure, CSS classes, private state) are not part of the contract. Tests verify the contract, not the implementation.

**React Custom-element Binding**:
The React-side mapping from a `web-ui` public component contract to JSX: JavaScript properties use their camel-cased names, while custom events use their exact dispatched event names. It is distinct from the framework type wrapper.
_Avoid_: React event normalization

**Pointer Interaction**:
Component interaction using Pointer Events (pointerenter, pointerleave, pointerdown, pointermove, pointerup, pointercancel) instead of mouse-specific events. Ensures consistent behavior across mouse, touch, and pen input. Contextmenu retains its own semantic event. Click remains the event for external-click-to-close detection.

**Form-associated Control**:
A custom element with `static formAssociated = true` that integrates with the native HTML form lifecycle: submits values via `FormData`, responds to `formResetCallback()` and `formDisabledCallback()`, and manages constraints through `ElementInternals`.

## Known Constraints

- All packages are ES modules only (`"type": "module"`)
- Registry uses npmmirror (overridden to official registry in CI)
- `web-ui` bundles no framework code — requires consumers to install `lit` as dependency
- Apps are private, never published to npm

## Deployment Language

**Deployable Demo**:
A private History-routing SPA included in the shared GitHub Pages artifact and exposed at its own path. All deployable demos are published together so one deployment cannot remove another demo, and each restores a deep link after a direct request or refresh.
_Avoid_: Independently deployed app, standalone Pages site

**Version PR**:
A Changesets-generated pull request that records approved version changes across the monorepo. It is release intent, not an npm or desktop release itself.
_Avoid_: Release, publish PR

**npm Package Release**:
Publication of versioned public packages to the npm registry.
_Avoid_: Application release, desktop release

**Desktop Application Release**:
Publication of a versioned Wails installer set through a GitHub Release. It is distinct from npm package publication.
_Avoid_: npm release, package publish

**Release Plane**:
An independently executable delivery path for either public npm packages or the desktop application. Release planes share a Version PR but may complete or be retried independently.
_Avoid_: Release stage, release order

**Release Authorization**:
The rule that a Version PR merge is the sole authority for a formal release. Manual runs may validate artifacts but never publish them.
_Avoid_: Manual release, ad hoc publish

**Protected Main**:
The branch policy that admits product changes through pull requests rather than direct pushes. It makes pull-request validation the authoritative pre-merge check.
_Avoid_: Writable main, direct release branch

**Release Recovery**:
The policy that preserves a successful release plane when its peer fails, then retries only the failed plane. It does not attempt cross-registry rollback.
_Avoid_: Atomic release, cross-plane rollback
