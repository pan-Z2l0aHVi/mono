# @greypan/doc-demo-kit

## 0.1.0

### Minor Changes

- 32b03c2: Add the demo shell and codeblock controllers so both framework demos consume one implementation instead of parallel hand-written state machines.
  
  `createShellState` is a snapshot/subscribe controller that owns theme appearance/motion and sidebar collapsed/open/width persistence with validation, the `isOwnLayoutEvent` layout-event filter and the `navCollapsed` derivation; the mobile breakpoint judgment stays with the host and is injected via `setMobile`. Persistence goes through `@greypan/browser-kit`'s `local` storage helper (new dependency), with a compatibility read for the React demo's legacy JSON-encoded values. Supporting helpers: `createBrowserLocaleDependencies({ storageKey })` for the locale browser defaults, `createDemoMetaLoader({ modules, generatedDir?, readmeBase? })` for the generated-docs directory contract and README link base, and a `./testing.viewport` export that hosts the shared viewport test helpers.
  
  `NAV_SECTIONS` items now carry `zhName`, and search keywords derive from it; the separate Chinese-names map is gone and `SHELL_NAV_PAGES` (home / getting started / changelog) moves into the kit as the default `pages` argument of `searchNavigation`.
  
  `createCodeblockController` (snapshot/subscribe) owns the codeblock active-node fallback chain, the flavor-switch and collapse scroll-reset invariants, expanded state and copy-feedback wiring; the demo components keep only rendering and event wiring.
- 53fa534: Remove `observeToastTopOffset`, `ToastTopOffsetHandle` and `TOAST_TOP_OFFSET_PROPERTY`. The demo shells used them to write
  the header's bottom edge into `--wui-toast-top-offset`, which pushed every top-anchored toast below the header even though
  the toast containers are already `position: fixed` against the viewport. Both demo shells now keep toasts on the viewport
  edge for every position. `--wui-toast-top-offset` remains a public opt-in token on `@greypan/web-ui` with a default of `0px`.
  
  The toast docs gain a positions example that opens all six positions at once.

### Patch Changes

- f27a2c1: Add house and shopping cart icons for navigation interfaces.
  Update demo copy feedback to replay on activation.
- Updated dependencies [85b5052]
- Updated dependencies [f4e47c9]
  - @greypan/md-to-meta@0.1.0
  - @greypan/browser-kit@3.1.1
