# @greypan/browser-kit

## 3.1.2

### Patch Changes

- f966cdc: Remove the unused `remeda` dependency.

## 3.1.1

### Patch Changes

- Updated dependencies [7eefb10]
  - @greypan/js-kit@3.2.0

## 3.1.0

### Minor Changes

- 9787a15: Remove `"./package.json"` from the package `exports` map.

### Patch Changes

- 8cb3f56: Release offline, page-exit, and page-error listeners through a composable, idempotent tracker `stop()` method.
- Updated dependencies [9787a15]
  - @greypan/js-kit@3.1.0

## 3.0.1

### Patch Changes

- Updated dependencies [3c81816]
  - @greypan/js-kit@3.0.1

## 3.0.0

### Major Changes

- d0a9f32: Clean up duplicated and transport-specific public utilities:
  - Rename `maxBeaconSize` to `maxBatchKB`.
  - Remove `sleep`, `sleepSync`, and `defer`.
  - Move `getFileExtension` and `formatFileSize` to `@greypan/js-kit`.

### Minor Changes

- d0a9f32: Expose narrow tracker capability interfaces (`TrackCapability`, `FlushCapability`, and `PauseCapability`) so plugins depend only on the tracker methods they use.
- d0a9f32: Add a `definePageErrors()` plugin to the Tracker that collects uncaught errors and unhandled promise rejections with error-count limits, signature deduplication, and message/stack truncation.

### Patch Changes

- Updated dependencies [d0a9f32]
  - @greypan/js-kit@3.0.0

## 2.2.0

### Minor Changes

- c310d9f: Add the `transport` option to `defineTracker` for custom single-entry delivery functions `(item: object) => Promise<void> | void` replacing the default `sendBeacon()` / `fetch(keepalive)` adapter.

## 2.1.0

### Minor Changes

- ab8dfb7: Add the `history-nav` module (`defineHistoryNav`) to track real browser history navigation (`canGoBack`, `canGoForward`, `currentEntry`, `entries()`, `currententrychange`) with `sessionStorage` persistence and an idempotent `dispose()` hook.

## 2.0.0

### Major Changes

- 1e52bc4: Overhaul Tracker persistence and retry behavior: preserve duplicate event payloads independently, serialize normal delivery, retain failed events until `resume()`, reconnect, or next initialization, and avoid flushing restored `localStorage` entries while offline on startup. The `localStorage` persistence adapter degrades best-effort to memory-only when storage is unavailable, and `persistenceKey` defaults to the current URL.

### Patch Changes

- Updated dependencies [1e52bc4]
  - @greypan/js-kit@2.0.0

## 1.7.6

### Patch Changes

- 32d3366: Stabilize browser tracker tests under MSW request interception.

## 1.7.2

### Patch Changes

- be4008b: Move `msw` from `peerDependencies` to `devDependencies` and standardize workspace dependency externalization.
- Updated dependencies [be4008b]
  - @greypan/js-kit@1.6.2

## 1.6.1

### Patch Changes

- 8f4643d: Audit and reorganize package dependencies.
- Updated dependencies [8f4643d]
  - @greypan/js-kit@1.5.1

## 1.5.0

### Minor Changes

- 874638d: Refactor the tracker and storage modules.

## 1.4.0

### Minor Changes

- 13802c0: Fix runtime bugs and TypeScript type definitions.
- Updated dependencies [13802c0]
  - @greypan/js-kit@1.3.0

## 1.2.0

### Minor Changes

- 4dfde81: Complete package dependency declarations and fix missing dependencies.

### Patch Changes

- Updated dependencies [4dfde81]
  - @greypan/js-kit@1.1.0

## 1.1.0

### Minor Changes

- Add `getViewportSize` to read the current viewport dimensions.
