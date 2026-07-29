# Testing

- **Framework**: Vitest (via `vite-plus`)
- **Run all tests**: `pnpm test`
- **Run one package**: `pnpm --filter @greypan/<name> test` (which runs `vp test run`)
- **Test files**: `*.spec.ts`, `*.test.ts`, `*.spec.tsx`
- **Environment**: Most packages use Node environment. `browser-kit` uses Vitest Browser Mode with Playwright Chromium for real browser testing.
- **`web-ui` test environment**: jsdom, with `packages/web-ui/test-helper.ts` stubbing browser APIs that jsdom does not implement. It stubs `window.scrollTo` and `Element#scrollTo`; component tests assert the public scrolling call, while browser verification covers native scrolling.
- **`web-ui` jsdom contract tests**: Default `*.spec.ts` files run in the independent `jsdom` project and cover host API, attribute/property synchronization, events, rendering, and non-browser DOM semantics. Test utilities must not treat jsdom as an ElementInternals implementation.
- **`web-ui` browser mode**: Only explicit `*.browser.spec.ts` files run in Chromium via `@vitest/browser-playwright` + `playwright`. Use this layer for FormData, ElementInternals, Pointer events, focus, portal, native dialog, and other browser-native behavior that jsdom cannot faithfully implement.
- **`web-ui` reduced-motion browser mode**: `reduced-motion.browser.spec.ts` files run in their own Chromium project with Playwright `reducedMotion: 'reduce'`. Use this layer to verify that transform displacement is removed while opacity-based state feedback remains available.
- **Network mocking**: `browser-kit` uses MSW (Mock Service Worker) via `@greypan/test-kit` for network request interception
- **Test infrastructure**: `@greypan/test-kit` provides composable plugins using js-kit's plugin system:
  - `defineMsw(handlers)` — MSW service worker lifecycle management (start/stop/reset)
  - `defineCapturedRequests()` — request capture and assertion utilities
  - Usage pattern: `defineMsw(handlers).use(defineCapturedRequests()).make()`
- **Browser mode config**: Browser-mode packages need `vite.config.ts` with `browser.provider: playwright()` from `vite-plus/test/browser-playwright`
