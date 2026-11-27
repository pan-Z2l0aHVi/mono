# @greypan/doc-demo-kit

## 0.2.0

### Minor Changes

- 66e6c29: Add configurable code-fence flavors with built-in TS/JS pairs for the dev-kit documentation site, propagate fence metadata through generated meta so hosts can bind demos with `demo=<id>`, and release `web-ui-collapse` peek masks and glow pseudo-elements after an expansion settles open.

### Patch Changes

- fca2c6f: Export `findComponentRoute` and `ComponentRouteEntry` from `nav.ts` to drive dynamic component routes in the React and Vue demos.
- fca2c6f: Add `createSearchController` (backed by an internal `expanding-field` controller) to unify demo search state, keyboard navigation, and focus/outside-click behavior across React and Vue demos.
- a050c3c: Preload route example docs and cache resolved demo modules before navigation commits so route demos can mount synchronously. Soften the light-mode `--wui-shadow-glass` token so `.wui-glass` surfaces cast a subtler outer shadow. Render Interweave dialog list tooltips through a portal so adjacent rows no longer clip or occlude them.
- Updated dependencies [66e6c29]
- Updated dependencies [f33e21a]
  - @greypan/md-to-meta@0.2.0
  - @greypan/browser-kit@3.1.2

## 0.1.3

### Patch Changes

- c04b96d: The demo sidebar nav items switch their background instantly between hover, pressed and selected states. `NAV_ITEM_CLASS` no longer carries a `transition`, so the active highlight lands on click without a fading trail.
  
  The copy feedback of the shared codeblock controller now survives React StrictMode's setup → cleanup → setup cycle: `dispose()` only cancels the pending idle timer instead of detaching every listener, so a copy keeps publishing its success state after the simulated remount.

## 0.1.2

### Patch Changes

- 57f4091: Add a neutral control shade token and use subtly blue gray interaction states for light navigation and secondary buttons.
- 57f4091: Drop `COPY_FEEDBACK_DURATION`, which lost its last consumer when the demo copy feedback moved to `PressDrawIcon`, and align the availability docs with what `ApplyFileAvailability` actually does on every `available=true` call. `TestRecoveryCancelled` now cancels after the walk starts and asserts `context.Canceled`, so it covers the interruption path that `ServiceShutdown` relies on.

## 0.1.1

### Patch Changes

- fe802db: Use the CodeX check icon for checkboxes, support configurable selection control sizes, and respect reduced motion in application navigation and demo interactions.
- Updated dependencies [f966cdc]
  - @greypan/browser-kit@3.1.2

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
