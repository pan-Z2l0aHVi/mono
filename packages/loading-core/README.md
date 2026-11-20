# @greypan/loading-core

[![npm version](https://img.shields.io/npm/v/@greypan/loading-core)](https://www.npmjs.com/package/@greypan/loading-core)
[![node version](https://img.shields.io/node/v/@greypan/loading-core)](https://www.npmjs.com/package/@greypan/loading-core)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/loading-core)](https://www.npmjs.com/package/@greypan/loading-core)

> Framework-agnostic loading primitives: progress bar, splash dismissal, chunk recovery, and route announcements.

English | [简体中文](./README.CN.md)

## Install

```bash
pnpm add @greypan/loading-core
```

Import the stylesheet once, then use the controller from any framework:

```ts
import '@greypan/loading-core/progress.css'

import { globalProgress, setupChunkErrorRecovery } from '@greypan/loading-core'

const dispose = setupChunkErrorRecovery({ onNotify: reason => console.info(reason) })
const token = globalProgress.begin()
token.end()
dispose()
```

## Global progress

`globalProgress` is a singleton `GlobalProgressController`.

| Method               | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `begin()`            | Start a task and return a `ProgressToken`.                      |
| `token.end()`        | End the task; idempotent.                                       |
| `isNavigating()`     | Whether any token is active.                                    |
| `forceReset()`       | Abort all tasks and reset to 0 without reaching 100%.           |
| `configure(options)` | Set `delayMs`, `minVisibleMs`, `maxDurationMs`, and `onMetric`. |

The bar waits `delayMs` before appearing, stays at least `minVisibleMs`, and
fades out after reaching 100%. A new navigation during the fade-out window
hides the old bar and restarts the delay. `maxDurationMs` triggers
`progress_failsafe_triggered` and force-resets unfinished work.

## Splash dismissal

`dismissAppSplash(minVisibleMs, onDismiss?)` removes `#app-splash`, calls
`window.__SPLASH_CLEANUP__` once, and subtracts time already spent from
`minVisibleMs` using `performance.now()`.

## Chunk recovery

`setupChunkErrorRecovery(options)` listens for Vite's `vite:preloadError`.
It only calls `event.preventDefault()` when it is about to reload. Offline,
dirty-form, cooldown, storage-failure, and background-prefetch branches leave
the default behavior alone so the lazy loader can clear its cache and render an
error state.

## Route announcements

`announceRouteChange(title)` writes the current route title into a polite
`aria-live` region after the next animation frame.

## CSS

`@greypan/loading-core/progress.css` is a static file in `dist`. It is not
injected from JavaScript, so strict CSP configurations can import it through
their normal stylesheet pipeline.
