# Testing

- **Framework**: Vitest (via `vite-plus`)
- **Run all tests**: `pnpm test`
- **Run one package**: `pnpm --filter @greypan/<name> test` (which runs `vp test run`)
- **Test files**: `*.spec.ts`, `*.test.ts`, `*.spec.tsx`
- **Environment**: Most packages use Node environment. `browser-kit` uses Vitest Browser Mode with Playwright Chromium for real browser testing.
- **Network mocking**: `browser-kit` uses MSW (Mock Service Worker) via `@greypan/test-kit` for network request interception
- **Test infrastructure**: `@greypan/test-kit` provides composable plugins using js-kit's plugin system:
  - `defineMsw(handlers)` — MSW service worker lifecycle management (start/stop/reset)
  - `defineCapturedRequests()` — request capture and assertion utilities
  - Usage pattern: `defineMsw(handlers).use(defineCapturedRequests()).make()`
- **Browser mode config**: Browser-mode packages need `vite.config.ts` with `browser.provider: playwright()` from `vite-plus/test/browser-playwright`
