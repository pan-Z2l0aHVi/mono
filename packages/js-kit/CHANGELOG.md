# @greypan/js-kit

## 3.2.0

### Minor Changes

- 7eefb10: Add `rust.andThen(result, next)` for chaining `Result` and `Promise<Result>` values without manual `await` boilerplate at each step.

## 3.1.0

### Minor Changes

- 9787a15: Remove `"./package.json"` from the package `exports` map.

## 3.0.1

### Patch Changes

- 3c81816: Fix `defineControllableInterval` so calling `stop()` from inside the timer callback permanently stops rescheduling.

## 3.0.0

### Major Changes

- d0a9f32: Remove unused public APIs and simplify `safeCall`:
  - Remove `asyncCompose`, the event-emitter plugin, the Go paradigm helper, random utilities, the `./go` subpath export, and the `nanoid` dependency.
  - Change `safeCall(fn, options?)` to accept a zero-argument thunk with an optional `onError` handler.

### Minor Changes

- d0a9f32: Add string and number utilities for file extension detection and human-readable file size formatting.

## 2.0.0

### Major Changes

- 1e52bc4: Replace `defineLoopQueue` (removed without an alias) with `defineQueue` (removes items after `onConsume`) and `defineAckQueue` (removes items after the `onConsume` Promise fulfills). Both require `onConsume` and support optional synchronous `onPersist` snapshots (persist-before-commit, fail-closed on persistence errors) and `onConsumeError` observers.

## 1.6.2

### Patch Changes

- be4008b: Standardize workspace dependency externalization patterns in the package build configuration.

## 1.5.1

### Patch Changes

- 8f4643d: Audit and reorganize package dependencies.

## 1.3.0

### Minor Changes

- 13802c0: Fix runtime bugs and TypeScript type definitions.

## 1.1.0

### Minor Changes

- 4dfde81: Complete package dependency declarations and fix missing dependencies.
