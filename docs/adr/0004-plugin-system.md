# ADR-0004: Plugin System

- **Date**: 2025-01-01
- **Status**: Accepted

## Context

Utility packages (js-kit, browser-kit, test-kit) need a composable extension mechanism that avoids class inheritance and allows mix-and-match composition of features.

## Decision

Use `definePlugin()` in `packages/js-kit/src/plugin-system/` with a chainable API:

```ts
definePlugin(() => setup)
  .use(pluginA)
  .use(pluginB)
  .make(options)
```

- `definePlugin` creates a plugin definition
- `.use()` composes additional plugins
- `.make()` produces the final configured instance
- Options use `DEFAULT_OPTIONS` + `Required<Options>` pattern

## Consequences

- Plugins are pure functions, easy to test in isolation
- New features are added as plugins, not inherited class methods
- Internal state is captured via closure, not `this`
- API shape is stable: `{ use(), make(), extend() }`
