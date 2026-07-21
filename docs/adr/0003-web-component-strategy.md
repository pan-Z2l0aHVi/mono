# ADR-0003: Web Component Strategy

- **Date**: 2025-01-01
- **Status**: Accepted
- **Supersedes**: N/A

## Context

The `@greypan/web-ui` component library needs to work across React, Vue, and vanilla JS without duplication. Each framework has different JSX type systems and template compilers.

## Decision

- Build components as **Lit custom elements with Shadow DOM**
- `:host` CSS selector limited to `display` and `contain` only — all other styles inside shadow root
- **Framework type wrappers** in `packages/web-ui/src/types/vue.ts` and `react.ts` for Volar/TSX completion
- Components use `declare global { interface HTMLElementTagNameMap }` for global HTML type augmentation
- Expose `$events` interface on each component for framework-level event type extraction

## Consequences

- Single implementation serves all frameworks
- External CSS resets (Tailwind) cannot penetrate Shadow DOM — only `:host` properties are vulnerable
- Framework consumers must import `@greypan/web-ui/types/vue` or `@greypan/web-ui/types/react` for JSX types
- New components require updates to both type helper files
