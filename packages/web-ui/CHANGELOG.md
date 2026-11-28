# @greypan/web-ui

## 14.4.0

### Minor Changes

- b940932: Add the `wordpress:dashboard` icon to the built-in icon registry.

## 14.3.0

### Minor Changes

- 22821d7: Add `--wui-layout-sticky-top` to `<web-ui-layout>` so sticky sidebars and headers offset cleanly below custom application title bars.

### Patch Changes

- 66e6c29: Release `<web-ui-collapse>` peek masks and glow pseudo-elements once an expansion settles open.
- 092fe6d: Hide the `prefix` slot while `<web-ui-button>` is `loading` so the spinner replaces the leading icon instead of rendering both side by side.
- a050c3c: Soften the light-mode `--wui-shadow-glass` token so `.wui-glass` surfaces cast a subtler outer shadow.
- 5f4a9b4: Strengthen primary `<web-ui-button>` hover and active contrast, enable bidirectional overflow scrolling in `<web-ui-drawer>`, and tighten the `<web-ui-layout>` sidebar toggle top margin.
- 7df0afc: Lighten light-mode neutral surface tokens (control, track, segmented, and sidebar), soften light-mode glass outer and handle shadows, and darken the secondary button background half a step.
- 2dabb72: Extract the shared `MenuSession` module under `shared/menu-session/` and migrate `WebUiContextMenu` onto it, unifying multi-level submenu lifecycle, portal reconciliation, scroll lock, overlay arbitration, and keyboard/hover interactions.
- af56165: Migrate `WebUiDropdown` onto `shared/menu-session/` and remove the superseded `shared/menu-behavior/` and `shared/menu-portal/` modules.

## 14.2.0

### Minor Changes

- 1f63434: Support double-clicking the `<web-ui-drawer>` drag handle (`.wui-drawer-drag-zone` and `.wui-drawer-drag-edge`) when `fullable` and `draggable` are enabled to toggle between the viewport-filling full state and default size.
- 841a139: Add the boolean `no-reveal` attribute to `<web-ui-theme>` so appearance changes commit directly without triggering the circular View Transitions reveal.

### Patch Changes

- a0ea072: Use GPU-composited `translate3d` positioning for `<web-ui-progress>` indicator transitions in determinate mode to avoid layout reflows on frequent updates.

## 14.1.1

### Patch Changes

- ce42869: Use native scrollbars on coarse-pointer devices (phones and tablets) so component scroll containers restore default platform scrollbar width and colors.

## 14.1.0

### Minor Changes

- a626394: Add a `closed` event to `<web-ui-dialog>`, dispatched once after the exit animation finishes and the native dialog leaves the top layer.
- f4dfec1: Add a `fullable` property to `<web-ui-drawer>` (requires `draggable`) so outward drags or quick flicks snap the drawer to a viewport-filling form, tune drag-to-close distance (35%) and flick velocity (350px/s) thresholds, and add `onDepthChange` to nested drawer layer stacking.

### Patch Changes

- f4dfec1: Fix `imagePreview()` navigating an extra image during swipe settle and ending settle early on nested transform transitions.

## 14.0.0

### Major Changes

- c04b96d: Rename `--wui-layout-mobile-toggle-inset` to `--wui-layout-mobile-toggle-left` (no compatibility alias) and add `--wui-layout-mobile-toggle-right` and `--wui-layout-mobile-toggle-bottom` alongside `--wui-layout-mobile-toggle-top`.

  ```css
  /* Before */
  web-ui-layout {
    --wui-layout-mobile-toggle-inset: 12px;
  }

  /* After */
  web-ui-layout {
    --wui-layout-mobile-toggle-left: 12px;
  }
  ```

### Minor Changes

- c04b96d: Lift overflow clipping on `<web-ui-collapse>` once the expand transition settles so focus rings, shadows, and intentional horizontal overflow remain visible.
- c04b96d: Make `<web-ui-slider>` tick marks clickable so clicking a tick selects the nearest tick value, and expand the slider thumb pill only when a press starts directly on the thumb.

### Patch Changes

- c04b96d: Replace the browser focus outline on the `<web-ui-layout>` sidebar resize handle with the 3px accent bar, and draw a theme-aware hairline ring on the `<web-ui-slider>` thumb for legibility on light surfaces.

## 13.0.0

### Major Changes

- 57f4091: Open `<web-ui-context-menu>` with a Space key hold and retain the ContextMenu key; remove the `Shift+F10` shortcut.
- 57f4091: Add `sport` mode to `<web-ui-progress>` and remove `indeterminate`, `--wui-progress-indeterminate-duration`, and the `wui-progress-indeterminate` keyframes.

### Minor Changes

- 57f4091: Add a neutral control shade token and subtly cool-gray interaction states for light navigation and secondary buttons.

### Patch Changes

- 57f4091: Keep toast notifications and portal overlays inside modal dialogs positioned relative to the viewport during drawer page-shift motion.
- 57f4091: Unify neutral surfaces and text around a subtly cool gray palette, restore pressed button and segmented feedback when pointers leave in WebKit, and export additional scan, stop, Finder, and navigation icons.

## 12.4.0

### Minor Changes

- fe802db: Add configurable component sizing for switches, badges, menu items, step buttons, and built-in clear and close buttons, and refine mobile layout and drawer geometry.

### Patch Changes

- fe802db: Use white foregrounds for accent actions in dark mode, adopt the CodeX check icon for checkboxes, support configurable selection control sizes, and keep dialog and drawer controls keyboard reachable.
- f966cdc: Move `@iconify/types` to `dependencies` so consumers can resolve `IconifyIcon` in published type declarations.
- Updated dependencies [f966cdc]
  - @greypan/browser-kit@3.1.2

## 12.3.0

### Minor Changes

- 53fa534: Redesign `trigger` across the overlay family (`web-ui-tooltip`, `web-ui-popover`, `web-ui-dropdown`, `web-ui-select`, `web-ui-autocomplete`) on a shared `defineTriggerController` state machine (`click`, `hover`, `focus`, `none`, string-only), add `show-delay` / `hide-delay`, replace `web-ui-dropdown`'s `openMenu()` / `closeAll()` with `show()` / `hide()`, and rename `web-ui-select`'s appearance prop from `trigger` to `variant`.
- 53fa534: Gate automatic overlay opening on content presence across `autocomplete`, `select`, `dropdown`, `popover`, and `tooltip`.
- f27a2c1: Make `<web-ui-layout>` `mobile` a controlled boolean property and remove `mobile-change`; change the default `<web-ui-icon>` size from `18px` to `16px`; default tooltip triggers to hover-only; align overlay dismissal with enabled triggers; add input autofill hints, configurable autocomplete input slots, configurable popover panel padding, and a popover link arrow-key navigation helper.
- f05a76b: Add a `separator` prop to `<web-ui-grouped-text>` rendered via CSS generated content so copy and find keep the continuous value, and export `iconGallery` from `@greypan/web-ui/icons`.

### Patch Changes

- f27a2c1: Export additional icons (`ci:settings-future`, `lucide:house`, `lucide:shopping-cart`, `tabler:tag-plus`, `tabler:clock-plus`) and guard theme view-transition reveals against repeated input.
- 53fa534: Center `<web-ui-grouped-text>` separator spacing between groups and align keyboard active styling with hover for `web-ui-option` and `web-ui-dropdown-item`.
- Updated dependencies [7eefb10]
  - @greypan/js-kit@3.2.0
  - @greypan/browser-kit@3.1.1

## 12.2.0

### Minor Changes

- 009b99a: Add `<web-ui-grouped-text>` for visually grouping card numbers, phone numbers, and amounts via `letter-spacing` while keeping selection and clipboard copy on the original continuous string.
- 009b99a: Support multi-gesture `trigger` sets on `<web-ui-popover>` and `<web-ui-tooltip>`.
- 009b99a: Add the imperative `shake()` feedback helper and `page-shift` support on `<web-ui-drawer>` (also enabled on `<web-ui-layout>`'s mobile sidebar drawer).

### Patch Changes

- 009b99a: Hide `<web-ui-autocomplete>`'s empty dropdown panel immediately instead of fading out an empty padded strip.

## 12.1.0

### Minor Changes

- 0e77c22: Add `<web-ui-progress>` for linear progress with custom ranges, optional percentage readout, ARIA synchronization, and public CSS parts.
- 0e77c22: Add `sidebar-collapsible` and `--wui-layout-viewport-height` to `<web-ui-layout>`, `--wui-toast-top-offset` to toast containers, `trigger="icon"` to `<web-ui-select>`, and replace `<web-ui-dialog>`'s `horizontal` boolean with `footer-orientation` (`vertical` | `horizontal`).
- 425a950: Add `placement` (default `bottom-start`) to `<web-ui-select>` and `<web-ui-autocomplete>`.
- 0e77c22: Make imperative spinner overlays non-modal and pointer-transparent, forward `aria-label` in `<web-ui-segmented-trigger>`, and export additional icons (`ant-design:sync-outlined`, `ic:round-menu-open`, Lucide, and Tabler glyphs).

### Patch Changes

- 0e77c22: Keep `<web-ui-dialog>` footer and `<web-ui-select>` trigger slots layout-only without child-specific sizing overrides.

## 12.0.0

### Major Changes

- 137c540: Remove the `@greypan/web-ui/scrollbars` and `@greypan/web-ui/scrollbars.css` subpaths and the optional `overlayscrollbars` peer dependency. Scrollbars now use native CSS via `--wui-scrollbar-handle`, mirrored onto `documentElement` by `<web-ui-theme>`.

  ```css
  html {
    scrollbar-color: var(--wui-scrollbar-handle) transparent;
  }
  ```

### Minor Changes

- aebf774: Trap Tab focus inside `<web-ui-dialog>` and `<web-ui-drawer>`, associate open tooltips via `aria-description`, forward `aria-label` in segmented controls, and unify built-in accessible names behind a fixed-English table with `aria-*` override props (`aria-close-label`, `aria-dialog-label`, `aria-clear-label`, `aria-decrease-label`, `aria-increase-label`, and `ariaLabels` on `imagePreview` / `layout`).
- 9787a15: Remove `"./package.json"` from the package `exports` map.
- 8cb3f56: Add `no-sidebar` to `<web-ui-layout>` to render banner, header, content, and tabbar regions without sidebar chrome.

### Patch Changes

- 8cb3f56: Complete toast dismissal once from its panel transition or fallback and cancel pending dismissals on disconnect or re-show.
- Updated dependencies [9787a15]
- Updated dependencies [8cb3f56]
  - @greypan/js-kit@3.1.0
  - @greypan/browser-kit@3.1.0

## 11.2.0

### Minor Changes

- be69536: Remove `<web-ui-empty>`'s `size` prop in favor of granular CSS custom properties (`--wui-empty-icon-size`, `--wui-empty-icon-color`, `--wui-empty-icon-opacity`, `--wui-empty-title-*`, `--wui-empty-description-*`) and switch the default glyph to inline `andrsrxn:inbox`.
- be69536: Standardize disabled state on `disabled` alone: `<web-ui-button>` no longer delegates `aria-disabled` or blocks clicks via `aria-disabled="true"`, and `<web-ui-collapse>` applies `disabled` directly to its trigger while dropping cross-shadow `aria-controls`.

## 11.1.0

### Minor Changes

- 6baecc3: Export `@greypan/web-ui/classes.css` with reusable `.wui-glow` and `.wui-glass` surfaces (plus `--wui-glass-blur` and `--wui-glass-saturation`), and keep `<web-ui-layout>` `header-glow` flush with header edges.
- fea85a3: Add a `color` property to `<web-ui-spinner>` defaulting to the theme secondary text color.
- de69393: Add `--wui-color-on-danger` to `<web-ui-theme>` for badge count text.
- 046addb: Align dark-mode raised `<web-ui-segmented>` contrast and introduce `--wui-color-surface-segmented-track`.

### Patch Changes

- 9eec040: Improve accessibility, keyboard navigation, focus restoration, and positioning across `input`, `textarea`, `input-number`, `radio-group`, `checkbox`, `switch`, `segmented`, `select`, `autocomplete`, `dropdown`, `dialog`, `collapse`, `slider`, `tooltip`, `toast`, `avatar`, `badge`, `back-top`, `button`, `button-group`, `editable-text`, `image-preview`, `middle-ellipsis`, `spinner`, and `svg-draw-lines`.

## 11.0.0

### Major Changes

- 2d6d7e6: Switch all built-in component accessible names and native form validation strings to English.
- 2d6d7e6: Redesign the `<web-ui-slider>` thumb as a resting circle that elongates into a capsule on press/drag; rename `--wui-slider-thumb-height` to `--wui-slider-thumb-thickness`, `--wui-slider-thumb-width` to `--wui-slider-thumb-length`, and remove `--wui-slider-height`.

## 10.2.1

### Patch Changes

- ed17d76: Align value clamping, `change` event emission, `precision` formatting, element-identity group selection, and keyboard activation across `slider`, `input`, `input-number`, `switch`, `radio-group`, and `checkbox-group`.

## 10.2.0

### Minor Changes

- 3f185aa: Lower the default `--wui-scale-enter` for anchored floating panels, toasts, and image preview from `0.95` to `0.9`.

### Patch Changes

- 3f185aa: Measure untransformed dimensions when deciding which side `<web-ui-context-menu>` opens a submenu on.

## 10.1.2

### Patch Changes

- 450e918: Scope `<web-ui-context-menu>` item activation using `event.eventPhase` so calling `close()` inside an item callback reliably exits the top layer first.
- 1e2a277: Anchor the long-press trailing-event absorption window to `pointerup` rather than menu open time.

## 10.1.1

### Patch Changes

- f083706: Apply the blurred fade treatment to `<web-ui-collapse>` peek edges, style internal component scrollbars with the shared theme, remove the rounded background box behind `<web-ui-empty>` icons, lighten the light-mode resting scrollbar thumb, and sync `<web-ui-segmented>` drag indicator width with the hovered trigger.

## 10.1.0

### Minor Changes

- 9416d30: Add the `@greypan/web-ui/vite` entry exporting `webUiOptimizeDeps` for Vite dependency pre-bundling.

## 10.0.0

### Major Changes

- 3adfd77: Add a `header` chrome slot to `<web-ui-dialog>` aligned with `<web-ui-drawer>` and replace the `body` escape hatch with the `headless` boolean attribute.

## 9.1.0

### Minor Changes

- 617457a: Add `<web-ui-middle-ellipsis>` for single-line middle text truncation preserving head and tail characters.
- 617457a: Expose mobile viewport state on `<web-ui-layout>` and add the `@greypan/web-ui/scrollbars` subpath.

### Patch Changes

- 617457a: Fix dark-mode `<web-ui-context-menu>` fallback colors, `<web-ui-dialog>` / `<web-ui-drawer>` content overflow and stray focus rings, `<web-ui-dialog closable>` close button offsets, Safari `header-glow` top bleed, scrollbar auto-hide delay, and input placeholder typography.

## 9.0.0

### Major Changes

- 3c81816: Change `--wui-dialog-max-height` to cap the dialog content area, close `<web-ui-autocomplete>` when filtering yields no matches, change `<web-ui-empty>` `size` to a pixel number (default `56`), reorganize glass custom properties by layer, and stop components from auto-registering sibling custom elements.

### Minor Changes

- 3c81816: Add `commit-on-unmount` to `<web-ui-editable-text>`, `long-press` to `<web-ui-context-menu>`, `closable` to `<web-ui-dialog>`, `select()` to `<web-ui-input>`, `readonly` to `<web-ui-editable-text>`, `resolved-appearance` to `<web-ui-theme>`, logarithmic nested drawer peek (`--wui-drawer-nested-peek-base`), `--wui-layout-sidebar-toggle-width`, `--wui-button-group-divider-length`, and typography/spacing scale tokens on `<web-ui-theme>`.

### Patch Changes

- 3c81816: Make `<web-ui-context-menu>` modal via native `<dialog>` with Floating UI positioning and safe-area clamping; fix form-associated disabled recovery, form submit/reset forwarding, drawer drag-zone header/footer yielding, scroll lock without zeroing `window.scrollY`, accent-derived `--wui-color-focus-ring`, Iconify 16x16 fallback sizing, empty label gap collapse on radio/checkbox, textarea autosize recomputation, and theme view-transition stability; remove unused `--wui-layer-base` and `--wui-layout-header-glow-color`.
- Updated dependencies [3c81816]
  - @greypan/js-kit@3.0.1
  - @greypan/browser-kit@3.0.1

## 8.0.0

### Major Changes

- 62bdbec: Remove the `transition` prop from `<web-ui-theme>` in favor of automatic View Transitions gated by reduced-motion preferences.

### Minor Changes

- 62bdbec: Add `<web-ui-editable-text>` (with `select()`), add a `trigger` slot to `<web-ui-autocomplete>`, mirror `<web-ui-theme>` `--wui-color-page` onto `document.documentElement`, and add `variant` (`inset` | `raised`) to `<web-ui-segmented>`.

### Patch Changes

- 62bdbec: Keep anchored overlay panels registered through exit transitions, restore dark-mode menu/sidebar translucency, and fix theme view-transition stylesheet capture ordering.

## 7.0.0

### Major Changes

- 5be1ee4: Replace toast deduplication-and-drop with upsert semantics and remove `toast.updateMessage()`.

### Minor Changes

- 5be1ee4: Align drawer drag-to-close velocity with swipe-dismiss semantics, add `direction` to `<web-ui-radio-group>` and `<web-ui-checkbox-group>`, add reverse/manual playback options to `<web-ui-svg-draw-lines>`, arbitrate Escape to close only the innermost overlay, and internalize theme transitions inside `<web-ui-theme>`.

### Patch Changes

- 5be1ee4: Consolidate open-overlay ownership, fix modal reconciliation on DOM reattachment, refine toast hover pause and timers, align selection-control shells, and tune dialog entrance scale defaults.

## 6.4.0

### Minor Changes

- 4151251: Align overlay motion timing and scale defaults across floating panels and expose missing motion custom properties.

### Patch Changes

- 4151251: Flatten pressed and dragging handle shadows on `switch`, `segmented`, and `slider`.

## 6.3.1

### Patch Changes

- fc05655: Make `<web-ui-svg-draw-lines>` layout-neutral so wrapping an icon introduces no extra box height or vertical shift.

## 6.3.0

### Minor Changes

- a00fc1b: Add imperative `imagePreview()` with pan, pinch/wheel zoom anchored at the cursor/midpoint, and opt-in presentation controls (`nav`, `toolbar`, `closable`, `indicator`, `swipe`, `noScrollLock`, `noBackdropClose`); add `peek` to `<web-ui-collapse>`; retire `--wui-duration-menu-enter/exit` and `--wui-duration-overlay-enter/exit` in favor of dedicated motion tokens.

### Patch Changes

- a00fc1b: Fix iOS Safari dialog/backdrop/touch drag compatibility, prevent orphaned empty popover portals, add composition-aware overlay ownership and async positioning generation guards, add configurable dialog spacing tokens, and refine pressed glass handles.

## 6.1.0

### Minor Changes

- d0a9f32: Expose drawer drag zone/bar tokens (`--wui-drawer-drag-zone-size`, `--wui-drawer-drag-bar-thickness`, `--wui-drawer-drag-bar-length`), add semantic radius tokens (`--wui-radius-control`, `--wui-radius-menu`, `--wui-radius-overlay`), align observable token fallbacks, and remove the non-existent `./icons/*` subpath export.

### Patch Changes

- d0a9f32: Consolidate shared overlay/menu/combobox/form-association helpers and fix input focus-ring transitions.
- Updated dependencies [d0a9f32]
  - @greypan/browser-kit@3.0.0
  - @greypan/js-kit@3.0.0

## 6.0.0

### Major Changes

- c310d9f: Remove `--wui-layout-sidebar-bg` in favor of `--wui-color-surface-overlay`, and rename `<web-ui-drawer>`'s `request-only` prop to `controlled` (no alias).

### Minor Changes

- c310d9f: Add desktop sidebar drag-to-resize on `<web-ui-layout>`, `draggable` / nested stacking / `--wui-drawer-inset` on `<web-ui-drawer>`, `controlled` on `<web-ui-dialog>`, single-element two-slot `<web-ui-collapse>`, `allow-custom-value` and empty slot on `<web-ui-autocomplete>`, ghost-form borderless inputs, and unified drag gestures on `switch`, `segmented`, and `slider`.

### Patch Changes

- c310d9f: Align shared `--wui-control-size` baseline to `36px`, resolve portal overlays inside open native dialogs with live framework rendering support, isolate `.wui-glass` inherited variables, fix drawer rebound spring `fill: 'both'`, and make hover/active backgrounds instant.
- Updated dependencies [c310d9f]
  - @greypan/browser-kit@2.2.0

## 4.0.0

### Major Changes

- 1e52bc4: Refactor CSS custom property contracts with no compatibility aliases:

  ```css
  /* Selected token renames */
  /* --wui-color-text-muted        -> --wui-color-text-secondary */
  /* --wui-color-text-faint        -> --wui-color-text-tertiary */
  /* --wui-focus-ring              -> --wui-color-focus-ring + --wui-focus-ring-width */
  /* --wui-button-size             -> --wui-control-size */
  /* --wui-shadow-pop              -> --wui-shadow-panel */
  /* --web-ui-back-top-*           -> --wui-back-top-* */
  ```

### Patch Changes

- 1e52bc4: Unify native form-associated control `reset()` and state restoration lifecycles, and derive `<web-ui-button-group>` child styling internally instead of injecting `group`/`last`/`direction` attributes.
- Updated dependencies [1e52bc4]
  - @greypan/js-kit@2.0.0
  - @greypan/browser-kit@2.0.0

## 3.0.0

### Major Changes

- 28a8dc5: Narrow framework type integrations (remove global Vue `ComponentCustomProps` augmentation and React lowercase `oninput`/`onchange` aliases, require `@types/react >= 19` and `vue >= 3.5`, add `WebUiEvent<Component, EventName>`), and stop group-managed child controls (`checkbox`, `radio`, `segmented-trigger`) from bubbling duplicate `input`/`change` events outside their parent group.

### Minor Changes

- 28a8dc5: Add `readonly` to `web-ui-input`, `web-ui-input-number`, and `web-ui-autocomplete`, and dispatch composed `change` events across shadow boundaries on form text/number controls.

### Patch Changes

- 28a8dc5: Fix overlay width calculation and theme-scoped portal mounting for `select`, `autocomplete`, and `dropdown`.

## 2.1.2

### Patch Changes

- 7db6d3e: Standardize custom element boolean attributes and replace default-true properties with semantic opt-out attributes.

## 2.1.0

### Minor Changes

- fff1c60: Fix React custom element JSX event typings to use exact event names (`onopen-change`, `ontoast-close`).

### Patch Changes

- fff1c60: Propagate disabled state from `checkbox-group`, `radio-group`, and `segmented` to child controls without mutating child `disabled` properties.

## 2.0.0

### Major Changes

- 0a50d35: Standardize public component contracts on Pointer Events, native form association, and unified `input`/`change` events: rename `<web-ui-switch>` `open` to `checked`, remove `open-change` / `update:checked` / `value-changed` / `visible-change` and `<web-ui-switch>` `show()`/`close()`, and migrate mouse hover/down handlers to pointer events.

## 1.4.0

### Minor Changes

- be4008b: Replace the `react` peer dependency with `@types/react` and standardize workspace dependency externalization.
- Updated dependencies [be4008b]
  - @greypan/browser-kit@1.7.2
  - @greypan/js-kit@1.6.2

## 1.0.1

### Patch Changes

- Updated dependencies
  - @greypan/browser-kit@1.0.1
