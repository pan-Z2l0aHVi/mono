# @greypan/web-ui

## 6.1.0

### Minor Changes

- d0a9f32: Expand drawer draggable drag zone and bar, and expose their sizes as public tokens.
  
  - Drag hit zone grows from 24px to 32px; the drag bar capsule grows from 4×48px to 4×56px and is centered 10px from the drawer's inner edge, for all four placements (`right` / `left` / `top` / `bottom`).
  - New public tokens: `--wui-drawer-drag-zone-size` (default `32px`), `--wui-drawer-drag-bar-thickness` (default `4px`), `--wui-drawer-drag-bar-length` (default `56px`). The hit zone and visual bar position are independent so a wider zone does not move the capsule into drawer content.
  - Drawer inset, close threshold, controlled write-back and reduced-motion behavior are unchanged.
- d0a9f32: Align observable token fallbacks with the theme definitions.
  
  These fallbacks are observable when host theme variables are absent, so the value changes ship separately from the internal consolidation patch:
  
  - Dialog backdrop: `rgb(0 0 0 / 0.1)` → `rgb(0 0 0 / 0.12)`
  - Dialog surface overlay: `rgb(246 246 246 / 0.88)` → `rgb(246 246 246 / 0.82)`
  - Text tertiary (input/textarea clear color): `rgb(27 27 27 / 0.35)` → `color-mix(in srgb, var(--wui-color-text) 35%, transparent)`
  - Glass border: `rgb(51 51 51 / 0.12)` → `transparent`
  - Glass shade: `rgb(0 0 0 / 0.2)` → `rgb(0 0 0 / 0.06)`
- d0a9f32: Remove the invalid `./icons/*` subpath export.
  
  The `./icons/*` targets never existed in `dist/`, so there was no resolvable import path and no working consumer could depend on it. It still ships as minor because contract-diff classifies any export removal as a breaking candidate, and the semver decision for a removal must be carried by this file rather than by the internal-consolidation patch changeset.
- d0a9f32: Add semantic radius tokens `--wui-radius-control` (pill), `--wui-radius-menu` (18px) and `--wui-radius-overlay` (28px) to `<web-ui-theme>`; migrate control/menu/overlay components to them. `--wui-drawer-radius` and `--wui-layout-sidebar-radius` now default to `--wui-radius-overlay` (sidebar default 24px → 28px; dialog 32px → 28px; menu panels, textarea and toast 20px → 18px). Non-pill glass surfaces drive `--wui-glass-corner-radius` from their semantic radius so border lighting follows token overrides; pill controls keep a finite physical-size-derived corner. Checkbox, avatar square and empty icon shapes stay component-internal (6/12/16px).

### Patch Changes

- d0a9f32: Fix focus ring transitions for input, textarea, autocomplete and input-number. The ring now animates consistently in normal and borderless variants on a dedicated pseudo-element layer.
- d0a9f32: Consolidate shared component architecture and align semantic defaults.
  
  - Extract menu behavior, combobox lifecycle, open-change dispatch and form-association helpers.
  - Clean up portal nodes when hosts are removed and centralize floating placements.
  
  Observable token fallback alignment and the invalid `./icons/*` export removal are tracked in separate minor changesets.
- Updated dependencies [d0a9f32]
- Updated dependencies [d0a9f32]
- Updated dependencies [d0a9f32]
- Updated dependencies [d0a9f32]
- Updated dependencies [d0a9f32]
  - @greypan/browser-kit@3.0.0
  - @greypan/js-kit@3.0.0

## 6.0.0

### Major Changes

- c310d9f: style(web-ui): unify sidebar overlay token
  
  - Remove `--wui-layout-sidebar-bg`; layout sidebars use `--wui-color-surface-overlay`.
  - Set the dark overlay surface to `rgb(32 34 34 / 0.9)`, compositing to about `#202223` over the page background.

### Minor Changes

- c310d9f: Add `--wui-drawer-inset` token to control drawer floating-card viewport inset.
  
  - New public token `--wui-drawer-inset` (default `8px`, non-headless drawers). Set to `0` for edge-to-edge geometry, typically paired with `--wui-drawer-radius: 0`.
  - The token is registered via `@property` as `<length>`, so a unitless `0` from consumers is normalized to `0px` instead of silently breaking the closed-state `calc(100% + 0)` transform (exit animation would be dropped).
  - ADR-0036 updated: the inset is no longer a hard-coded internal value; all other floating-card behavior (drag-close distance math, controlled hover end-state) reads the same variable and follows the token automatically.
- c310d9f: Add Layout desktop sidebar drag-to-resize and Drawer drag-to-close features.
  
  **Layout (`<web-ui-layout>`):**
  
  - New props: `sidebar-resizable`, `sidebar-min-width`, `sidebar-max-width`
  - New event: `sidebar-width-change`
  - Accent resize handle on right edge (hidden when collapsed); keyboard-operable (WAI-ARIA splitter: arrows step, Home/End to bounds, Enter commits, Escape reverts)
  - Real-time width follow with clamping; emits on release
  - Built-in hard cap: the sidebar can never exceed half the viewport width, even if `sidebar-max-width` is configured higher
  
  **Drawer (`<web-ui-drawer>`):**
  
  - New prop: `draggable` (default `false`)
  - Gray capsule drag bar on inner edge (placement-aware)
  - Real-time follow + spring snap on release
  - Closes when displacement > 1/3 of size OR flick > 500px/s; otherwise rebounds
  - Native dialog renders nothing when closed ⇒ drag-to-open NOT supported
  - Spring via WAAPI (no new `--wui-*` tokens)
  - `prefers-reduced-motion` snaps instantly
  - `controlled` mode: user close actions only emit `open-change(false)` with writeback await + timeout rebound
  - Declarative nested drawer stacking: open drawers below the top layer automatically scale down (0.95^depth) and shift towards the inner side to expose card edges; Escape and backdrop clicks dismiss only the topmost layer
  
  **Drawer visual language (breaking visual, no API change):**
  
  - Non-headless drawers now render as floating rounded cards inset 8px from all viewport edges (see ADR-0036); elastic drag distances read as margin changes instead of gaps
  - New token `--wui-drawer-radius` (default `28px`); closed-state transforms compensate the inset so the drawer always exits the viewport fully
  - `headless` geometry unchanged (consumer-owned visuals)
  
  **Glass variable isolation (bug fix):**
  
  - `.wui-glass` now declares its own `--wui-internal-glass-shadow` / `--wui-internal-glass-focus-ring` defaults, cutting the flattened-tree inheritance path from ancestor glass containers (drawer/dialog bodies, overlay panels) into slotted content. Previously a glass-variant button or input inside a drawer/dialog silently picked up the huge overlay shadow instead of the soft glass fallback.
  - Headless drawers explicitly zero `--wui-internal-drawer-inset` on their dialog: a headless drawer nested inside a non-headless one used to inherit the 8px inset, breaking the drag-close distance / controlled hover end-state math for edge-to-edge geometry.
  - **Breaking visual:** `<web-ui-back-top>`'s default glass button now uses the glass fallback shadow (`--wui-shadow-glass`) instead of the small panel shadow (`--wui-shadow-panel`). The old `:host`-level `--wui-internal-glass-shadow` config could no longer reach the inner glass element under the new isolation and was removed; pass `--wui-shadow-glass` on the element if the previous look is required.
  
  **Controlled mode rename (was `request-only`) + dialog support:**
  
  - `web-ui-drawer`: prop `request-only` (attribute) / `requestOnly` (property) is renamed to `controlled` / `controlled` (same semantics — user close actions only emit `open-change(false)`; the consumer writes `open` back; programmatic `show()`/`close()` stay direct). No alias is kept.
  - `web-ui-dialog`: new `controlled` prop with the same contract (Escape and backdrop only request; native dialog closure while controlled is restored to the open state and re-emits the request).
  
  **Switch, Segmented & Slider Gesture Enhancements (`<web-ui-switch>`, `<web-ui-segmented>`, `<web-ui-slider>`):**
  
  - `Switch`: Full-track draggable gesture with real-time capsule glass thumb following, 6px intent deadzone against vertical scrolling, `scale(1.2)` press/drag micro-interaction, toggle commit on >50% travel (12px total travel) or flick velocity (>300px/s), with instant tap toggling preserved.
  - `Segmented`: Active indicator smooth drag tracking (initiated by pressing on the currently active trigger), `scale(1.2)` press/drag micro-interaction with glass visual, snap to nearest non-disabled trigger on release, and flick gesture support.
  - `Slider`: Refactored internal pointer handling to adopt unified `shared/gesture/` (`attachDragGesture` + `clamp`), with `scale(1.2)` drag micro-interaction and translucent glass thumb when dragging.
  - `Gesture Utilities`: Added `snapToNearest` and `normalizeProgress` helper functions in `packages/web-ui/src/shared/gesture/physics.ts`.
- c310d9f: feat(autocomplete): add allow-custom-value for explicit custom value commits
- c310d9f: feat(autocomplete): add empty state slot
- c310d9f: feat(web-ui): redefine borderless inputs as ghost form with normal-variant focus ring
  
  - `borderless` on input, textarea, and autocomplete now removes only surface decoration (border, glass background/blur, shadow, and glass outline ring) while keeping padding, height metrics, and the focus ring.
  - The borderless focus ring is the same double box-shadow as the normal variant (1px inset accent + focus-ring halo, 200ms transition) and shows on mouse and programmatic focus as well as keyboard focus; the previous `:focus-visible`-gated outline is removed.
  - Compatibility note: consumers that suppressed the focus ring with `[--wui-color-focus-ring:transparent]` now only hide the outer halo — the 1px inset accent line remains visible on focus.
- c310d9f: Redesign collapse as a single element with two slots: trigger via the default slot, content via `slot="content"`. The `web-ui-collapse-trigger` and `web-ui-collapse-content` elements are removed before first release.
  
  - Interaction semantics come from the slotted trigger element (native `<button>`, `<web-ui-button>`, etc.); the collapse writes `aria-expanded`/`aria-controls`/`aria-disabled` onto the first assigned trigger element. A plain-text trigger has no keyboard/focus semantics (documented limitation).
  - Strictly controlled `open` contract unchanged: `open-change` (`CustomEvent<{ open: boolean }>`) fires only on user-originated toggles; `show()`/`close()`/`toggle()` and programmatic writes never emit.
  - Height/width animation via CSS grid `0fr ↔ 1fr` transition — content-adaptive, zero JS measurement, interruptible (grid-transition selection carried over from ADR-0038; superseded by ADR-0039 for the API shape). `horizontal` switches the axis (default vertical).
  - Three-state closed semantics; consumer light DOM is never moved: default closed state sets `hidden` on the internal content container, `keep-mounted` (now on the root element) keeps content measurable inside the collapsed track with `inert` (scroll position preserved).
  - Headless kernel: the component carries no visual styling beyond the animation structure; trigger and content typography come from the consumer (new ADR-0039).
  - Unchanged tokens `--wui-duration-collapse-enter: 200ms` / `--wui-duration-collapse-exit: 160ms`, included in the reduced-motion zeroing lists.
- c310d9f: feat(overlay): support dropdown size variables in portal and keep borderless keyboard focus rings
  
  - Portal panels now mirror `--wui-overlay-min-width`, `--wui-autocomplete-max-width`/`--wui-autocomplete-max-height` and `--wui-select-max-width`/`--wui-select-max-height` from the host at portal creation.
  - Select/Autocomplete dropdown default scroll max-height reduced from 320px to 200px; override via `--wui-autocomplete-max-height` / `--wui-select-max-height`.
  - Borderless `input`, `textarea` and `autocomplete` keep a keyboard focus ring via `:focus-visible`; pointer focus stays borderless.
- c310d9f: feat(layout): add mobile toggle inset variable and glass variant
  
  - The mobile header toggle renders as a glass button and gains an 8px left inset by default, so it no longer sits flush against the viewport edge.
  - Consumers can align the toggle with their own header padding via `--wui-layout-mobile-toggle-inset`.

### Patch Changes

- c310d9f: fix(autocomplete): anchor non-portal panel to its inner wrapper so it stays aligned inside positioned ancestors
- c310d9f: fix(web-ui): preserve grouped button colors and refine dark surface hierarchy
  
  - Preserve the danger variant and consumer `--wui-button-color` overrides inside groups.
  - Refine dark page, text, control, overlay, and menu surface hierarchy.
  - Add a lightweight glass border ring using `--wui-color-glass-border`; make light mode transparent and dark mode subtler.
- c310d9f: fix(web-ui): align control baseline to 36px
  
  - Move the shared `--wui-control-size` baseline from 40px to 36px across buttons, inputs, selects, autocomplete, textarea, segmented, and related demos/docs.
  - Reduce switch track/thumb to 40x20/16x16 and adjust drag travel constants.
  - Set slider thumb to 30x20, align segmented/textarea geometry, and keep marks consistent across axes.
- c310d9f: fix(web-ui): replace icon button content while loading
  
  - Render only the loading spinner when `icon` and `loading` are set.
  - Keep the default slot icon unprojected while loading and restore projection when `loading` returns to `false`.
- c310d9f: fix(web-ui): darken primary and secondary state colors
  
  - Derive primary and secondary hover/active backgrounds toward black.
  - Preserve the existing tonal danger state ramp.
- c310d9f: fix(web-ui): align cursor behavior with Tailwind v4 and gesture states
  
  - Use default cursors for action, selection, and gesture-control hover and pressed states.
  - Switch slider, switch, and segmented cursors to grabbing only after dragging starts.
  - Align slider with switch and segmented gesture intent thresholds.
  - Propagate segmented gesture cursors through the trigger shadow boundary.
- c310d9f: style(web-ui): refine dark glass controls
  
  - Remove the glass background gradient highlight.
  - Add `--wui-glass-brightness` and lower dark backdrop brightness to `1.02`.
  - Deepen the dark page background.
  - Make the dark overlay shadow slightly more visible.
  - Align the select trigger with the button glass border.
- c310d9f: fix(dialog): ignore cancel events bubbled from child controls such as file inputs
- c310d9f: Fix drawer drag rebound firing twice on release below the close threshold.
  
  - The rebound spring's WAAPI animation now uses `fill: 'both'`. Without it, the animation stopped applying at its end while the inline drag transform was still present: any frame rendered between the animation's finish and the `onfinish` cleanup (main-thread congestion, compositor scheduling) painted a jump back to the drag position, and the subsequent inline-style cleanup then triggered the 280ms CSS enter transition from that position — visible as a second rebound.
  - `_springToClose()` gets the same `fill: 'both'` for the symmetric window (spring end → close pipeline takeover), keeping both gesture springs consistent.
  - Regression tests assert exactly one `animate()` call per gesture (pointerup and pointercancel) with `fill: 'both'`, and that the final close offset settles below 0.5px with no remaining animations.
- c310d9f: fix(web-ui): make hover/active background feedback instant
  
  - Remove background-color transitions driven by :hover/:active from button, select, input-number, segmented-trigger, option, dropdown-item, and drawer drag bar.
  - Keep transitions for checked/pressed/focus states and overlay enter/exit animations unchanged.
- c310d9f: fix(overlay): avoid reopening autocomplete and tooltip from pointer-initiated focus restoration
- c310d9f: fix(web-ui): resolve overlays inside an open native dialog into that dialog
  
  - Keep dropdown, context-menu, popover, tooltip, select and autocomplete panels above drawer or dialog content by joining the browser top layer.
  - Bundle menu panel styles so panels render correctly when the dialog has no pre-injected overlay styles.
  - Position context menus with a Floating UI virtual anchor so transformed dialog containing blocks keep viewport coordinates.
  - Preserve fixed menu positioning when a global glass rule would otherwise reset it to relative.
- c310d9f: fix(web-ui): resolve nested portal overlays inside dialogs and support live framework rendering in open panels
  
  - Portal container resolution now crosses shadow boundaries when walking up from the anchor, so a portal overlay hosted inside migrated panel content (e.g. a tooltip inside an open portal select/popover) resolves into an enclosing open native dialog's top layer instead of falling back to the document-level overlay root where it would be hidden behind the dialog.
  - Portal panels now support live framework rendering while open (Vue `v-if`, Lit child-part conditionals, React children inside a stable wrapper): content added to the host while the panel is open migrates into the panel automatically in template order (popover, tooltip, dropdown; select/autocomplete already reconciled via their option portal). Framework comment anchors stay in the host so subsequent patches keep working; markers removed by a framework's clear logic (lit-html `_$clear` walks host marker neighborhoods) are recognized as framework deletion and the stranded panel content is dropped instead of resurrecting on close. Boundary: splicing or reordering a keyed `v-for` list while a panel is open is unsupported — Vue's keyed children diff resolves anchors against migrated nodes and items can be lost, regardless of compilation path. Apply such updates while the panel is closed and stick to tail appends/removals while open. React removals of bare conditional children remain unsupported (see README); the stable wrapper pattern keeps React additions and removals working while open.
  - Popover and tooltip portal panels untrack nodes that the framework physically removes while the overlay is open, so closing no longer restores deleted nodes back into the host light DOM. As a portal-level invariant, the conditional placeholder comment the framework inserts into the panel content during that same removal (Vue's block patch re-derives its container from the removed node's actual parent) is returned to the host at the removed node's skeleton position — covering popover, tooltip, and the select/autocomplete option content inside nested panel containers — so container-level `v-if` content now survives any open → close → reopen cycle instead of being inserted into the disposed panel on reopen.
  - Portal content is restored to its recorded original position (parent + following sibling) instead of being appended to the host, keeping framework fragment anchors intact for subsequent conditional rendering.
  - Compatibility note: React-conditional children inside portal panel content remain unsupported for removal (React deletes nodes through its recorded insertion parent); see the React section of the README.
- Updated dependencies [c310d9f]
  - @greypan/browser-kit@2.2.0

## 5.0.0

### Major Changes

- ab8dfb7: style(web-ui): unify sidebar overlay token
  
  - Remove `--wui-layout-sidebar-bg`; layout sidebars use `--wui-color-surface-overlay`.
  - Set the dark overlay surface to `rgb(32 34 34 / 0.9)`, compositing to about `#202223` over the page background.

### Minor Changes

- ab8dfb7: Add `--wui-drawer-inset` token to control drawer floating-card viewport inset.
  
  - New public token `--wui-drawer-inset` (default `8px`, non-headless drawers). Set to `0` for edge-to-edge geometry, typically paired with `--wui-drawer-radius: 0`.
  - The token is registered via `@property` as `<length>`, so a unitless `0` from consumers is normalized to `0px` instead of silently breaking the closed-state `calc(100% + 0)` transform (exit animation would be dropped).
  - ADR-0036 updated: the inset is no longer a hard-coded internal value; all other floating-card behavior (drag-close distance math, controlled hover end-state) reads the same variable and follows the token automatically.
- ab8dfb7: Add Layout desktop sidebar drag-to-resize and Drawer drag-to-close features.
  
  **Layout (`<web-ui-layout>`):**
  
  - New props: `sidebar-resizable`, `sidebar-min-width`, `sidebar-max-width`
  - New event: `sidebar-width-change`
  - Accent resize handle on right edge (hidden when collapsed); keyboard-operable (WAI-ARIA splitter: arrows step, Home/End to bounds, Enter commits, Escape reverts)
  - Real-time width follow with clamping; emits on release
  - Built-in hard cap: the sidebar can never exceed half the viewport width, even if `sidebar-max-width` is configured higher
  
  **Drawer (`<web-ui-drawer>`):**
  
  - New prop: `draggable` (default `false`)
  - Gray capsule drag bar on inner edge (placement-aware)
  - Real-time follow + spring snap on release
  - Closes when displacement > 1/3 of size OR flick > 500px/s; otherwise rebounds
  - Native dialog renders nothing when closed ⇒ drag-to-open NOT supported
  - Spring via WAAPI (no new `--wui-*` tokens)
  - `prefers-reduced-motion` snaps instantly
  - `controlled` mode: user close actions only emit `open-change(false)` with writeback await + timeout rebound
  - Declarative nested drawer stacking: open drawers below the top layer automatically scale down (0.95^depth) and shift towards the inner side to expose card edges; Escape and backdrop clicks dismiss only the topmost layer
  
  **Drawer visual language (breaking visual, no API change):**
  
  - Non-headless drawers now render as floating rounded cards inset 8px from all viewport edges (see ADR-0036); elastic drag distances read as margin changes instead of gaps
  - New token `--wui-drawer-radius` (default `28px`); closed-state transforms compensate the inset so the drawer always exits the viewport fully
  - `headless` geometry unchanged (consumer-owned visuals)
  
  **Glass variable isolation (bug fix):**
  
  - `.wui-glass` now declares its own `--wui-internal-glass-shadow` / `--wui-internal-glass-focus-ring` defaults, cutting the flattened-tree inheritance path from ancestor glass containers (drawer/dialog bodies, overlay panels) into slotted content. Previously a glass-variant button or input inside a drawer/dialog silently picked up the huge overlay shadow instead of the soft glass fallback.
  - Headless drawers explicitly zero `--wui-internal-drawer-inset` on their dialog: a headless drawer nested inside a non-headless one used to inherit the 8px inset, breaking the drag-close distance / controlled hover end-state math for edge-to-edge geometry.
  - **Breaking visual:** `<web-ui-back-top>`'s default glass button now uses the glass fallback shadow (`--wui-shadow-glass`) instead of the small panel shadow (`--wui-shadow-panel`). The old `:host`-level `--wui-internal-glass-shadow` config could no longer reach the inner glass element under the new isolation and was removed; pass `--wui-shadow-glass` on the element if the previous look is required.
  
  **Controlled mode rename (was `request-only`) + dialog support:**
  
  - `web-ui-drawer`: prop `request-only` (attribute) / `requestOnly` (property) is renamed to `controlled` / `controlled` (same semantics — user close actions only emit `open-change(false)`; the consumer writes `open` back; programmatic `show()`/`close()` stay direct). No alias is kept.
  - `web-ui-dialog`: new `controlled` prop with the same contract (Escape and backdrop only request; native dialog closure while controlled is restored to the open state and re-emits the request).
  
  **Switch, Segmented & Slider Gesture Enhancements (`<web-ui-switch>`, `<web-ui-segmented>`, `<web-ui-slider>`):**
  
  - `Switch`: Full-track draggable gesture with real-time capsule glass thumb following, 6px intent deadzone against vertical scrolling, `scale(1.2)` press/drag micro-interaction, toggle commit on >50% travel (12px total travel) or flick velocity (>300px/s), with instant tap toggling preserved.
  - `Segmented`: Active indicator smooth drag tracking (initiated by pressing on the currently active trigger), `scale(1.2)` press/drag micro-interaction with glass visual, snap to nearest non-disabled trigger on release, and flick gesture support.
  - `Slider`: Refactored internal pointer handling to adopt unified `shared/gesture/` (`attachDragGesture` + `clamp`), with `scale(1.2)` drag micro-interaction and translucent glass thumb when dragging.
  - `Gesture Utilities`: Added `snapToNearest` and `normalizeProgress` helper functions in `packages/web-ui/src/shared/gesture/physics.ts`.
- ab8dfb7: feat(autocomplete): add allow-custom-value for explicit custom value commits
- ab8dfb7: feat(autocomplete): add empty state slot
- ab8dfb7: feat(web-ui): redefine borderless inputs as ghost form with normal-variant focus ring
  
  - `borderless` on input, textarea, and autocomplete now removes only surface decoration (border, glass background/blur, shadow, and glass outline ring) while keeping padding, height metrics, and the focus ring.
  - The borderless focus ring is the same double box-shadow as the normal variant (1px inset accent + focus-ring halo, 200ms transition) and shows on mouse and programmatic focus as well as keyboard focus; the previous `:focus-visible`-gated outline is removed.
  - Compatibility note: consumers that suppressed the focus ring with `[--wui-color-focus-ring:transparent]` now only hide the outer halo — the 1px inset accent line remains visible on focus.
- ab8dfb7: Redesign collapse as a single element with two slots: trigger via the default slot, content via `slot="content"`. The `web-ui-collapse-trigger` and `web-ui-collapse-content` elements are removed before first release.
  
  - Interaction semantics come from the slotted trigger element (native `<button>`, `<web-ui-button>`, etc.); the collapse writes `aria-expanded`/`aria-controls`/`aria-disabled` onto the first assigned trigger element. A plain-text trigger has no keyboard/focus semantics (documented limitation).
  - Strictly controlled `open` contract unchanged: `open-change` (`CustomEvent<{ open: boolean }>`) fires only on user-originated toggles; `show()`/`close()`/`toggle()` and programmatic writes never emit.
  - Height/width animation via CSS grid `0fr ↔ 1fr` transition — content-adaptive, zero JS measurement, interruptible (grid-transition selection carried over from ADR-0038; superseded by ADR-0039 for the API shape). `horizontal` switches the axis (default vertical).
  - Three-state closed semantics; consumer light DOM is never moved: default closed state sets `hidden` on the internal content container, `keep-mounted` (now on the root element) keeps content measurable inside the collapsed track with `inert` (scroll position preserved).
  - Headless kernel: the component carries no visual styling beyond the animation structure; trigger and content typography come from the consumer (new ADR-0039).
  - Unchanged tokens `--wui-duration-collapse-enter: 200ms` / `--wui-duration-collapse-exit: 160ms`, included in the reduced-motion zeroing lists.
- ab8dfb7: feat(overlay): support dropdown size variables in portal and keep borderless keyboard focus rings
  
  - Portal panels now mirror `--wui-overlay-min-width`, `--wui-autocomplete-max-width`/`--wui-autocomplete-max-height` and `--wui-select-max-width`/`--wui-select-max-height` from the host at portal creation.
  - Select/Autocomplete dropdown default scroll max-height reduced from 320px to 200px; override via `--wui-autocomplete-max-height` / `--wui-select-max-height`.
  - Borderless `input`, `textarea` and `autocomplete` keep a keyboard focus ring via `:focus-visible`; pointer focus stays borderless.
- ab8dfb7: feat(layout): add mobile toggle inset variable and glass variant
  
  - The mobile header toggle renders as a glass button and gains an 8px left inset by default, so it no longer sits flush against the viewport edge.
  - Consumers can align the toggle with their own header padding via `--wui-layout-mobile-toggle-inset`.

### Patch Changes

- ab8dfb7: fix(autocomplete): anchor non-portal panel to its inner wrapper so it stays aligned inside positioned ancestors
- ab8dfb7: fix(web-ui): preserve grouped button colors and refine dark surface hierarchy
  
  - Preserve the danger variant and consumer `--wui-button-color` overrides inside groups.
  - Refine dark page, text, control, overlay, and menu surface hierarchy.
  - Add a lightweight glass border ring using `--wui-color-glass-border`; make light mode transparent and dark mode subtler.
- ab8dfb7: fix(web-ui): align control baseline to 36px
  
  - Move the shared `--wui-control-size` baseline from 40px to 36px across buttons, inputs, selects, autocomplete, textarea, segmented, and related demos/docs.
  - Reduce switch track/thumb to 40x20/16x16 and adjust drag travel constants.
  - Set slider thumb to 30x20, align segmented/textarea geometry, and keep marks consistent across axes.
- ab8dfb7: fix(web-ui): replace icon button content while loading
  
  - Render only the loading spinner when `icon` and `loading` are set.
  - Keep the default slot icon unprojected while loading and restore projection when `loading` returns to `false`.
- ab8dfb7: fix(web-ui): darken primary and secondary state colors
  
  - Derive primary and secondary hover/active backgrounds toward black.
  - Preserve the existing tonal danger state ramp.
- ab8dfb7: fix(web-ui): align cursor behavior with Tailwind v4 and gesture states
  
  - Use default cursors for action, selection, and gesture-control hover and pressed states.
  - Switch slider, switch, and segmented cursors to grabbing only after dragging starts.
  - Align slider with switch and segmented gesture intent thresholds.
  - Propagate segmented gesture cursors through the trigger shadow boundary.
- ab8dfb7: style(web-ui): refine dark glass controls
  
  - Remove the glass background gradient highlight.
  - Add `--wui-glass-brightness` and lower dark backdrop brightness to `1.02`.
  - Deepen the dark page background.
  - Make the dark overlay shadow slightly more visible.
  - Align the select trigger with the button glass border.
- ab8dfb7: fix(dialog): ignore cancel events bubbled from child controls such as file inputs
- ab8dfb7: Fix drawer drag rebound firing twice on release below the close threshold.
  
  - The rebound spring's WAAPI animation now uses `fill: 'both'`. Without it, the animation stopped applying at its end while the inline drag transform was still present: any frame rendered between the animation's finish and the `onfinish` cleanup (main-thread congestion, compositor scheduling) painted a jump back to the drag position, and the subsequent inline-style cleanup then triggered the 280ms CSS enter transition from that position — visible as a second rebound.
  - `_springToClose()` gets the same `fill: 'both'` for the symmetric window (spring end → close pipeline takeover), keeping both gesture springs consistent.
  - Regression tests assert exactly one `animate()` call per gesture (pointerup and pointercancel) with `fill: 'both'`, and that the final close offset settles below 0.5px with no remaining animations.
- ab8dfb7: fix(web-ui): make hover/active background feedback instant
  
  - Remove background-color transitions driven by :hover/:active from button, select, input-number, segmented-trigger, option, dropdown-item, and drawer drag bar.
  - Keep transitions for checked/pressed/focus states and overlay enter/exit animations unchanged.
- ab8dfb7: fix(overlay): avoid reopening autocomplete and tooltip from pointer-initiated focus restoration
- ab8dfb7: fix(web-ui): resolve overlays inside an open native dialog into that dialog
  
  - Keep dropdown, context-menu, popover, tooltip, select and autocomplete panels above drawer or dialog content by joining the browser top layer.
  - Bundle menu panel styles so panels render correctly when the dialog has no pre-injected overlay styles.
  - Position context menus with a Floating UI virtual anchor so transformed dialog containing blocks keep viewport coordinates.
  - Preserve fixed menu positioning when a global glass rule would otherwise reset it to relative.
- Updated dependencies [ab8dfb7]
  - @greypan/browser-kit@2.1.0

## 4.0.0

### Major Changes

- 1e52bc4: 重构 Web UI CSS token 契约：文本层级改为 `secondary/tertiary/disabled`，focus 指示器拆分为 `--wui-color-focus-ring` 和 `--wui-focus-ring-width`，并删除 `--wui-color-border-strong`。同时将 control surface、track、panel shadow、control size、layout duration 和 back-top 变量统一到语义化命名。
  
  本次不保留旧名兼容别名。需要迁移的主要映射：
  
  - `--wui-color-text-muted` → `--wui-color-text-secondary`
  - `--wui-color-text-faint` → `--wui-color-text-tertiary`
  - `--wui-color-border-strong` → focused 输入边框改用 `--wui-color-accent`
  - `--wui-focus-ring` → `--wui-color-focus-ring` + `--wui-focus-ring-width`
  - `--wui-button-size` → `--wui-control-size`
  - `--wui-color-surface-raised-mid` → `--wui-color-surface-control`
  - `--wui-color-surface-raised-deep` → `--wui-color-surface-track`
  - `--wui-shadow-pop` → `--wui-shadow-panel`
  - `--web-ui-back-top-*` → `--wui-back-top-*`
  - `--wui-duration-regular` → `--wui-duration-layout`
  - `--wui-ease-out` → `--wui-ease-enter`

### Patch Changes

- 1e52bc4: 统一表单关联控件的原生生命周期：`form.reset()` 会恢复首次连接时声明式初始化后的默认值，并为所有表单控件提供浏览器表单状态恢复支持；被 group 管理的 checkbox/radio 子项仍由父 group 统一管理。
- 1e52bc4: 将 `web-ui-button-group` 的子按钮组态改为内部派生的视觉上下文。`group`、`last` 与 `direction` 不再注入到子 button；请仅依赖按钮组的可见布局，不要读取这些实现属性。
- Updated dependencies [1e52bc4]
  - @greypan/js-kit@2.0.0
  - @greypan/browser-kit@2.0.0

## 3.0.1

### Patch Changes

- b9faa2c: enhance monorepo agent capabilities
- Updated dependencies [b9faa2c]
  - @greypan/browser-kit@1.7.8
  - @greypan/js-kit@1.6.7

## 3.0.0

### Major Changes

- 28a8dc5: 框架类型适配收窄：移除 Vue 全局 `ComponentCustomProps extends HTMLAttributes`（不再污染所有 Vue 组件），React 移除 lowercase `oninput`/`onchange` 事件别名，`$events` 只声明事件本体、宿主 target 由适配层统一注入（`WithHost` 注入 readonly `target`/`currentTarget`），`WebUiElementMap` 成为组件标签单一来源。peer 基线收窄：`@types/react >= 19`、`vue >= 3.5`。Vue `@input`/`@change` 的 `$event.target` 现为组件实例（cast-free），新增 `WebUiEvent<Component, EventName>` 供命名 handler 使用。

  运行时契约收敛：`checkbox-group`/`radio-group`/`segmented` 管理的子项（checkbox/radio/segmented-trigger）不再把同名 `input`/`change` 冒泡到 group 外——子项自身派发事件（`bubbles: false, composed: false`），group 以 capture 相位监听并只派发一次自己的 `input`/`change`，两者 `target`/`currentTarget` 均为 group。独立使用子控件时保持 `bubbles: true, composed: true`。group 上的消费端事件监听不再重复触发。

  详见 `docs/adr/0011-framework-type-adaptation-narrowing.md`。

### Minor Changes

- 28a8dc5: `web-ui-input`、`web-ui-input-number`、`web-ui-autocomplete` 新增 `readonly` 只读状态属性，补齐与 `web-ui-textarea` 的 API 一致性：值照常提交表单、控件可聚焦选中复制，但不可编辑。只读时隐藏清除按钮、禁用 input-number 步进按钮并阻止 autocomplete 展开下拉，同时跳过必填校验（原生 barred-from-validation 语义）。

  同时修复 `web-ui-input`、`web-ui-textarea`、`web-ui-input-number` 的公共 `change` 事件：原生 change 事件不 composed，无法穿透 Shadow DOM，此前声明的 change 在真实用户交互中从不触发宿主监听器；现在组件捕获原生 change 后补发 composed 事件，与 `$events`/README 声明一致。

  `web-ui-input-number` 提交空输入或 `-` 时保持原值、不补发 change（与既有键入行为一致），已在 README 明确「空输入视为无效、不提交」。

### Patch Changes

- 28a8dc5: 修复 Select、Autocomplete 和 Dropdown 浮层的宽度计算，以及菜单浮层在主题作用域内的挂载行为，避免长选项文本裁切和主题样式失效。同步优化 Overlay、Portal 与 Scroll Lock 的共享实现，统一生命周期工厂模式并整理测试目录。

## 2.1.8

### Patch Changes

- 7c06580: try workflows
- Updated dependencies [7c06580]
  - @greypan/browser-kit@1.7.7
  - @greypan/js-kit@1.6.6

## 2.1.7

### Patch Changes

- fa0f989: fix(select): portal 模式未打开时 trigger 显示已选值

## 2.1.6

### Patch Changes

- 8d9d809: fix web-ui css token

## 2.1.5

### Patch Changes

- Updated dependencies [32d3366]
  - @greypan/browser-kit@1.7.6

## 2.1.4

### Patch Changes

- cdc5cf7: Release pipeline validation: bump all public packages for trusted publishing verification.
- Updated dependencies [cdc5cf7]
  - @greypan/js-kit@1.6.5
  - @greypan/browser-kit@1.7.5

## 2.1.3

### Patch Changes

- 5c70639: provide back-top position css var

## 2.1.2

### Patch Changes

- 7db6d3e: Standardize Custom Element boolean attributes and replace default-true properties with semantic opt-out attributes.

## 2.1.1

### Patch Changes

- 45a2f38: udpate readme

## 2.1.0

### Minor Changes

- fff1c60: Correct React Custom Element event typings to use exact JSX keys such as `onopen-change` and `ontoast-close`.
  The previously generated camel-cased keys such as `onOpenChange` did not match the event dispatched at runtime.

### Patch Changes

- fff1c60: Make Checkbox Group, Radio Group, and Segmented disabled state inherited without changing child `disabled` properties. Effective disabled child controls now expose `aria-disabled` and leave the tab sequence.

## 2.0.2

### Patch Changes

- 384c683: some components add user select none

## 2.0.1

### Patch Changes

- 8768a2b: some components add user select none

## 2.0.0

### Major Changes

- 0a50d35: 全量契约收敛：统一 Pointer Events、公开事件模型、原生表单关联、公开契约测试。

  ## 破坏性变更

  ### 属性重命名
  - **Switch**: `open` 属性更名为 `checked`（表示开关状态，不再是可见性）

  ### 事件变更
  - **Switch**: 移除 `open-change`，用户交互改派发 `input` + `change`
  - **Checkbox**: 移除 `update:checked`（Vue 实现泄露），改派发 `input` + `change`
  - **CheckboxGroup**: 移除 `value-changed`，改派发 `input` + `change`
  - **BackTop**: 移除 `visible-change`（scroll 驱动可见性是内部行为）

  ### 方法移除
  - **Switch**: 移除 `show()`、`close()` 方法（不再有可见性概念）

  ### Pointer Events 迁移
  - **Tooltip, Popover, DropdownMenu, ContextMenu**: `mouseenter`/`mouseleave` 替换为 `pointerenter`/`pointerleave`
  - **Input, Slider**: `mousedown` 替换为 `pointerdown`

  ### 新增表单行为
  - 10 个表单控件新增 `static formAssociated = true` 和 ElementInternals 实现
  - 新增 `name`、`required` 属性（input, textarea, input-number, select, slider, checkbox, radio, switch, segmented, checkbox-group, radio-group）

  ### 类型变更
  - React/Vue 包装类型从新的 `$events` 接口推导
  - 移除 `onUpdateChecked`、`onValueChanged`、`onVisibleChange` 事件监听器类型

  ### 运行时规范化
  - 字面量属性在运行时校验非法输入并回退到文档化默认值

### Patch Changes

- 26ca421: fix context-menu click-outside test for jsdom 30 compatibility

## 1.4.2

### Patch Changes

- 57f9984: fix mardkwon table format
- 57f9984: fix npm readme cn link
- Updated dependencies [57f9984]
- Updated dependencies [57f9984]
  - @greypan/browser-kit@1.7.4
  - @greypan/js-kit@1.6.4

## 1.4.1

### Patch Changes

- 734dea6: fix npm readme cn link
- Updated dependencies [734dea6]
  - @greypan/browser-kit@1.7.3
  - @greypan/js-kit@1.6.3

## 1.4.0

### Minor Changes

- be4008b: Standardize externalization to regex patterns for workspace deps; move msw to package-level devDependencies

  - `vite.config.ts` for `js-kit`, `browser-kit`, `web-ui`: replace hardcoded workspace dep names with `/^@greypan\//` regex; add missing external deps (`nanoid`, `msw`)
  - `browser-kit`: move `msw` from peerDependencies to devDependencies
  - `test-kit`: add `msw` to devDependencies for local type checking
  - `web-ui`: replace `react` peer dep with `@types/react`; add React/Vue usage documentation to README
  - `unplugin-web-components`: fix README import path to use `/vite` sub-path export
  - Fix documentation in READMEs and AGENTS.md to reflect current externalization rules

### Patch Changes

- Updated dependencies [be4008b]
  - @greypan/browser-kit@1.7.2
  - @greypan/js-kit@1.6.2

## 1.3.1

### Patch Changes

- c56dd3e: add tsconfig package
- Updated dependencies [c56dd3e]
  - @greypan/browser-kit@1.7.1
  - @greypan/js-kit@1.6.1

## 1.3.0

### Minor Changes

- a4e7f9b: vp monorepo standardization

### Patch Changes

- Updated dependencies [a4e7f9b]
  - @greypan/browser-kit@1.7.0
  - @greypan/js-kit@1.6.0

## 1.2.4

### Patch Changes

- 8f4643d: Audit and reorganize devDependencies/peerDependencies across all packages
- Updated dependencies [8f4643d]
  - @greypan/browser-kit@1.6.1
  - @greypan/js-kit@1.5.1

## 1.2.3

### Patch Changes

- a06335a: upgrade agents doc
- Updated dependencies [a06335a]
- Updated dependencies [a06335a]
  - @greypan/browser-kit@1.6.0
  - @greypan/js-kit@1.5.0

## 1.2.2

### Patch Changes

- Updated dependencies [874638d]
  - @greypan/browser-kit@1.5.0
  - @greypan/js-kit@1.4.0

## 1.2.1

### Patch Changes

- Updated dependencies [13802c0]
  - @greypan/browser-kit@1.4.0
  - @greypan/js-kit@1.3.0

## 1.2.0

### Minor Changes

- 8944472: Improve engineering structures

### Patch Changes

- Updated dependencies [8944472]
  - @greypan/browser-kit@1.3.0
  - @greypan/js-kit@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [ec36e92]
  - @greypan/js-kit@1.1.1
  - @greypan/browser-kit@1.2.1

## 1.1.0

### Minor Changes

- 4dfde81: 完善子包依赖，修复依赖缺失

### Patch Changes

- Updated dependencies [4dfde81]
  - @greypan/browser-kit@1.2.0
  - @greypan/js-kit@1.1.0

## 1.0.1

### Patch Changes

- Updated dependencies
  - @greypan/browser-kit@1.1.0
