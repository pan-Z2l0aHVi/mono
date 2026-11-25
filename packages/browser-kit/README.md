# @greypan/browser-kit

[![npm version](https://img.shields.io/npm/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![node version](https://img.shields.io/node/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)

> Browser APIs for storage, tracking, environment detection, DOM, files, clipboard, events, and history.

English | [简体中文](./README.CN.md) | [Live demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/browser-kit/getting-started)

## Install

```bash
# npm
npm install @greypan/browser-kit

# pnpm
pnpm add @greypan/browser-kit

# yarn
yarn add @greypan/browser-kit

# bun
bun add @greypan/browser-kit
```

## Quick start

```ts
import { defineLocal } from '@greypan/browser-kit'

const storage = defineLocal('my-app')

storage.set('user', { name: 'Alice' })
storage.get('user') // { name: 'Alice' }

// Expire after one hour
storage.set('token', 'abc123', 3600_000)

// Listen for changes from other tabs
const unwatch = storage.watch('user', (newValue, oldValue) => {
  console.log('user changed', newValue, oldValue)
})
```

## Modules

| Module         | Summary                                                                                                                          | Docs                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Storage        | Namespaced `localStorage` / `sessionStorage` with TTL, quota cleanup, and cross-tab `watch`                                      | [`docs/storage.md`](./docs/storage.md)         |
| Tracker        | Composable telemetry outbox (`defineTracker`, `defineBatchTrack`, `defineOfflineRestore`, `defineLastWords`, `definePageErrors`) | [`docs/tracker.md`](./docs/tracker.md)         |
| Environment    | SSR-safe browser, OS, container, and input detection (`env`)                                                                     | [`docs/env.md`](./docs/env.md)                 |
| DOM            | Viewport size and root scroll helpers (`getViewportSize`, `getRootScrollTop`, `getRootScrollLeft`)                               | [`docs/dom.md`](./docs/dom.md)                 |
| File           | Base64 conversion, image dimensions, magic-number file type checks, and streaming downloads                                      | [`docs/file.md`](./docs/file.md)               |
| Clipboard      | Text and `Blob` clipboard copy helper (`copyToClipboard`)                                                                        | [`docs/copy.md`](./docs/copy.md)               |
| History Nav    | Read-only Navigation API subset for session back/forward availability (`defineHistoryNav`)                                       | [`docs/history-nav.md`](./docs/history-nav.md) |
| Event Shortcut | Strongly-typed `window` / `document` `on` and `off` wrappers                                                                     | [`docs/shortcut.md`](./docs/shortcut.md)       |

> String and number helpers such as `getFileExtension` and `formatFileSize` live in [`@greypan/js-kit`](../js-kit/README.md).
