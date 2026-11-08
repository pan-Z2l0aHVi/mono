---
'@greypan/doc-demo-kit': minor
---

Add the demo shell and codeblock controllers so both framework demos consume one implementation instead of parallel hand-written state machines.

`createShellState` is a snapshot/subscribe controller that owns theme appearance/motion and sidebar collapsed/open/width persistence with validation, the `isOwnLayoutEvent` layout-event filter and the `navCollapsed` derivation; the mobile breakpoint judgment stays with the host and is injected via `setMobile`. Persistence goes through `@greypan/browser-kit`'s `local` storage helper (new dependency), with a compatibility read for the React demo's legacy JSON-encoded values. Supporting helpers: `createBrowserLocaleDependencies({ storageKey })` for the locale browser defaults, `createDemoMetaLoader({ modules, generatedDir?, readmeBase? })` for the generated-docs directory contract and README link base, and a `./testing.viewport` export that hosts the shared viewport test helpers.

`NAV_SECTIONS` items now carry `zhName`, and search keywords derive from it; the separate Chinese-names map is gone and `SHELL_NAV_PAGES` (home / getting started / changelog) moves into the kit as the default `pages` argument of `searchNavigation`.

`createCodeblockController` (snapshot/subscribe) owns the codeblock active-node fallback chain, the flavor-switch and collapse scroll-reset invariants, expanded state and copy-feedback wiring; the demo components keep only rendering and event wiring.
