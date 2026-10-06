# @greypan/web-ui

## 9.0.0

### Major Changes

- 3c81816: **Semantic change to a public custom property.** `--wui-dialog-max-height` now caps the dialog's **content area** (`.desc`), not the whole card. A host that sets it to `560px` and changes nothing else will now render a card up to `560px` plus its own chrome tall. A host that keeps subtracting chrome from its own inner `height` does not break — the content area's own cap catches the overflow — but it does not get the fix either, because that inner height expression stays the binding constraint and the card keeps rendering taller than the height it declares. Both cases want the same one-time conversion.
  
  **What moved.** The cap used to sit on the `<dialog>` element, and `.desc` carried neither a cap nor `overflow`. Content that exceeded the cap pushed the card out of the dialog box instead of scrolling, so the only element that could scroll was an inner box the host sized itself. The cap now sits on `.desc`, which is a scroll container, while the `<dialog>` element keeps a literal `100vh` / `100dvh` backstop that only catches the case where the viewport is too short for chrome plus the cap. The title row and the footer are again sized purely by their content, so chrome can vary without dragging the content area's geometry along with it.
  
  **How to convert.** Subtract your own measured chrome from the token: card padding, title row, gaps, footer. That number is a property of your dialog's own content, not of the component, so no single value is right for every host — the three dialogs in the Interweave frontend measure `141.59`, `141.59` and `105.59`. The subtracted value is a **content-area budget, not a fixed whole-card height**: the card still grows with its own chrome. When `--wui-control-size` grows on coarse pointers, the content area stays exactly at the token while the card grows with the footer (measured: content area 270 → 270, card 412 → 416). Once converted, an inner element can use the token directly as its `height` and no longer needs its own chrome arithmetic.
  
  Measured effect on the Interweave frontend, converted in this same release: `AddDialog` and `RestoreDialog` become roughly 34px shorter than they were. Their old constant of `108` was simply wrong — the real chrome is `141.59` — so those two dialogs had been rendering about 34px taller than the height they declared, and now match it. `SettingsDialog` is visually unchanged: its constant of `106` was already correct.
  
  The token's own default still has two fallback tiers, now stated as such in both READMEs: the base `.desc` rule falls back to `90vh`, and the `@supports (height: 100dvh)` enhancement falls back to `min(90vh, 90dvh)`. An engine without `dvh` support only ever gets `90vh`. Note that headless Chromium reports `vh` and `dvh` as equal, so no computed-style assertion in the test suite can tell the two tiers apart.
  
  `--wui-dialog-desc-focus-padding` is new and defaults to `6px`. `.desc` is now a scroll container and, because one axis must be non-`visible`, a clip box as well — so a control flush against any of its four edges would have its focus ring clipped by the padding box. The margin covers all four axes, and paired negative margins on the other three sides take the same amount back out of the surrounding spacing, so introducing the token moves neither the chrome height, the card height, nor the width available to the host's inner content. `--wui-dialog-desc-gap` is now floored: the bottom margin clamps at `0` rather than going negative when a host sets the gap below this token.
  
  **Body mode** (`slot="body"`, no `.desc`) keeps its **card size** unchanged. Its position is not guaranteed: the `<dialog>` box backstop tightened from `min(90vh, 90dvh)` to a literal `100vh`, and a modal dialog is centred on its own box with the card drawn from the box top, so a taller box moves the card up within the viewport. Measured on Chromium and WebKit: 0px when the content is far shorter than the viewport — which is what both demos happen to do, and which is a coincidence rather than a guarantee — up to 52px / 102px as the content approaches the viewport height, and around 25–27px in the mid-range — the exact figure there moves with the fractional viewport height, so treat it as a range rather than a constant.
- 3c81816: Close `web-ui-autocomplete` when filtering produces no matching options, and reopen it when matches return. `allow-custom-value` still submits an unmatched value with Enter.
  
  **Breaking removal:** the public `empty` slot and its empty-state UI have been removed. Remove `<div slot="empty">…</div>` from consumers; zero matches now leave the dropdown closed without rendering a panel.
- 3c81816: Change `web-ui-empty`'s `size` from the `'small' | 'medium' | 'large'` enum to a `number` in px, defaulting to `56`. Like `<web-ui-button>`'s `size` it is a px length, but where button keeps a `string` property, `web-ui-empty` now takes a plain `number`. It is the one knob for the whole placeholder: it drives the icon container, `min-height`, padding, and the title/description font size, so a large icon no longer sits in medium-sized whitespace. The default glyph is `round(size * 3 / 7)` and the internal `--wui-internal-empty-icon-radius` default moves from `16px` to `18px`.
  
  **Breaking changes:**
  
  - The exported `EmptySize` type is removed; the attribute is a plain number. Values that are not finite positive numbers (`NaN`, `±Infinity`, `0`, negatives) fall back to the default `56` instead of the old `'medium'`.
  - The `:host([size='small'])` and `:host([size='large'])` rules are gone; `size` is now the single source. The derived values are `min-height: round(size * 30 / 7)`, `padding-block: round(size * 4 / 7)`, and `padding-inline: round(size * 3 / 7)`, which keeps the default `56` on exactly the former `medium` metrics (`240px`, `32px 24px`) while `40` and `72` get `171px` / `23px 17px` and `309px` / `41px 31px`. Font size is one step rather than a scale: below `56` it is `14px` / `13px`, and from `56` up it is `16px` / `14px`, so a bigger placeholder reads through its whitespace rather than through bigger text.
  - Every `--wui-empty-*` custom property still overrides what `size` derives, including the two font sizes, which are now overridable per instance without giving up the scale. Section margins and content width never followed the old tiers and still do not follow `size`.
  
  **Migration:** `small` → `40`, `medium` → `56`, `large` → `72`. The old tiers were hand-tuned, so the ratios land near them rather than reproducing them — `small` used to be `160px` tall with `20px 16px` padding and `large` used to be `320px` with `48px 32px`. An invalid `size` now falls back to `56` for the whole metric set, not just for the icon box.
  
  ```html
  <!-- before -->
  <web-ui-empty size="large" title="No results"></web-ui-empty>
  <!-- after -->
  <web-ui-empty size="72" title="No results"></web-ui-empty>
  ```
  
  The generated React and Vue types declare `size` as `number`, so pass a number rather than a string attribute in those frameworks — a static `size="72"` fails type checking.
  
  ```tsx
  <web-ui-empty size={72} title="No results"></web-ui-empty>
  ```
  
  ```vue
  <web-ui-empty :size="72" title="No results"></web-ui-empty>
  ```
- 3c81816: Group the glass tokens by the layer that paints them, and give the light scheme a real base tint for the 1px glass ring.
  
  **Breaking renames:** three public custom properties on `<web-ui-theme>` are renamed. No compatibility aliases are kept.
  
  | Before                     | After                          | Layer                             |
  | -------------------------- | ------------------------------ | --------------------------------- |
  | `--wui-color-glass-border` | `--wui-color-glass-ring`       | base tint of the 1px ring         |
  | `--wui-color-glass-corner` | `--wui-color-glass-ring-sheen` | corner sheen, painted on the ring |
  | `--wui-color-glass-shade`  | `--wui-color-glass-ring-shade` | corner shade, painted on the ring |
  
  `--wui-color-glass-highlight` is unchanged and stays out of the `ring` group: it is an inset `box-shadow` on the element itself, not part of the ring that `.wui-glass::before` masks out.
  
  **Visual change, light scheme only:** `--wui-color-glass-ring` was `transparent` and is now `rgb(0 0 0 / 0.05)`, so every glass surface in the light scheme gains a subtle but real 1px outline. This is a restyle, not an invisible gap fix. Measured against a ring-free baseline of the same box, the maximum delta of the light-scheme ring goes from 4–7/255 to 13–17/255; the exact figures move with each surface's size and corner radius. The part that was genuinely missing is the edge midpoint: with the old transparent base, any edge longer than about `3R` (`R` being that surface's `--wui-glass-corner-radius`) had a stretch that matched the ring-free baseline pixel for pixel — a delta of exactly 0 — and it now reads 13/255. The dark scheme already used `rgb(255 255 255 / 0.05)` and is unchanged, as are `--wui-color-glass-ring-sheen` and `--wui-color-glass-ring-shade` in both schemes.
  
  The base layer is load-bearing rather than decorative. The ring is a `background-color` base with four corner-anchored `radial-gradient`s on top; the radials use a fixed radius (`2R` for sheen, `R` for shade, where `R` is `--wui-glass-corner-radius`), so any edge longer than about `3R` leaves a stretch that no radial covers. With a transparent base nothing painted that stretch. How much of the ring this affects depends on the surface's aspect ratio, since `R` is driven by each component's own radius.
  
  The same value is now also the literal fallback in `glass.css`, so a `<web-ui-theme>` without `appearance` — or no theme at all — keeps the ring closed. Every other glass token in that file already falls back to its light-scheme value; this one was the sole exception.
  
  To make the light ring lighter, lower `--wui-color-glass-ring` rather than setting it back to `transparent`, and keep it above the shade alpha (`0.03`) so the edge midpoint does not fall below the corner shading.
  
  Consumers that read or override the three old names must update them before upgrading. No workspace in this repository overrides any of the four tokens.
- 3c81816: **Breaking:** a component no longer registers its siblings. Ten imports that only pulled in
  child elements are gone, so importing a parent on its own no longer registers the children a
  consumer writes inside it.
  
  A component imported a sibling only when its own template rendered that tag. `web-ui-select`
  and `web-ui-autocomplete` render just a trigger and a slot, `web-ui-button-group` and
  `web-ui-dialog` render only slots, and `web-ui-dropdown` and `web-ui-context-menu` query the
  `web-ui-dropdown-*` children a consumer writes into them but never create one. The child
  elements were always the consumer's to provide, so these imports were dead weight that also
  carried a misleading note about tree-shaking. The build sets `preserveModules: true` and lists
  `./src/components/**` and `./dist/components/**` in `sideEffects`, so the module graph is never
  tree-shaken in the first place.
  
  Migration — import the children alongside the parent:
  
  ```diff
   import '@greypan/web-ui/components/dropdown'
  +import '@greypan/web-ui/components/dropdown-item'
  +import '@greypan/web-ui/components/dropdown-header'
  +import '@greypan/web-ui/components/dropdown-divider'
  ```
  
  The same applies to `web-ui-select` and `web-ui-autocomplete`, which need
  `@greypan/web-ui/components/option`, and to `web-ui-button-group` and `web-ui-dialog`, which need
  `@greypan/web-ui/components/button`. A subpath import registers only the component it names.
  
  Both documented consumption paths are unaffected: the `@greypan/web-ui` barrel still registers
  every component, and `unplugin-web-components` still emits one import per literal `<web-ui-*>`
  tag it finds, so a template that writes `<web-ui-option>` keeps resolving it on its own.

### Minor Changes

- 3c81816: Add `commit-on-unmount` to `web-ui-editable-text` so an open editing session can end by committing when the element is unmounted.
  
  Measured on Chromium and WebKit while scoping this, and the two engines **disagree** — which is the reason the property is worth having:
  
  - Chromium dispatches `blur` on the editing layer when a component being edited is removed, so a plain commit already happens today. `blur` and the `change` it triggers land synchronously _after_ the unmount callback has run, so the commit arrives after whatever state the caller updates in response to the removal.
  - WebKit (Safari, iOS) dispatches no `blur` at all: with the default `false` nothing is committed and the draft is dropped along with the element.
  - Gecko (Firefox) is unverified — no Firefox build would start on the machine this was measured on, so nothing is claimed for it. Treat it as unknown rather than as matching either engine above.
  
  With `commit-on-unmount` set, the unmount itself ends an open session by committing — the draft becomes the new value, edit mode exits, and `change` is dispatched exactly once, reusing the same `_commitEditing` path as `Enter` and `blur` rather than introducing a third commit semantic. On Safari and iOS this is the only thing that preserves the draft; in Chromium it moves the commit ahead of the removal-driven `blur`, which then early-exits because edit mode is already off, so the two sources still yield exactly one `change`.
  
  Two deliberate differences from the `blur` path: an unmount carries no user intent, so the commit only fires when the draft really differs from the baseline captured when editing began (no empty `change`); and a `disabled` or `readonly` element dispatches no commit, matching `_onBlur`. An existing draft is treated differently in those two states — under `disabled` it stays on the element, while under `readonly` it is genuinely lost, because `readonly` does not retract earlier input and no `blur` remains at unmount to commit it. That path is reachable (enter editing while editable, type, flip to `readonly`, unmount) and is not treated as a cancel, since cancelling means restoring the baseline and there is no focus or host to hand a result to at unmount; the user sees their typing disappear with neither `change` nor `cancel`.
  
  The commit fires from the unmount callback, so `change` travels the composed path and reaches listeners on the component or any ancestor, including ancestors being unmounted in the same turn: dispatching does not require an ancestor to still be in the document. Listeners must not assume the component is still connected. This reach does not extend to an unmount React drives from its own render, which never reaches React's delegated event root — the same caveat that already applies to `cancel`. Setting `display: none` on an ancestor is not a removal and is not covered.
  
  No new event type is introduced and the existing `change` / `cancel` signatures are untouched.
- 3c81816: Add `--wui-button-group-divider-length` to `<web-ui-button-group>`. The divider between adjacent grouped buttons was a fixed 24px line with no way for a consumer to reach it — it lives in the child button's shadow root and that span is not exposed as a part — so the only alternative was dropping the group entirely and losing the shared glass pill.
  
  The token sets the divider's long edge and defaults to 20px, so every grouped button pair gets a shorter rule than the 24px line it drew before; its cross axis stays 1px. Because it drives the long edge rather than a fixed axis, one value works for both `direction="horizontal"` and `direction="vertical"`.
- 3c81816: feat(web-ui): draw the checkbox checkmark from akar-icons:check
  
  `<web-ui-checkbox>` now strokes `akar-icons:check` where it drew `tabler:check`. Both are
  round-capped 24-unit glyphs with `stroke-width="2"`, so the render path is untouched; what
  changes is the geometry — `m4 12l6 6L20 6` starts its tail a unit further left and lifts the
  tip a unit higher than `m5 12l5 5L20 7`, which reads as a longer, more open tick inside the
  18px indicator.
  
  The swap keeps the precondition the draw animation depends on: the asset stays `fill: none` +
  `stroke: currentColor`, so `<web-ui-svg-draw-lines>` animates a stroke instead of revealing a
  solid mark. `checkbox.motion.browser.spec.ts`, which pins that, still passes.
  
  `@greypan/web-ui/icons` loses `tablerCheck` and gains `akarIconsCheck`. `tablerCheck` was added
  on this unreleased line and never shipped, so no published consumer sees a removal, and
  `@iconify-json/tabler` stays a devDependency for `tabler:sort-ascending-letters`. The new
  devDependency `@iconify-json/akar-icons` (catalog `^1.2.7`) is only read by the generator at
  build time — icon bodies are inlined into the emitted modules, so nothing extra lands in the
  published bundle.
- 3c81816: feat(web-ui): render the checkbox checkmark as an icon asset
  
  `<web-ui-checkbox>` drew its checkmark from a path the component carried itself. It now renders a stroked check from `@/icons` through a nested `<web-ui-icon>`, inside the same `<web-ui-svg-draw-lines>` wrapper, so the indicator is an asset like every other glyph in the library rather than a hand-held exception. The draw-in and retract, the `--wui-duration-trigger` timing and the `motion="reduced"` bypass all keep working: `<web-ui-svg-draw-lines>` reaches geometry inside nested open shadow roots, and the check's color arrives through `<web-ui-icon>`'s `--wui-icon-color`, set to `--wui-color-on-control` — the token radio's dot and switch's thumb use — so it stays legible on the accent-filled indicator.
  
  Two visible consequences. The stroke weight follows the asset (`stroke-width="2"` on a 24-unit canvas, previously 3), so the check is a step thinner. And it renders at `<web-ui-icon>`'s own default 18px: the host cannot reach the `<svg>` inside the icon's shadow root, so enlarging `--wui-selection-control-size` now grows the indicator box without scaling the check inside it.
  
  The asset has to stay stroked (`fill: none` + `stroke: currentColor`). A solid icon is a silent failure here — `<web-ui-svg-draw-lines>` animates `stroke-dashoffset`, which affects only stroke painting, so the animation runs to completion while the check simply appears. `checkbox.motion.browser.spec.ts` now pins `fill: none` and the on-control stroke to keep that precondition from regressing, and both checkbox motion specs observe the icon's nested shadow root, since `ShadowRoot.getAnimations()` does not cross into it.
- 3c81816: Add an opt-in `long-press` attribute to `<web-ui-context-menu>` so touch users can open the menu without a right-click. It is touch-only by design: a pointer with `pointerType === 'touch'` held for `long-press-delay` (default `500` ms, matching the platform long press) opens the menu at the press point, through the same `_openAt` path a right-click uses. Holding while moving more than 10px cancels it, so a scroll never opens a menu. Without the attribute nothing changes.
  
  Absorbing the browser's follow-up events is the part that is easy to get wrong. Once the long press opens the menu, the engine still reports that same hold as a native gesture and emits a `contextmenu` (which would reopen) and, after `touchend`, a synthesised `click` (which would immediately light-dismiss the menu the long press just opened). Both are swallowed inside a short window that closes on the next `pointerdown`, so a genuine later right-click or click is unaffected.
  
  Verified against Chromium's real touch pipeline via CDP `Input.dispatchTouchEvent` rather than synthetic events: synthetic pointer events produce none of the gesture recognition, and `touchscreen.tap()` releases immediately so it can never hold long enough to trigger a long press. That harness is what surfaced the trailing-`click` dismissal — synthetic-event tests had the menu opening and staying open, which was wrong.
- 3c81816: Add a `closable` attribute to `<web-ui-dialog>`. It renders a built-in close button in both content modes, and the button takes the same close path as Escape and backdrop clicks — so `controlled` applies to it identically: it only emits `open-change` with `open: false` and leaves `open` to the consumer.
  
  The two content modes place the button differently, because the title row only exists when there is no `body` slot. Without a `body` slot the button sits in a `.title-row` flex line beside the title, leaving `.title`'s own bottom margin semantics untouched. With a `body` slot there is no title row, so the button becomes a direct child of the glass card and is absolutely positioned at its top-right corner, offset by the new `--wui-dialog-close-top` and `--wui-dialog-close-right` custom properties.
  
  The button reuses the `ooui:close` icon already shipped for the drawer close button, so no new icon enters the package's generated icon set. Escape, backdrop click, and the new button now share one `_closeFromUser` path instead of three copies of the same controlled/uncontrolled branch; their behaviour is unchanged.
  
  Omitting `closable` renders exactly what it did before: no button, and no extra wrapper element.
- 3c81816: fix(web-ui): size a size-less Iconify icon on the spec's 16×16 canvas
  
  `<web-ui-icon>` derived its `viewBox` from `icon.width`/`icon.height` and fell back to `24` when the data object declared neither. Iconify's own default canvas is 16×16 (`@iconify/types` README), so the fallback was the one value the spec does not allow: a size-less 16-unit icon was squashed into the top-left quarter of a 24-unit box instead of filling it. The fallback is now `16`, and generated assets no longer rely on it — `scripts/generate-icons.ts` resolves the merge chain (icon → icon set → spec default) before writing, so `@iconify-json/bi`, which publishes no root canvas for any of its 2084 icons, now emits `width: 16, height: 16` rather than leaving the size to the renderer.
  
  The published behavior difference is for consumers who hand a raw `IconifyIcon` object to `.icon` and declare no canvas on it: such an icon renders at a different scale than before. Every icon object that declares its `width`/`height` renders as it did, which covers all assets exported from `@greypan/web-ui/icons` in the previous release — `biCheck` is new on this branch and had never rendered at the right scale.
- 3c81816: fix(web-ui): stop `<web-ui-radio>` and `<web-ui-checkbox>` from reserving space for a label they do not have
  
  The trigger row is an `inline-flex` with `gap: 10px`, and the host is sized by its content, so a control with nothing renderable in its default slot measured 28px for an 18px indicator: a gap only knows there is a flex item there, not that the item has no width. Every standalone control hit that, and so did the usual accessible-name workaround of slotting one visually hidden (`.sr-only`) span — that content is assigned to the slot but paints no box.
  
  The row now collapses the gap when the label's rendered width is 0, tracked through one `ResizeObserver` shared by all selection controls rather than one per instance. Emptiness is deliberately measured instead of asked of the slot: `slot:empty` reads the slot's own child nodes, and assigned nodes are not its children, so an assigned-but-invisible label would have looked non-empty. The other candidate — hiding the label — is the wrong one, since `display: none` takes the slotted accessible name out of the accessibility tree along with the space.
  
  A control whose label paints is unaffected: the 10px between indicator and text stays, as does hovering that gap to tint the indicator. A standalone or hidden-name-only control is now exactly `--wui-selection-control-size` wide, so it lines up with the content around it instead of trailing 10px of dead space. `shared/label-emptiness/__tests__/selection-label.browser.spec.ts` pins the host width for empty, `.sr-only`-only and labeled controls, the collapse when a label is removed at runtime, and the convergence for a control that mounts inside a `display: none` subtree.
- 3c81816: Add a public `select()` to `<web-ui-input>` so callers can select the full current value through the component API instead of reaching into its shadow root or using deprecated `document.execCommand`. `<web-ui-textarea>` already exposed the same method; both now share an explicit `disabled` no-op and remain safe when the native control has not rendered.
  
  The consistency review also adds `readonly` to `<web-ui-editable-text>`: it keeps focus, selection, and copying available while rejecting input and leaving edit mode without a `change`, matching the read-only contract of `<web-ui-input>` and `<web-ui-textarea>`. Existing `value` read/write, `input`/`change` paths, form association, and the documented non-reflected `value` attribute on `<web-ui-editable-text>` remain backward compatible.
- 3c81816: fix(web-ui): recompute `<web-ui-textarea>` autosize height when the value or `rows` changes
  
  An autosizing textarea only resized itself from its own `input` handler, so a value that arrived any other way — an attribute set by a parent, a property set from outside, a reset — left the box at the height it had for the old text. The height is now recomputed in `updated()` whenever the value changes, and the duplicate call in `handleInput` is gone. `rows` joins the same recompute: it sets the natural height that `height: auto` produces, but the inline pixel height overrode it, so a reactive `rows` binding had no effect at all. The autosize path also sets `resize: none`, because a native corner grip and script-owned height fight each other: the grip reasserts a height the next measurement immediately overwrites.
  
  `rows` continues to act as a floor that longer content grows past, so `rows="2"` renders a two-line box that expands for longer text.
  
  Two changes here alter published defaults rather than only adding capability, which is why this is a `minor`:
  
  - `<web-ui-textarea>` with `autosize` now sets `resize: none`. The native corner grip and a script-owned height fight each other — the grip reasserts a height that the next measurement immediately overwrites. Consumers who want a resizable autosizing box should drop `autosize`. Textareas without `autosize` keep `resize: vertical`.
  - The `<web-ui-layout>` desktop sidebar collapse button renders as a `secondary` variant rather than `glass`. This is visible to every consumer of the component, not only to apps that opt in.
  
  Also here: the `<web-ui-layout>` sidebar resize handle takes the same 3px focus ring at `--wui-color-focus-ring` with a 2px offset that the rest of the library uses, shown alongside the accent bar that hover and dragging already had. The bar answers "where is the hit area", the ring answers "where did the keyboard land": the handle is 12px wide and full height, so a 3px bar on its own did not say enough.
- 3c81816: Expose `<web-ui-theme>`'s resolved color scheme as the read-only reflected `resolved-appearance` attribute and `resolvedAppearance` property. The value is always `light` or `dark`: explicit appearances pass through, `system` follows `prefers-color-scheme` and updates live on OS flips, and a missing `appearance` reports the default `light`. The component owns and restores the attribute, so consumers can bind CSS selectors or Tailwind custom variants to it without maintaining a second theme state; existing View Transition behavior is unchanged.
- 3c81816: Expose the nested drawer stack's reveal step as `--wui-drawer-nested-peek-base`, and grow the stack logarithmically instead of by a constant step.
  
  The stack used to shift each layer inward by a hardcoded `12px`, so four drawers produced three identical 12px steps and a 36px total. Depth `d` now shifts by `A · ln(d + 1)`, so the total stack width is `A · ln(n)`: the first reveal is wide, each layer above it adds less, and the total no longer inflates linearly with depth. With the shipped defaults a four-layer stack of `320px` drawers reveals `37.43px` / `21.90px` / `15.53px` for a `74.86px` total on desktop, and `24.95px` / `14.60px` / `10.36px` for a `49.91px` total at `width <= 640px`. A single layer is unaffected, since `ln(1)` is `0`.
  
  `A` is a registered `<length>` custom property, so the desktop default is the `initialValue` the component passes to `CSS.registerProperty` and narrow viewports override the same token from a media query. Set it on the host (or any ancestor) to retune the whole stack, or to `0` to turn the reveal off; a consumer's unitless `0` is normalized to `0px` at computed-value time. The component also recomputes an open stack when the viewport crosses the breakpoint, so a stack that is already on screen does not keep offsets from the other base.
  
  The scaling and width compensation that position the cards are unchanged, as are drag-to-close, reduced motion, headless, and inset.
- 3c81816: Expose the desktop sidebar collapse toggle's width as `--wui-layout-sidebar-toggle-width` (default `44px`).
  
  `.sidebar-toggle` sets `--wui-button-width` on itself, and a declaration on the element beats an inherited value of the same name, so consumers could not resize it from the outside. Apps that shrink `collapsedWidth` were left with a toggle that no longer matched their collapsed panel. This routes the width through the variable so those apps can size it themselves: set the toggle width so that it plus its own `8px` horizontal margins fills `collapsedWidth` minus the `aside`'s `8px` left padding, which is the width of the collapsed panel. Values below `36px` are clamped by the button's own `--wui-control-size` floor.
  
  The default is unchanged: with the variable unset the toggle is still `44px` wide.
- 3c81816: Add two scale families to `<web-ui-theme>` and route component styles through them.
  
  **Typography tokens** are named by the role the text plays, not by scale position, matching
  the radius decision in ADR-0006 §6.3: `--wui-font-size-caption` (12px), `--wui-font-size-readout`
  (13px), `--wui-font-size` (14px), `--wui-font-size-title` (18px), `--wui-font-weight-medium`
  (500), `--wui-font-weight-semibold` (600), and `--wui-line-height-tight/snug/normal/relaxed`
  (1.2 / 1.4 / 1.5 / 1.6). Every `font-size`, `font-weight` and typographic `line-height` in the
  component layer now resolves through a family token with a literal fallback, so the fallback path
  still renders correctly with no theme present. `line-height: 1` and `0` and `font-size: 0` are
  deliberately left as literals: they are single-line centering and inline-gap-collapse techniques,
  not typographic values.
  
  **Spacing tokens** are a six-step 4px scale, `--wui-space-1` through `--wui-space-6`
  (4/8/12/16/20/24px). This is a documented departure from ADR-0006 §6.3's "no numeric scale"
  rule: radius has a handful of strong role names, but spacing appears at more than fifty call
  sites where one 8px serves as control gap, group gap and inline padding at once — role naming
  there would duplicate a single number into several mutually drifting tokens. The family
  does not replace the per-component override tokens (`--wui-button-px`, `--wui-dialog-padding`,
  and the rest); it supplies their fallback default, so each component still owns its own padding
  while the scale states where that value sits in the overall rhythm. Overriding a step therefore
  acts as a density lever across every migrated call site. It is a lever over rhythm only: offsets
  that align to the viewport edge or to the host's content edge are excluded by meaning even when
  they land on the 4px grid, and the override has to sit inside the `<web-ui-theme>` scope for the
  theme host to declare the step to its own subtree. The scale deliberately omits 1px, 2px, 6px,
  7.5px, 10px and negative values: those are hairline widths, optical corrections, an off-grid half
  step, and flex-gap cancellation respectively.
  
  **One behavior change beyond pure addition:** `--wui-radio-group-gap` and
  `--wui-checkbox-group-gap` now default to `var(--wui-space-2)` instead of the literal `8px`, so
  they are coupled to that step — overriding `--wui-space-2` on the theme host now also moves the
  gap between group members. Embedders are not broken: an explicit
  `--wui-radio-group-gap: 12px` still wins, exactly as before. The release is minor rather than
  patch because the new tokens widen the public surface; the retarget is a small, documented
  coupling change on top of that.
  
  **No rendered change.** Every migrated declaration keeps its original literal as the inner
  fallback, so computed values are identical with or without a theme ancestor; only the token
  reference is new.
  
  Both families are appearance-independent and are declared in the theme's base `:host` block
  rather than the light or dark blocks, so switching appearance never alters type metrics or
  spacing.
  
  `theme/__tests__/typography-spacing-scale.spec.ts` guards against drift from both directions:
  component CSS may not reintroduce bare typography literals, and every token defined in either
  family must have at least one consumer, so adding a step nobody uses fails the build instead of
  silently becoming dead public API.

### Patch Changes

- 3c81816: Fix `web-ui-context-menu` so closing it no longer steals focus back from a target the caller has already focused.
  
  On close the menu unconditionally called `focus()` on whatever was focused when it opened, after the exit transition had finished. When a menu item's action opened something that takes focus — an inline rename editor, for example — the caller focused it in a microtask, while the unconditional restore ran later in a macro task and pulled focus back to the pre-open element. That blurred the new editor, and because `web-ui-editable-text` commits on blur, the still-unchanged value was submitted as a fresh edit.
  
  The restore is now conditional: it runs only while the menu still holds focus. If focus has moved to a live element outside the menu, the menu leaves it alone. Ownership is read with `:focus-within` rather than `Node.contains(document.activeElement)` — the panel is mounted inside the overlay container's shadow root and menu items focus a control inside their own shadow root, so browsers report the shadow host and `contains` never matches.
  
  Normal restore is unchanged: Escape, keyboard navigation and outside clicks that leave nothing focused all still return focus to the element that had it when the menu opened. No public API is added; the behaviour is now documented in the README.
- 3c81816: Reconcile `header` and `footer` slot presence when a `<web-ui-drawer>` is reconnected.
  
  The drawer recomputed which of its two end sections have slotted content in `connectedCallback`, but never asked for a render afterwards. Lit's `connectedCallback` only calls `enableUpdating(true)` and `setConnected(true)` — it does not schedule an update — and the section visibility is decided during render, so the recomputed value was never put to use. The two `slotchange` handlers could not cover for it either: `slotchange` fires when a slot's _assigned set_ changes, and emptying the slot content between disconnect and reconnect leaves the assigned set where it was, so the event never arrives.
  
  The result was silent. A drawer whose `footer` content was removed while it was detached from the document came back with an empty footer section still laid out. The section keeps a real height from its own padding (32px by default), so the panel grew a dead strip along its end that swallows presses without doing anything, and the drag-to-close hit zone kept yielding to it — `--wui-drawer-drag-zone-inset` staying non-zero on a drawer that, per its own documentation, has nothing left to yield to.
  
  `connectedCallback` now requests an update whenever the reconciled presence differs from what it had, matching the discipline the `slotchange` handlers already use. The section collapses as soon as the drawer is back in the document and the drag zone returns to the panel edge.
- 3c81816: Fix `web-ui-layout`'s `header-glow` so its feather no longer ends in a hard band in Safari.
  
  `header` sets `isolation: isolate`, which makes it a local stacking context and a clipping boundary for its own `z-index: -1` pseudo-elements. The glow necessarily overflows that box, and `filter: blur()` extended the feather further outside the box still, where WebKit cuts it off. The result was a visible step at the bottom edge: the ramp reached a non-zero alpha and dropped straight to zero inside a single device row.
  
  Nothing now depends on drawing outside the box, so no cut exists. The colour is painted inside the box by a `linear-gradient`, and the real blur moved to a second pseudo-element whose `backdrop-filter` is faded to zero alpha by a `mask` before it reaches any clip line. Both layers expand with a negative `margin` rather than `transform: scale`, and the mask's alpha is already zero where the blur would have spilled out. The transparent endpoint is the bare `transparent` keyword rather than `color-mix(in srgb, var(--wui-color-page) 100%, transparent)`: colour mixing is premultiplied, so that expression resolves to the fully opaque colour and leaves no fade at all.
  
  Horizontal clipping, sticky behaviour and the glow's colour are unchanged, and the glow still follows the header's measured box, so it adapts to slot height as before.
- 3c81816: Fix `web-ui-dialog`, `web-ui-drawer` and `web-ui-image-preview` so opening one with a double click no longer leaves a document selection behind.
  
  `showModal()` promotes the panel into the top layer, and the browser re-resolves the still-live double-click selection against the new layout. The selection therefore landed on the dialog's or drawer's own just-mounted body text, leaving it visibly highlighted. The selection is created by the browser inside the `showModal()` call: no Selection API is invoked by script, and `preventDefault()` on `dblclick` does not stop it.
  
  Each component now clears the document selection right after the panel is promoted. Only the selection is cleared — no `user-select` is changed — so text inside an open panel is still selectable by dragging, and the existing `user-select: none` areas are unaffected. Opening an overlay also discards a selection that existed before the open, which the modal backdrop had already made unusable.
- 3c81816: Fix image preview staying invisible for relative image sources. Loaded images were tracked by
  their resolved absolute URL while the rendered `is-loaded` state was looked up by the
  caller-supplied source string, so the two never matched for a relative `src` and the image
  remained at `opacity: 0` even though it had loaded. Images that fail to load now also fade in
  so their alt text fallback is shown.
- 3c81816: Remove the unused `--wui-layer-base` custom property from `<web-ui-theme>`.
  
  **Breaking removal:** `--wui-layer-base` was a public custom property. It has no consumers in this repository, and no compatibility alias is kept. External consumers that read or override the old property must remove those references before upgrading.
- 3c81816: fix(web-ui): let a form-associated control actually leave the disabled state
  
  Re-enabling a control left it looking and behaving disabled: `<web-ui-button disabled>` with `disabled` set back to `false` kept the shadow `<button>` disabled, dimmed at 40% opacity and unclickable, while the host property, the host attribute and the component's own disabled getter all read `false`. Only a forced re-render cleared it. Lit reflects `disabled` _after_ it renders, and the browser delivers `formDisabledCallback` synchronously inside that reflection, so the follow-up `requestUpdate()` landed while `isUpdatePending` was still true and Lit dropped it — no second render ever came. `defineFormAssociation.setDisabled` now recognises that window and re-requests the update once the cycle ends, which covers every control that composes it (`web-ui-input`, `web-ui-textarea`, `web-ui-select`, the group controls and the rest), not just the button.
  
  `web-ui-button` also stops mirroring the state on its own: it composes the same shared form-association lifecycle instead of holding a private `ElementInternals` and `_formDisabled` copy, so the timing rule lives in one place. Its form behaviour is unchanged — it still owns an outer form for `submit`/`reset` forwarding and contributes no value to `FormData`.
- 3c81816: fix(web-ui): let `web-ui-button` drive its outer native form
  
  `type="submit"` and `type="reset"` now forward through the component host's form owner after the composed `click` event finishes (on the next task), so an unprevented activation submits or resets the owning `<form>` while a `preventDefault()` on the click still cancels it. The host declares `static formAssociated = true` and reads its live owner from `ElementInternals`; the rendered button remains in Shadow DOM without a form owner of its own, so `SubmitEvent.submitter` is `null` and the button contributes no value to `FormData`.
- 3c81816: Stop a tall context menu from spilling past the bottom of the viewport when it is opened near that edge. Clamping used `panel.getBoundingClientRect()`, which includes transforms, and the panel is mid-way through its enter animation `transform: scale(var(--wui-scale-enter, 0.95))` at exactly that moment. The clamp therefore sized the menu 5% smaller than it turns out to be: a 456px menu was positioned as if it were 433.2px tall, and once the animation settled back to `scale(1)` its bottom edge sat 14.8px below the viewport. The panel clips overflow and does not scroll, so the last item — often the destructive one — was cut off and could not be clicked or scrolled to.
  
  The arithmetic clamp has since given way to Floating UI. Positioning now runs `computePosition` with the trigger point as a zero-size reference: `flip` picks between opening below the trigger point and flipping above it when there is not enough room, and `shift` clamps both axes into the viewport, clearing `--wui-context-menu-safe-area-bottom` along the bottom edge. A tall menu opened near the bottom edge therefore flips above the trigger point with its bottom edge aligned to it, and is clamped into the viewport either way, so the last item stays reachable instead of being cut off.
  
  Sizing is still taken from untransformed dimensions. The panel is mid-way through its enter animation at exactly the moment it is positioned, and Floating UI's `getDimensions` falls back to `offsetWidth` / `offsetHeight` whenever a measured rect disagrees with them — the same protection the offset-based arithmetic gave, and still load-bearing: measuring the 95%-scaled rect would make the menu reserve less room than it ends up needing.
  
  This corrects both axes. The same inflated rect was feeding the horizontal clamp, so a menu opened near the right edge overflowed it by the same proportion (measured at 1.2px on a 414px-wide viewport, and scaling with menu width); both axes have their own regression guards, and the horizontal guard checks that the clamp was computed from the untransformed width rather than pinning an exact distance from the viewport edge.
- 3c81816: Fix `web-ui-context-menu` so its initial programmatic focus remains available for keyboard navigation without showing the accent focus highlight, while explicit keyboard navigation keeps the normal focus indicator.
- 3c81816: Fix `web-ui-context-menu` so clicks on interactive page content within its host, including list rows and checkboxes, light-dismiss the open menu while preserving the underlying interaction.
- 3c81816: Make `<web-ui-context-menu>` modal while it is open, and anchor its touch menu to the bottom of the viewport.
  
  The menu used to be an ordinary positioned element with a document-level click-outside listener. That arrangement cannot decide "outside" correctly when the host has its own interactive content: every row of light DOM sits outside the menu panel, so the check and the row activation were two consequences of the same `click` with nothing arbitrating between them, and the row underneath won. Right-clicking a resource row and then clicking elsewhere activated whatever was under the click — including a checkbox or a link — instead of only dismissing the menu.
  
  The menu now opens inside a transparent `<dialog>` put into the top layer with `showModal()`. Modal dialogs sit above every stacking context, so the "who has the higher z-index" constraint disappears rather than being re-tuned, and nothing below can be hit-tested while the menu is open. A click therefore lands either on the scrim (dismiss) or on the panel (activate); a click on the page underneath does not reach it at all. The scrim stays fully transparent on purpose — it exists to absorb hits, not to dim the page, and a dimming context menu is easily confused with the dialog and drawer scrims, which are visible bordered cards. Escape still goes through the shared overlay arbiter so one keypress closes exactly one layer; the native `cancel` is swallowed so the UA cannot close the scrim behind the component's back. A modal `<dialog>` also restores focus to the element that had it when `showModal()` ran, so focus return is now the platform's behaviour rather than something the component reimplements.
  
  Activating a menu item is the one case that cannot keep the scrim modal until the exit transition finishes. Item actions commonly hand focus onward — renaming a resource swaps the row for an inline editor and focuses its textarea — and a restore that lands afterwards pulls focus straight back out of that editor. Since `web-ui-editable-text` commits on blur, the still-unchanged title was submitted as a fresh edit. So an item activation releases the scrim's modality at the moment of the click, while focus is still inside the menu and the restore still lands on the opener; the action then takes focus and keeps it. Outside clicks, Escape and programmatic `close()` keep the dialog's default effect, which is the behaviour users expect there.
  
  The scrim's `::backdrop` has to be cleared explicitly as well. `::backdrop` is an independent pseudo-element that does not inherit the element's `background`, so `background: transparent` on the scrim left the UA default `dialog::backdrop` — `rgba(0, 0, 0, 0.1)` — painting a 10% black layer over the whole page the moment `showModal()` ran. Every element-level check still read transparent, because that layer is not on the element at all. Clearing it keeps the scrim invisible while it stays in the top layer. The dialog and drawer backdrops are left alone: those are deliberate visible card scrims.
  
  Touch long-press now opens the menu downward from the press point: its top edge sits at the press `y` and it is centred horizontally on the press `x`, matching how native iOS and Android long-press menus appear. When there is not enough room below, the panel flips above the press point instead of running off the screen, and both axes are clamped into the viewport while clearing the safe area. The safe-area inset reads `--wui-context-menu-safe-area-bottom` (default `env(safe-area-inset-bottom, 0px)`), which is overridable for notched-screen simulation.
  
  Placement is decided by Floating UI's `flip` and `shift` middleware rather than hand-rolled arithmetic, and touch and mouse now share a single `computePosition` pass. The two inputs differ only in horizontal alignment: touch centres on the press point, while a right-click keeps the menu's top-left corner at the cursor. Centring a right-click would drop the cursor inside the panel's top edge, which both contradicts the desktop convention and leaves an item permanently under the pointer, so the split is kept — by input, not by viewport width. Near an edge the panel stays fully visible and gives up the centring; a clipped menu is worse than a non-centred one.
  
  One visible consequence: during the ~160ms exit transition after an item activation the scrim is out of the top layer, so the page underneath becomes hit-testable again and the menu's stacking level is that of the normal flow. It is only reachable in that short tail, and only when the menu was opened over a drawer or dialog.
- 3c81816: Make the documented `--wui-dialog-max-height` custom property actually control `<web-ui-dialog>`. It has been listed in both READMEs as public API, but the dialog stylesheet never referenced it and hardcoded `max-height: min(90vh, 90dvh)` instead, so every consumer override was silently discarded. Consumers currently overriding it — the `AddDialog` and `RestoreDialog` in the Interweave frontend, which declare `min(82vh, 560px)` and `min(90vh, 640px)` — will now see those dialogs render at their declared height instead of the hardcoded viewport height.
  
  Consumers that do not set the token are unaffected: the fallback resolves to the same value as before. The `dvh` enhancement moved into an `@supports (height: 100dvh)` block rather than staying a second plain declaration. That matters because a `var()` fallback is substituted at computed-value time: on an engine without `dvh` support the substituted value would be invalid at computed-value time and `max-height` would fall back to `none`, which is worse than not having a token at all. The plain two-declaration form discarded the unsupported declaration at parse time instead.
  
  Both READMEs also now state the real default, `min(90vh, 90dvh)`, rather than `90vh`.
- 3c81816: Keep the drawer's drag capsule against the panel edge instead of letting the header/footer yield drag it along — and keep it grabbable while it sits there.
  
  The capsule was a child of the drag-to-close hit zone, and the zone yields to the header (`placement=bottom`) or the footer (`placement=top`) so it does not cover that section's buttons. Because the capsule was positioned against the zone, it inherited the whole yield: with a 56px header it sat 68px below the panel edge instead of the 8px its own midline calls for — pushed away from the edge it was meant to mark, and onto the panel's content. This was a side effect of the change that taught the zone to yield; that fix was correct, but the capsule travelled with it.
  
  The capsule and the zone are now siblings, both direct children of the dialog, so the yield stays the zone's business: the capsule is always placed against the panel edge and the zone still clears the section. The two constraints pull in opposite directions — returning the zone to `top: 0` does put the capsule back at the edge, but immediately puts the header back under the hit zone — so they are separated structurally rather than by tuning a number. The capsule keeps `position: absolute` inside the dialog's transform containing block, so it still travels with the panel during a drag.
  
  Moving the capsule to the edge does leave it outside the zone: the two bands cannot overlap, because "against the edge" and "clear of the header" are the same axis. On its own that makes the capsule a marker you cannot grab — precisely the configuration this change targets. So `top` / `bottom` now also render a thin edge band along the grab edge (12px tall by default), whose height is derived from the capsule's own midline token. That derivation is what makes the containment structural rather than conventional: the midline is floored at half the bar thickness plus 4px, so the capsule's band can never fall outside the edge band's. Pressing the capsule starts a drag and hovering it lights it up, on every placement. The left and right placements render no edge band and are untouched — the capsule already sat inside the zone there.
  
  The trade is explicit: the top strip of the header or footer becomes draggable rather than inert. That strip is only as wide as the capsule and centred with it — never the panel's full width — and that footprint ceiling is what keeps the built-in close button and header controls clear. The clearance follows from the band never covering more than the capsule does, measured across combinations of `--wui-drawer-drag-bar-thickness` and `--wui-space-4`, not from the close button happening to sit below the band's default height; an earlier draft of this change claimed it on that basis, and the claim did not survive a thicker handle. The close button's stacking level also moved above the band, which covers the remaining case where `--wui-drawer-drag-bar-length` is long enough for the handle to reach it. One boundary is inherent: a control placed inside the capsule's own span, whose top edge falls within the band's height, is covered by the band, because the band has to cover the capsule. `z-index` does not lift such a control clear — Chromium keeps the band above slotted content — and `--wui-drawer-drag-bar-length` is the lever, since it sets the capsule length and the band width together. The capsule stays `pointer-events: none`, so it itself never intercepts a press; that is also what keeps the hover/active and drag-close-confirm colours working, since a pointer over the capsule still hovers the surface underneath. Those three rules moved to general-sibling selectors to match the new structure — adjacent-sibling would silently stop matching the edge band — and the confirm state keeps the zone in its selector so it still outranks hover/active on specificity rather than source order.
  
  The public tokens are unchanged, and when the drawer is nested as a lower layer both the capsule and the edge band fade out with the zone.
- 3c81816: Stop the draw-to-close hit zone of a top or bottom drawer from covering its header or footer. The zone is an absolutely positioned sibling of the panel body, and `placement=bottom` pinned it at `top: 0` — exactly where the header starts, with a higher stacking order than the panel itself. Buttons under the header were neither clickable nor able to start a drag, and the whole header sat under a 20px transparent strip. `placement=top` was the mirror image, covering the footer rather than the header.
  
  Both zones now yield to the section they would otherwise cover: `bottom` clears the header, `top` clears the footer. The yield is measured from that section's border-box height with a `ResizeObserver`, written to `--wui-internal-drawer-header-inset` / `--wui-internal-drawer-footer-inset`, and consumed by the two placement rules — so a header whose height is dynamic (a narrow-viewport breakpoint rewriting it, consumer padding, slotted content wrapping) is followed rather than sampled once. With no header or footer present the yield is `0` and the zone sits exactly where it did before; the left and right placements are untouched, since they hug a vertical edge where neither section lives.
  
  The breathing gap between the zone and the section is exposed as `--wui-drawer-drag-zone-inset` (defaulting to `var(--wui-space-1, 4px)`) so it can be tuned on a device without rolling anything back.
- 3c81816: Fix native dialog presence so closing immediately after opening still plays the exit transition instead of removing the dialog abruptly.
- 3c81816: Make the whole header of a bottom drawer — and the whole footer of a top one — a drag-to-close starting area, and thicken the capsule's hit band.
  
  Yielding the drag zone to the header kept the header's controls clear, but it also left that section inert: with `placement=bottom` the only draggable strips were a 12px band along the grab edge and the zone below the header, so the 48px between them could not start a drag at all. On a touch device the handle was reported as far too small to hit.
  
  The section on the grab edge now takes the gesture itself. A press anywhere in it starts a drag, title text included. Controls are kept clear one at a time, at the event layer: a press whose composed path contains an interactive element — native `button` / `input` / `select` / `textarea` / `label` / `a[href]` / `summary`, anything `contenteditable`, an interactive ARIA `role`, or any explicit `tabindex` other than `-1` — reaches the control and starts no drag. Geometric cutting was rejected deliberately: it would have to measure each control's position, so it breaks as soon as a control moves, and it relocates the previous defect instead of removing it. A custom control that is not natively interactive needs a `role` or `tabindex` to be recognised, which is the right call for accessibility regardless.
  
  The capsule's hit band is now at least `--wui-drawer-drag-edge-size` (default `20px`, matching the drag zone's own default, so the handle is never harder to hit than the strip beside it), floored by the capsule's own outer edge so the capsule band stays fully covered by construction. The band was 12px before, derived from the capsule's midline alone.
  
  The drag zone still yields to the header or footer, the left and right placements are untouched, and with no header or footer present the geometry is exactly what it was. The built-in close button sits outside the capsule's span and stays clickable.
- 3c81816: Remove the hairline dividers between a drawer's header, content, and footer. `.wui-drawer-header` carried a `border-bottom` and `.wui-drawer-footer` a `border-top`, both the hard-coded literal `rgb(0 0 0 / 0.06)` — the only two occurrences of that colour left in the package. The panel body already carries the `.wui-glass` ring and shadow, and the sections read as separate through padding and typographic hierarchy; on a translucent glass surface the extra 6% black line read as a hard seam. It also followed no token, so it was a leftover that no appearance override could move.
  
  This is a visible change to how an open drawer looks: the two lines are gone, and header/content/footer now meet without a rule between them. Nothing about layout, sizing, or behaviour changes — the sections occupy exactly the same boxes, and the header's and footer's padding tokens are untouched.
- 3c81816: Make dropdown hover states use the neutral border background without changing text color, keep selected and active styling unchanged, and lower the shared menu panel background opacity in light and dark themes while preserving standalone fallback parity.
- 3c81816: Derive the focus indicator colour from the accent colour instead of hard-coding it. `--wui-color-focus-ring` was the literal expansion of the default accent (`rgb(0 136 255 / 0.4)` is `#08f` at 40% alpha), kept in sync by hand, so a consumer that overrode `--wui-color-accent` — which is the documented way to theme this package — got a focus ring that stayed the original light blue. The ring is now `color-mix()` of whatever `--wui-color-accent` currently resolves to, at 40% in light and 62% in dark; those two alphas are a tuning result and are kept distinct.
  
  The sixteen component-level fallbacks were rewritten as a chained `var(--wui-color-focus-ring, color-mix(...))` rather than as `color-mix` literals. The value of the chained form is that the fallback derives from the same accent instead of restating one, so a literal and a theme token can no longer drift apart. Note that this is not what the token-parity guard asks for: it skips fallbacks containing `var(` (the chained form is deliberately outside its literal comparison, since a chained fallback resolves differently per theme context), so these sixteen sites are now covered by `focus-ring-accent.browser.spec.ts`, which reads the real computed style off a mounted component instead of comparing expressions. With the default accent every one of these resolves to exactly the colour it did before, so nothing changes visually until an accent is overridden — including with no `web-ui-theme` at all, where the fallback's `#08f` + 40% is the same colour as the literal it replaces. `--wui-color-glass-ring` is untouched: it is an achromatic glass-lighting token that was never meant to follow the accent. The selected-state glow on `web-ui-radio` (previously `0 0 4px rgb(0 136 255 / 0.3)`, which had no custom property at all and so was not covered by the parity guard) now derives from the accent at 30%; it is a decorative glow rather than the focus ring, which is why its alpha differs.
- 3c81816: feat(web-ui): add three icons to `@greypan/web-ui/icons`
  
  `biCheckLg`, `akarIconsCircleCheck` and `fluentTagSearch24Regular` join the generated icon
  set. All three are additive exports — nothing is renamed or removed, so existing consumers
  are unaffected.
  
  They are the icon bodies the Interweave library surface needs: a roomier check mark for
  confirm actions, a filled circle-check for the same action in the add dialog, and a
  tag-search glyph to prefix the tag filter input.
  
  The new devDependency `@iconify-json/fluent` (catalog `^1.2.58`) is read only by the
  generator at build time. Icon bodies are inlined into the emitted modules, so no extra
  dependency reaches the published bundle.
- 3c81816: Darken light-mode surface tokens (sidebar and dropdown panels) one step for better layering.
- 3c81816: Stop `<web-ui-dialog>` and the other scroll-locking overlays from zeroing the page scroll position while they are open. `lockScroll()` pinned the body with `position: fixed` and `top: -scrollY` to suppress iOS rubber-band scrolling, which pulled the body out of the document flow: `documentElement.scrollHeight` collapsed and `window.scrollY` was reported as `0`. Anything positioning itself from the window scroll offset — a `@tanstack/virtual-core` list, for instance — then rendered the wrong rows while keeping its old offset, so a long list showed a blank screen whenever an overlay opened over it.
  
  The lock now only sets `overflow` and `overscroll-behavior` on the document element and leaves the body in flow. `scrollY` and `scrollHeight` stay intact for the whole time an overlay is open, so scroll-positioned content keeps rendering correctly. The restored scroll offset is no longer saved and replayed with `scrollTo`, because the position is never disturbed in the first place.
  
  This changes an observable side effect of the scroll lock: the body no longer gets `position`, `top`, or `width` written to it. Nothing in the package relied on it. It also adds `overscroll-behavior: none` while locked, which additionally suppresses pull-to-refresh and overscroll chaining — expected for a modal, but new. Refcounted nesting, the public signatures, and the non-overridden default rendering are unchanged.
- 3c81816: Make the segmented control's indicator land on the final value instead of lagging behind rapid taps. The indicator's `left` and `width` carry a 160ms transition, so tapping through several options restarted that transition each time — the second leg began from wherever the first leg had interpolated to, and the indicator stayed half a beat behind the selection, needing another full round to come to rest after the taps stopped.
  
  A value that now arrives while a move is still in flight lands immediately instead of queueing or restarting the interpolation. The flight window is one full `--wui-duration-trigger` from the latest change (rather than the remainder of the previous one, which would shrink with each successive landing and hand the last tap a full transition), and a request generation number discards stale expiry callbacks so an earlier window cannot clear a later landing state. A drag is not a tap sequence, so it does not open the window.
  
  Under reduced motion this needs no separate branch: the window is derived from `--wui-duration-trigger`, which is already zeroed there, so the gate degrades to "land every step" — the same appearance a 0ms transition has on its own. The window is not opened by the initial positioning, which is initialization rather than a move; opening it there would make the first tap after mount land instantly instead of showing the user the indicator's first animation.
  
  The gate turns off only the `left` and `width` transitions. It is a separate rule placed after the existing ready rule rather than a `:not(.is-settling)` added to it, because that would raise specificity from (0,3,0) to (0,4,0) and outrank the pressed-state rule that currently wins on source order — turning the press feedback's background-color from an instant switch back into an interpolated one.
- 3c81816: Assign stable instance ids to native inputs inside form component shadows so Chrome form-field audits stop flagging them.
- 3c81816: Keep theme view-transition direction based on the resolved appearance. `appearance="system"` now reveals with the dark direction when `prefers-color-scheme` resolves dark, while equal resolved appearances still skip the transition; explicit light/dark reveal directions are unchanged.
- 3c81816: Keep theme view-transition reveals running through pointer movement: only `pointerdown` and wheel call `skipTransition()`, while `pointermove` and `pointerup` no longer end the reveal. This removes the source-box and pointer-id exemptions and preserves prompt hit-test recovery for deliberate press or scroll input.
- 3c81816: Keep theme view-transition reveals stable when the initiating pointer emits follow-up events during the first 100ms: ignore only same-pointer movement or release inside the pointer-down target, while any genuinely new pointer or wheel input still skips the active transition and restores hit-testing promptly.
- 3c81816: Skip the active view transition on first pointer interaction so hit-testing stops targeting the document element during theme switch.
- 3c81816: fix(web-ui): stop `web-ui-context-menu` from dimming slotted content while disabled
  
  Setting `disabled` on `<web-ui-context-menu>` dropped everything a consumer put in the default slot to 40% opacity and switched the cursor to `not-allowed`. In `apps/interweave` that turned an empty library list into unreadable grey: the heading, its description and the icon wells all faded together.
  
  `disabled` only suppresses menu behaviour — `contextmenu`, `openAt()` and the ContextMenu key all return early, so no menu is ever rendered. There is no menu surface of its own to dim, and the only thing a host-level `opacity` could reach was the consumer's own trigger content. Disabling the right-click menu is not the same as disabling the trigger, so the host rule is gone. Consumers that want a visibly disabled state now render it themselves, which both demo apps already did.
- 3c81816: Give the drawer drag bar breathing room at the panel edge. The drag bar's visual center is still floored at half the bar thickness so it can never cross the panel's inner edge, but that floor now adds a further 4px: consumers that zero `--wui-drawer-content-padding` to fill the panel edge-to-edge previously ended up with the capsule sitting flush against the edge, which read as the handle being squeezed outside the border's shadow line. With the extra inset the capsule keeps a visible gap from the edge. The default 20px padding is unaffected, and the hit zone thickness is unchanged.
- 3c81816: Keep the drawer drag bar inside the panel when content padding is zero. The drag bar's visual center follows half of `--wui-drawer-content-padding`, now floored at half the bar thickness, so consumers that zero the padding to fill the panel edge-to-edge no longer push half the capsule past the panel's inner edge (where it stayed visible over the backdrop, since the dialog is `overflow: visible`). The default 20px padding is unaffected.
- 3c81816: fix(web-ui): widen the nested drawer reveal base at both breakpoints
  
  `--wui-drawer-nested-peek-base` ships at `54px` on desktop instead of `36px`, and at `36px` instead of `24px` where the viewport is `640px` or narrower. A four-layer stack of `320px` drawers now reveals `37.43px` / `21.90px` / `15.53px` per step for a `74.86px` total on desktop, and `24.95px` / `14.60px` / `10.36px` for a `49.91px` total on narrow viewports.
  
  The log curve compresses its deepest step hardest, because the fourth layer reveals only `A · ln(4/3)`, which is `0.288A`. At `A = 28`, a value tried during the visual pass, that step was `8.06px`, and at the `A = 36` this change starts from it was `10.36px`. Both sit in the same range as the hardcoded `12px` step the token replaced, so the innermost card of a four-layer stack did not read as a layer of its own. `A = 54` lifts that step to `15.53px`, where each card's edge and shadow stay distinguishable.
  
  Narrow viewports scale by the same `1.5x` instead of adopting the desktop value. A `320px` drawer on a `390px` viewport has only `390 - 8 - 320 = 62px` of room to its left, so a `74.86px` total stack would push the innermost layer off screen. The `49.91px` total leaves its left edge at about `12px`, on screen.
  
  The token name, the `A · ln(d + 1)` formula, the `640px` breakpoint, the scaling and width compensation, drag-to-close, reduced motion, headless, and inset are all unchanged. Setting the token on the host or any ancestor still overrides both defaults, and `0` still turns the reveal off.
- 3c81816: feat(web-ui): 收窄嵌套抽屉层间露边并把拖拽确认态改为中性灰
  
  - `--wui-drawer-nested-peek-base` 桌面基准 `54px` → `43.2px`，窄视口（`width <= 640px`）`36px` → `28.8px`，桌面:窄屏 3:2 比例不变。三处字面量（`CSS.registerProperty` 的 `initialValue`、媒体查询覆盖、JS 侧 jsdom 兜底常量）同步更新。
  - 拖拽手柄越过关闭阈值时的确认底色从 `--wui-color-accent` 改为实心中性灰，与 hover/active 的灰阶对齐。
- 3c81816: Flush the drawer's current layout before switching to the exit transition so WebKit reliably starts the transition when closing immediately after opening.
- 3c81816: Stop `web-ui-dropdown` from painting the accent `:focus-visible` highlight on its first item when opened by pointer, matching the existing context-menu behavior in WebKit. Keyboard-activated opens keep the highlight, and the first arrow keypress always restores it.
- 3c81816: feat(web-ui): add `mdiTagSearchOutline` to `@greypan/web-ui/icons`
  
  `mdiTagSearchOutline` is the Material Design Icons tag-search glyph, added for the
  Interweave library tag filter prefix. It is a new export: nothing is renamed or removed.
  
  `fluentTagSearch24Regular` stays in the generated set. It arrived in the same unreleased
  batch as `biCheckLg` and `akarIconsCircleCheck`, and this change leaves it without an
  in-repo consumer, so it is kept only so both tag-search glyphs stay available to choose
  from. Neither icon has shipped in a published version, so keeping it is not a
  compatibility constraint.
  
  The new devDependency `@iconify-json/mdi` (catalog `^1.2.3`) is read only by the icon
  generator at build time. Icon bodies are inlined into the emitted modules, so no extra
  dependency reaches the published bundle.
- 3c81816: fix(web-ui): move the header glow's horizontal clip off the header
  
  `web-ui-layout` with `header-glow` showed a hard seam at the header's bottom edge in Safari: content scrolled underneath the sticky header met a sharp cut instead of a fade.
  
  The glow is a `::before` pseudo-element with `inset: 0` and `transform: translateY(-50%) scale(1.05, 2)`, so it deliberately extends half a header height past the header box — that overhang is what feathers into the content below. `header` carried `overflow-x: clip` to stop the glow's horizontal scale from pushing out a page scrollbar, but WebKit applies that clip to both axes, cutting the vertical overhang and with it the fade. Chrome only clips the declared axis, which is why the seam was Safari-only.
  
  The clip now lives on `.layout-content`, which already has `min-width: 0` and is the box that actually contains the horizontal overflow; `header` keeps `overflow: visible`. `clip` does not create a scroll container, so the sticky behaviour of the header and tabbar is unchanged.
  
  Because the clip box is now the content column rather than the header, horizontal overflow from `main` or `tabbar` slot content is clipped instead of producing a page-level horizontal scrollbar. Consumers that need wide content to stay reachable should keep it inside their own `overflow-x: auto` container.
- 3c81816: Remove the `--wui-layout-header-glow-color` custom property from `<web-ui-layout>`'s `header-glow`; the glow now reads `--wui-color-page` directly.
  
  **Breaking removal:** `--wui-layout-header-glow-color` was a public custom property, and no compatibility alias is kept. External consumers that set it must override `--wui-color-page` on `web-ui-layout` instead.
  
  The property was declared on the layout's own `:host`, so it shadowed any value set on an ancestor — including `<web-ui-theme>`. A theme could therefore never change the glow's colour, and the only place an override worked was on the `web-ui-layout` element itself. Reading the theme token directly makes the glow follow light and dark appearance like every other semantic colour, and lets an override set at the theme, the page or the layout take effect.
  
  Two pseudo-elements back the glow: `::before` paints the colour as a `linear-gradient` inside the header box, and `::after` adds a real `backdrop-filter: blur(4px)` layer masked to zero alpha before it reaches any clip line. Separating them means blur strength and colour strength no longer pull on each other.
- 3c81816: Lighten the menu-family panel surface from `rgb(254 254 254 / 0.76)` to `rgb(250 250 250 / 0.76)` so select, dropdown, context-menu, popover, tooltip and autocomplete panels match the rest of the light surfaces.
- 3c81816: Make the overlay surface more opaque and drop the glass ring base color on menu panels
  
  `--wui-color-surface-overlay` (shared by dialog, drawer and toast) moves to
  `rgb(248 248 248 / 0.92)` in light and `rgb(32 34 34 / 0.92)` in dark, so the
  content behind an open overlay reads less through it.
  
  `--wui-color-glass-ring` is now overridden to `transparent` locally on the menu
  popover surfaces (popover, tooltip, select, autocomplete, dropdown and context
  menu panels) and on the pressed/dragging state of the switch, slider and
  segmented handles. The token definition itself is unchanged. The border ring
  falls back to the four corner arcs drawn by its sheen and shade layers, which
  means wide menu panels no longer carry a straight border segment along the
  middle of their long edges.
- Updated dependencies [3c81816]
  - @greypan/js-kit@3.0.1
  - @greypan/browser-kit@3.0.1

## 8.1.0

### Minor Changes

- ed2652b: Add `--wui-button-group-divider-length` to `<web-ui-button-group>`. The divider between adjacent grouped buttons was a fixed 24px line with no way for a consumer to reach it — it lives in the child button's shadow root and that span is not exposed as a part — so the only alternative was dropping the group entirely and losing the shared glass pill.
  
  The token sets the divider's long edge and defaults to 20px, so every grouped button pair gets a shorter rule than the 24px line it drew before; its cross axis stays 1px. Because it drives the long edge rather than a fixed axis, one value works for both `direction="horizontal"` and `direction="vertical"`.
- ed2652b: feat(web-ui): draw the checkbox checkmark from akar-icons:check
  
  `<web-ui-checkbox>` now strokes `akar-icons:check` where it drew `tabler:check`. Both are
  round-capped 24-unit glyphs with `stroke-width="2"`, so the render path is untouched; what
  changes is the geometry — `m4 12l6 6L20 6` starts its tail a unit further left and lifts the
  tip a unit higher than `m5 12l5 5L20 7`, which reads as a longer, more open tick inside the
  18px indicator.
  
  The swap keeps the precondition the draw animation depends on: the asset stays `fill: none` +
  `stroke: currentColor`, so `<web-ui-svg-draw-lines>` animates a stroke instead of revealing a
  solid mark. `checkbox.motion.browser.spec.ts`, which pins that, still passes.
  
  `@greypan/web-ui/icons` loses `tablerCheck` and gains `akarIconsCheck`. `tablerCheck` was added
  on this unreleased line and never shipped, so no published consumer sees a removal, and
  `@iconify-json/tabler` stays a devDependency for `tabler:sort-ascending-letters`. The new
  devDependency `@iconify-json/akar-icons` (catalog `^1.2.7`) is only read by the generator at
  build time — icon bodies are inlined into the emitted modules, so nothing extra lands in the
  published bundle.
- ed2652b: feat(web-ui): render the checkbox checkmark as an icon asset
  
  `<web-ui-checkbox>` drew its checkmark from a path the component carried itself. It now renders a stroked check from `@/icons` through a nested `<web-ui-icon>`, inside the same `<web-ui-svg-draw-lines>` wrapper, so the indicator is an asset like every other glyph in the library rather than a hand-held exception. The draw-in and retract, the `--wui-duration-trigger` timing and the `motion="reduced"` bypass all keep working: `<web-ui-svg-draw-lines>` reaches geometry inside nested open shadow roots, and the check's color arrives through `<web-ui-icon>`'s `--wui-icon-color`, set to `--wui-color-on-control` — the token radio's dot and switch's thumb use — so it stays legible on the accent-filled indicator.
  
  Two visible consequences. The stroke weight follows the asset (`stroke-width="2"` on a 24-unit canvas, previously 3), so the check is a step thinner. And it renders at `<web-ui-icon>`'s own default 18px: the host cannot reach the `<svg>` inside the icon's shadow root, so enlarging `--wui-selection-control-size` now grows the indicator box without scaling the check inside it.
  
  The asset has to stay stroked (`fill: none` + `stroke: currentColor`). A solid icon is a silent failure here — `<web-ui-svg-draw-lines>` animates `stroke-dashoffset`, which affects only stroke painting, so the animation runs to completion while the check simply appears. `checkbox.motion.browser.spec.ts` now pins `fill: none` and the on-control stroke to keep that precondition from regressing, and both checkbox motion specs observe the icon's nested shadow root, since `ShadowRoot.getAnimations()` does not cross into it.
- ed2652b: fix(web-ui): size a size-less Iconify icon on the spec's 16×16 canvas
  
  `<web-ui-icon>` derived its `viewBox` from `icon.width`/`icon.height` and fell back to `24` when the data object declared neither. Iconify's own default canvas is 16×16 (`@iconify/types` README), so the fallback was the one value the spec does not allow: a size-less 16-unit icon was squashed into the top-left quarter of a 24-unit box instead of filling it. The fallback is now `16`, and generated assets no longer rely on it — `scripts/generate-icons.ts` resolves the merge chain (icon → icon set → spec default) before writing, so `@iconify-json/bi`, which publishes no root canvas for any of its 2084 icons, now emits `width: 16, height: 16` rather than leaving the size to the renderer.
  
  The published behavior difference is for consumers who hand a raw `IconifyIcon` object to `.icon` and declare no canvas on it: such an icon renders at a different scale than before. Every icon object that declares its `width`/`height` renders as it did, which covers all assets exported from `@greypan/web-ui/icons` in the previous release — `biCheck` is new on this branch and had never rendered at the right scale.
- ed2652b: fix(web-ui): stop `<web-ui-radio>` and `<web-ui-checkbox>` from reserving space for a label they do not have
  
  The trigger row is an `inline-flex` with `gap: 10px`, and the host is sized by its content, so a control with nothing renderable in its default slot measured 28px for an 18px indicator: a gap only knows there is a flex item there, not that the item has no width. Every standalone control hit that, and so did the usual accessible-name workaround of slotting one visually hidden (`.sr-only`) span — that content is assigned to the slot but paints no box.
  
  The row now collapses the gap when the label's rendered width is 0, tracked through one `ResizeObserver` shared by all selection controls rather than one per instance. Emptiness is deliberately measured instead of asked of the slot: `slot:empty` reads the slot's own child nodes, and assigned nodes are not its children, so an assigned-but-invisible label would have looked non-empty. The other candidate — hiding the label — is the wrong one, since `display: none` takes the slotted accessible name out of the accessibility tree along with the space.
  
  A control whose label paints is unaffected: the 10px between indicator and text stays, as does hovering that gap to tint the indicator. A standalone or hidden-name-only control is now exactly `--wui-selection-control-size` wide, so it lines up with the content around it instead of trailing 10px of dead space. `shared/label-emptiness/__tests__/selection-label.browser.spec.ts` pins the host width for empty, `.sr-only`-only and labeled controls, the collapse when a label is removed at runtime, and the convergence for a control that mounts inside a `display: none` subtree.
- ed2652b: Add a public `select()` to `<web-ui-input>` so callers can select the full current value through the component API instead of reaching into its shadow root or using deprecated `document.execCommand`. `<web-ui-textarea>` already exposed the same method; both now share an explicit `disabled` no-op and remain safe when the native control has not rendered.
  
  The consistency review also adds `readonly` to `<web-ui-editable-text>`: it keeps focus, selection, and copying available while rejecting input and leaving edit mode without a `change`, matching the read-only contract of `<web-ui-input>` and `<web-ui-textarea>`. Existing `value` read/write, `input`/`change` paths, form association, and the documented non-reflected `value` attribute on `<web-ui-editable-text>` remain backward compatible.
- ed2652b: Expose `<web-ui-theme>`'s resolved color scheme as the read-only reflected `resolved-appearance` attribute and `resolvedAppearance` property. The value is always `light` or `dark`: explicit appearances pass through, `system` follows `prefers-color-scheme` and updates live on OS flips, and a missing `appearance` reports the default `light`. The component owns and restores the attribute, so consumers can bind CSS selectors or Tailwind custom variants to it without maintaining a second theme state; existing View Transition behavior is unchanged.

### Patch Changes

- ed2652b: fix(web-ui): let a form-associated control actually leave the disabled state
  
  Re-enabling a control left it looking and behaving disabled: `<web-ui-button disabled>` with `disabled` set back to `false` kept the shadow `<button>` disabled, dimmed at 40% opacity and unclickable, while the host property, the host attribute and the component's own disabled getter all read `false`. Only a forced re-render cleared it. Lit reflects `disabled` _after_ it renders, and the browser delivers `formDisabledCallback` synchronously inside that reflection, so the follow-up `requestUpdate()` landed while `isUpdatePending` was still true and Lit dropped it — no second render ever came. `defineFormAssociation.setDisabled` now recognises that window and re-requests the update once the cycle ends, which covers every control that composes it (`web-ui-input`, `web-ui-textarea`, `web-ui-select`, the group controls and the rest), not just the button.
  
  `web-ui-button` also stops mirroring the state on its own: it composes the same shared form-association lifecycle instead of holding a private `ElementInternals` and `_formDisabled` copy, so the timing rule lives in one place. Its form behaviour is unchanged — it still owns an outer form for `submit`/`reset` forwarding and contributes no value to `FormData`.
- ed2652b: fix(web-ui): let `web-ui-button` drive its outer native form
  
  `type="submit"` and `type="reset"` now forward through the component host's form owner after the composed `click` event finishes (on the next task), so an unprevented activation submits or resets the owning `<form>` while a `preventDefault()` on the click still cancels it. The host declares `static formAssociated = true` and reads its live owner from `ElementInternals`; the rendered button remains in Shadow DOM without a form owner of its own, so `SubmitEvent.submitter` is `null` and the button contributes no value to `FormData`.
- ed2652b: Make dropdown hover states use the neutral border background without changing text color, keep selected and active styling unchanged, and lower the shared menu panel background opacity in light and dark themes while preserving standalone fallback parity.
- ed2652b: Darken light-mode surface tokens (sidebar and dropdown panels) one step for better layering.
- ed2652b: Assign stable instance ids to native inputs inside form component shadows so Chrome form-field audits stop flagging them.
- ed2652b: Keep theme view-transition direction based on the resolved appearance. `appearance="system"` now reveals with the dark direction when `prefers-color-scheme` resolves dark, while equal resolved appearances still skip the transition; explicit light/dark reveal directions are unchanged.
- ed2652b: Keep theme view-transition reveals running through pointer movement: only `pointerdown` and wheel call `skipTransition()`, while `pointermove` and `pointerup` no longer end the reveal. This removes the source-box and pointer-id exemptions and preserves prompt hit-test recovery for deliberate press or scroll input.
- ed2652b: Keep theme view-transition reveals stable when the initiating pointer emits follow-up events during the first 100ms: ignore only same-pointer movement or release inside the pointer-down target, while any genuinely new pointer or wheel input still skips the active transition and restores hit-testing promptly.
- ed2652b: Skip the active view transition on first pointer interaction so hit-testing stops targeting the document element during theme switch.

## 8.0.0

### Major Changes

- 62bdbec: Remove the `transition` prop from `<web-ui-theme>`; whether an appearance change plays the View Transitions reveal is now decided by the existing `motion` prop alone (issue #156).
  
  **Breaking:** the `transition` boolean attribute/property no longer exists. Writing it is a silent no-op instead of enabling the reveal, and the reveal is no longer opt-in: a theme scope animates by default now.
  
  The three `motion` tiers own the decision:
  
  - `motion="full"` always plays the circular reveal.
  - `motion="reduced"` applies the new appearance immediately, with no reveal.
  - `motion="system"` (the default) follows `prefers-reduced-motion`.
  
  Everything else about the reveal is unchanged: a root theme reveals the whole page, a nested theme reveals only its own capture box, the origin is the last pointer-down position (falling back to the theme box or viewport center), the two directions are reversed, and unsupported browsers, reduced-motion scopes, zero durations and an in-flight request still commit the new appearance immediately. The window listeners that record the reveal origin are registered for as long as a theme is connected, instead of only while `transition` was set.
  
  Migration:
  
  ```html
  <!-- before: reveal opt-in through transition, motion left at its default -->
  <web-ui-theme appearance="light" transition></web-ui-theme>
  <!-- after: same reveal, motion="system" is now the switch -->
  <web-ui-theme appearance="light"></web-ui-theme>
  
  <!-- before: no reveal, because transition was absent -->
  <web-ui-theme appearance="light"></web-ui-theme>
  <!-- after: still no reveal, but it has to be stated -->
  <web-ui-theme appearance="light" motion="reduced"></web-ui-theme>
  
  <!-- before: transition forced the reveal on, motion kept it out of the way -->
  <web-ui-theme appearance="light" transition motion="full"></web-ui-theme>
  <!-- after: motion="full" is the whole switch -->
  <web-ui-theme appearance="light" motion="full"></web-ui-theme>
  ```
  
  The one combination that loses a distinct meaning is `transition` together with `motion="reduced"`: it never animated, and `motion="reduced"` on its own now describes it exactly, so dropping `transition` is the whole migration there.

### Minor Changes

- 62bdbec: feat(autocomplete): add a `trigger` slot so the default input can be replaced by any editable component
  
  The default trigger is now an internal `web-ui-input`, following the `web-ui-select` wrapper-div pattern: the wrapper div carries the combobox ARIA, marks itself with `data-custom-trigger` when a custom trigger is present, and hosts `slot[name="trigger"]`. The panel stays anchored to the trigger element, and the `trigger` slot stays on the host while options migrate into the portal panel.
  
  Delegation is shared between the two triggers: `value`, `input`, `click`, `focus` and `blur` are read and forwarded through the trigger, so a custom trigger only needs a string `value` property and has to be focusable. `web-ui-input` and `web-ui-textarea` work as-is.
  
  Multiline triggers (a trigger whose editable element is a `<textarea>`) keep Enter for newlines: Enter no longer selects the highlighted option nor commits a custom value, so close the panel with Escape or blur. Selecting an option still writes its label back to the trigger.
  
  While the panel is open in a multiline trigger, ArrowUp/ArrowDown move the text caret instead of navigating options (same exception as Enter); with the panel closed they still open it. The trigger wrapper div is never a tab stop (`tabindex="-1"`) — sequential focus belongs to the trigger itself, which has to be focusable per the documented contract.
  
  Adds public `focus()` / `blur()` methods to `web-ui-autocomplete`: they delegate to the active trigger (the default `web-ui-input` or the custom trigger), so consumers can focus the field without reaching into internals. `web-ui-input` gains the matching public `focus()` / `blur()` — the host itself is not focusable, so `focus()` on it used to be a no-op; `web-ui-textarea` already had them.
- 62bdbec: Add a public `select()` method to `<web-ui-editable-text>`: it enters edit mode with the whole content selected, and only re-selects when already editing. While `disabled` it does nothing, matching `focus()`.
- 62bdbec: Add `<web-ui-editable-text>`, an inline plain-text editor. Clicking the text edits it in place with the caret at the clicked offset, `Enter` and `blur` both commit the draft and dispatch `change` exactly once (`Enter` does not insert a newline and returns focus to the host; `blur` leaves the focus where the user moved it), and `Escape` alone cancels, restoring the value from the moment editing started and dispatching a non-bubbling `cancel`. The text layer and the editing layer share one box, so entering edit mode does not shift the rendered text by a single pixel, and the editing layer always sizes itself to its own content, so an empty or whitespace-only draft still has room for the caret even where the host itself collapses. The caret follows the shared `--wui-color-accent` semantic token by default, and both layers break a long unbroken string at the same points (`--wui-editable-text-overflow-wrap`, default `anywhere`), so a token wider than the box wraps inside the box instead of overflowing it while idle. The `cancel` event neither bubbles nor crosses shadow boundaries and is dispatched on the component itself only, so the component can sit inside an overlay such as a drawer title without its cancel reaching the overlay's native close pipeline; listen on the component itself. The component is form-associated: it submits through `FormData` and restores the declarative `value` on `form.reset()`.
- 62bdbec: `<web-ui-theme>` now mirrors the computed `--wui-color-page` of its outermost active instance onto `document.documentElement` as an inline custom property. Custom properties stop inheriting at the document element, so a consumer rule such as `body { background: var(--wui-color-page) }` colored only the scrollable area and left the canvas behind an overscroll bounce at the user-agent background; with the mirrored property the bounce area follows the theme. The value is written when a theme connects and whenever its appearance changes, including `appearance="system"` following an OS light/dark flip, and it is the theme's computed value, so an override on the host is mirrored as it stands. Nested themes never write the root value; ownership follows connect order and passes to the next connected theme when the outermost one disconnects, and the value is deliberately kept rather than removed when the last theme disconnects so a page that swaps themes does not flash back to the user-agent background.

### Patch Changes

- 62bdbec: Segmented labels stay `--wui-color-text-secondary` in both variants: the accent label coloring and the drag-time `is-covered` marking are removed, and selection is carried by the indicator alone. In light mode the inset track now matches the page background instead of the raised surface, so the thumb reads as seated in a slot.
- 62bdbec: `<web-ui-segmented>` gains a `variant` attribute/property (`inset` | `raised`, default `inset`; illegal values fall back to `inset`):
  
  - `inset` ("sunken") renders the track as an opaque surface (`--wui-color-surface-raised`, no backdrop filter); its 1px ring and drop shadow stay constant across rest, press and drag. The indicator rests as a solid `--wui-color-surface-segmented` pill with all glass output off.
  - `raised` ("raised") restores the classic flat `--wui-color-surface-segmented` track (no ring, no shadow) with a solid `--wui-color-surface-selected` resting indicator carrying a soft shadow.
  
  In both variants the pressed/dragged indicator is fully transparent glass — backdrop blur, ring and highlight — with a 1.5x scale, easing back to the resting surface on release. Every label keeps `--wui-color-text-secondary`, checked or not, in both variants and through a press or drag; selection is carried by the indicator alone.
- 62bdbec: fix(overlay): an anchored panel now stays registered for the whole exit transition instead of dropping out of the registry the moment `open` flips to false. While it is still on screen it keeps swallowing Escape rather than letting the key fall through, and re-opening mid-exit hands arbitration to the new session. When the transition has already finished but the host still reports open, the layer hands arbitration back so Escape reaches the host's close entry instead of being swallowed by an invisible panel forever. When another overlay is open that one still takes the Escape, so one Escape still closes exactly one layer (issue #138).
  
  fix(overlay): open-overlay layers whose panel and host are both detached from the document are now reclaimed lazily, so a component that never releases its handle no longer pins the layer registry or the document keydown listener forever. Reclamation runs before a new layer is built rather than after, so claiming a panel that is not mounted yet no longer deletes the layer on the spot — it keeps its place and joins arbitration once attached (issue #139).
- 62bdbec: Dark-mode dropdown menus and the sidebar regain their translucent feel: the menu alpha drops to 0.78 and the sidebar to 0.8 while keeping the lighter surface color, so the panels read as glass one step above the page.
- 62bdbec: Register the view-transition capture cleanup of `web-ui-theme` before writing `document.adoptedStyleSheets`, and let the restore step tolerate a setter that rejects the write (issue #146).
  
  - A synchronous throw from the `adoptedStyleSheets` setter used to reach the appearance setter's `.catch` with an undefined cleanup: the inline `view-transition-name` and `display` written for the nested-theme capture box stayed on the host and poisoned every later view transition. The cleanup is now registered before the write, so the failure path restores the capture state and still commits the final appearance.
  - The restore step no longer lets a rejected `adoptedStyleSheets` write abort the host inline-style recovery.
  - A jsdom regression test covers the throwing-setter path, including a guard that the transition really reached the write.

## 7.0.0

### Major Changes

- 5be1ee4: Replace the toast imperative API's dedup-and-drop behavior with upsert semantics, and retire `toast.updateMessage()`.
  
  Repeated calls that pass the same `id` now converge on one toast instead of silently discarding the update: supplied fields overwrite, omitted ones keep their value, and the call returns that toast's id in both cases. `duration` restarts the countdown only when passed explicitly; changing `position` moves the element to the new container and keeps the remaining time. `container` and `target` are read from the first call only.
  
  A toast that is already exiting, or that a host pulled out of the DOM, no longer counts as mounted: the call creates a new toast instead of patching one that is about to disappear, and the exiting element keeps its own `toast-close` bookkeeping — a late `toast-close` can never remove a toast that reused the same id.
  
  The `error` shortcut's 5000 ms default is applied at mount instead of being injected into every call, so it no longer counts as an explicit `duration`: repeated `toast.error(msg, { id })` calls keep the running countdown. As a side effect the generic `toast({ type: 'error' })` form now defaults to 5000 ms too, which is what the option table documented all along.
  
  `toast.close(id)` and `toast.clear()` now also cover the states before a toast becomes visible. An id still queued in the current microtask is dropped before it mounts (nothing appears, no event is emitted), and a toast that is mounted but whose `show()` has not run yet emits `toast-close` immediately instead of ignoring the call. Both windows used to swallow the request silently, so the toast appeared anyway. A toast whose auto-close countdown elapsed while the main thread was blocked also closes on resume instead of staying open forever after a `position` upsert.
  
  The old dedup checked only mounted toasts, so two calls inside one microtask both mounted (two elements sharing one `toastId`). The second element was unreachable from the manager: `removeToast()` returned early for ids it did not know, so neither `close()`, `clear()` nor the natural timeout could remove it, and it stayed in the `role="log"` container forever.
  
  Migration:
  
  ```ts
  toast.updateMessage(id, { message: 'new message', heading: 'new heading' }) // before
  toast({ id, message: 'new message', heading: 'new heading' }) // after
  ```
  
  `ToastMessageUpdateOptions` is removed.

### Minor Changes

- 5be1ee4: Align the drawer's drag-to-close decision with Base UI `useSwipeDismiss` step by step: the flick is judged by the average velocity over the whole gesture, the decision origin and clock are calibrated to the first move, and a change of mind cancels the flick — so sweeping back towards the edge no longer closes the drawer.
  
  - The displacement origin and the decision clock both reset to the first `pointermove`, matching upstream's `dragStartPos` / `swipeStartTime` reset in the `trackDrag` branch. The gap between the press and the first move — on iOS touch the first `touchmove` already arrives offset from the `touchstart` — is absorbed instead of being cashed in on that first move as a jump. Its whole travel is discarded with it, so a gesture now needs at least two moves to accumulate any displacement.
  - The flick test moves from "the 100ms sliding-window velocity at release" to "net displacement ÷ whole-gesture duration", with the denominator floored at 50ms to match `MIN_VELOCITY_DURATION_MS`, and the comparison becomes `>= 500px/s` to match `FAST_SWIPE_VELOCITY`'s `>=`. A zero-length duration yields zero velocity rather than a floored divisor, matching upstream's `durationMs > 0 ? … : 0` guard, so an unmeasurable gesture is never read as a flick. A sliding window only describes the last short stretch of the trace: after dragging out past the overscroll range and sweeping quickly back, the window velocity at release is just as high, so a net displacement of barely a dozen pixels used to read as a flick and close the drawer. Under whole-gesture average velocity that same gesture cannot reach 500px/s without at least 25px of net displacement towards closed.
  - Any gesture whose net displacement does not point towards closed (`<= 0`) rebounds, matching the `directionalDelta <= 0` guard in `useSwipeDismiss`; the old `displacement > 8px` fallback is removed with it.
  - The change-of-mind guard is now wired up, and it is what actually stops the reverse sweep. A withdrawal of `10px` or more from the point where the close direction was confirmed marks the gesture as a change of mind and the flick branch refuses to close; displacement that has already crossed the distance threshold clears the mark again, matching upstream's cleanup condition, so a gesture that is past half way is unaffected by a small retreat. Upstream has the same guard, but its only consumer is short-circuited by `!hasReleaseDecision` and `DrawerViewport.onRelease` always returns a decision once the direction is locked, so on the drawer path it was dead code.
  - The distance threshold changes from one third of the drawer size to one half, via `max(size * 0.5, 10)` matching `getBaseSwipeThreshold()`'s `Math.max(size * 0.5, MIN_SWIPE_THRESHOLD)`. The 10px floor keeps the threshold non-zero when the size cannot be measured, so the drawer never closes on the slightest movement. The distance test now also measures net displacement rather than the absolute position, matching upstream's `directionalDelta = dragOffset − initialTransform`: grabbing the drawer mid-rebound and releasing without dragging further no longer counts as "already past half way". The trigger pill's accent confirmation follows the decision exactly — same quantity (net displacement) and same threshold — so the feedback can no longer light up on a gesture that will rebound.
  - Dragging in the opening direction is damped by a square root (`sign(d) * |d| ** 0.5`) instead of a linear `0.15` factor capped at `10%` of the drawer size, matching `applyDirectionalDamping`. It self-limits as the displacement grows, so no cap is needed, and it applies to the gesture's increment added on top of the offset the drag started from (`base + damp(delta)`), the way upstream adds it to the frozen initial transform rather than damping the total.
  - `DragEndInfo` gains a `duration` field and `attachDragGesture` a `calibrateOnFirstMove` option (both internal to the shared gesture layer, not part of the package's public export surface) so a consumer can judge intent over the whole gesture.
  - The backdrop-click dismissal now honors only a genuine tap chain. The browser targets the click of a press-drag-release at the common ancestor of the press and release points, so pressing on the panel content — or on the backdrop itself — dragging towards the mask and releasing there produced a click with `dialog` as its target, closing the drawer through the backdrop branch even though nothing like a tap happened. The dialog now records the `pointerdown` origin and coordinates, and a click closes only when the press started on the backdrop and the press-to-release travel stays within the tap magnitude (10px). A `detail`-0 click (keyboard activation, programmatic `.click()`) never consumes the record, matching the guards image-preview already uses. The remaining close paths are unchanged: a near-stationary tap on the mask still closes. With the backdrop press record in place the drag hit zone no longer needs to extend past the panel edge — a press landing 1–2px outside the panel belongs to the backdrop, where the tap-distance validation (not the gesture) decides whether it closes.
  
  The public API and event contract are unchanged, as are the timing and count semantics of `open-change`.
- 5be1ee4: Move the drawer's post-release settle animation (rebound to open, or slide out to closed) from a JS spring driven by WAAPI `element.animate()` sampling to a CSS transition (issue #123).
  
  - Dragging still writes an inline `transform` with `transition: none`; on release the final value is written and `transform` is handed back to CSS entirely, so the rebound is one single transition — no `element.animate()`, no `fill`, no `onfinish` anywhere in the path.
  - Release velocity no longer samples a spring trajectory; it only estimates the transition duration (180–420ms). The overshoot feel is approximated by easing curves matching the old spring's damping ratio: no overshoot towards closed, roughly 3% overshoot on rebound.
  - No JS→CSS handoff boundary is left, so the implementation is immune to Safari not honouring WAAPI fill overrides when it computes the before-change style; the reflow-baking patch introduced in r3 to work around that quirk is removed.
  - The public API and event contract are unchanged. Two internal variables, `--wui-internal-settle-duration` and `--wui-internal-settle-easing`, are added for the settle transition and are not part of the public token contract.
- 5be1ee4: Reconcile an open dropdown when its host is re-attached, so a remount while open no longer leaves the control stuck in an un-closable open state (issue #120).
  
  `disconnectedCallback` tears the panel down and migrates the menu items back to the host, but `open` is a public property and is not rewritten by an unmount. Lit does not record `changedProperties` while a host is disconnected, so after a remount `updated()` never hits the `open` branch again: the host kept reflecting `open` and `aria-expanded="true"` while there was no layer for Escape or an outside click to close. A framework that re-creates the host while it is open — a `key` change, a `v-if` around an already-open menu, a list re-render — landed there permanently.
  
  - Opening is now reconciled through a single entry point shared by the `open` branch of `updated()` and `connectedCallback()`, so panel, scroll lock, outside-click guard, hover bindings and menu focus converge on the same state on both paths.
  - On re-attach the menu only takes focus back when focus has nowhere to go — i.e. it fell back to `document.body`/`documentElement`. If the user has since focused something else, the panel is rebuilt without stealing that focus.
  - A closed host that is re-attached stays closed: reconciliation runs only while `open` is set, and only for a re-connect (`hasUpdated`), so the first connect remains `updated()`'s responsibility.
  - Only the root layer is rebuilt; submenu panels opened from it are not resurrected, matching what a fresh open does.
  
  The public API, the `open` property and the `open-change` contract are unchanged.
- 5be1ee4: Escape now closes only the innermost open overlay.
  
  Previously every overlay component listened for Escape on its own — popover on `document`, select and autocomplete on the host, dropdown and context-menu through `handleMenuKeyboard`, drawer on its native `<dialog>` — with no shared notion of which one was innermost. Pressing Escape with a select open inside a drawer therefore closed the _outer_ drawer and left the select open: the inner panel is portalled into the drawer's `<dialog>`, so the host-level listener never saw the key, while the drawer's own guard only looked for `HTMLDialogElement` on the composed path and missed the portalled panel.
  
  Escape is now arbitrated by a single shared owner:
  
  - One `document`-level capture listener resolves the innermost open overlay and closes only that one. Because it runs in the capture phase, `stopPropagation()` keeps component-level handlers from closing a second overlay.
  - `preventDefault()` also suppresses the native `<dialog>` close request, so `web-ui-dialog` — which previously relied on the `cancel` event — is covered by the same path.
  - Innermost is resolved against `overlayComposition`'s logical tree, not the event path. That matters: with focus parked in the drawer while a listbox is open, the event path only reaches the drawer, and a path-based rule would again close the outer layer.
  - Unrelated sibling overlays (neither containing the other) fall back to open order, so the most recently opened one closes.
  - `controlled` and `no-escape-close` are preserved: components keep expressing their own close semantics, and `open-change` still goes through the same user-change channel.
  
  The public API and event contract are unchanged.
- 5be1ee4: `<web-ui-radio-group>` and `<web-ui-checkbox-group>` now take a `direction` property and attribute — `'horizontal' | 'vertical'`, defaulting to `'vertical'`, so a group that never sets it keeps laying its members out in a column. An invalid value falls back to the default instead of throwing. The property reflects, so every group now carries a `direction` attribute — `vertical` even when nothing sets it — which matters if you assert on rendered DOM or select on `[direction]`.
  
  Member spacing is now per component: `--wui-radio-group-gap` and `--wui-checkbox-group-gap` replace the shared `--wui-selection-group-gap` that the unreleased selection-control change introduced, so a page can widen one group's rhythm without touching the other. Both default to `8px`, matching the previous value.
- 5be1ee4: `<web-ui-svg-draw-lines>` gained a second playback direction and an opt-out for playing on its own. `replay({ reverse: true })` retracts the stroke back along the same path, from fully drawn to blank — the single-direction rule was a limitation of the old implementation, not of the technique, because both directions are the same dash animation with the two endpoints swapped. A reverse run ends on "no line at all", so instead of restoring the consumer's inline dash styles the way a reveal run does, it leaves the stroke hidden by inline dash values that stay until the next `replay()`. That end state lives in the DOM rather than in a live animation, so moving or re-parenting the geometry cannot bring the stroke back — and a `replay()` that lands in a reduced-motion scope undoes the residue instead of animating, so a control can never be left checked but invisible. `no-autoplay` skips the automatic single playback that fires when slot content first settles, for callers that decide when to draw. The default is unchanged, so a standalone `<web-ui-svg-draw-lines>` still animates as soon as it renders.
  
  `<web-ui-checkbox>` uses both switches. A checkbox that mounts already `checked` now shows a static checkmark instead of drawing it during the page's first frame, and unchecking retracts the check along its path instead of only fading it out. The stroke is held at full opacity for the retract so the line, not the fade, is what makes the check disappear. Inside a `motion="reduced"` theme scope nothing is held: no retract runs there, and holding anyway would leave a fully drawn check on an unchecked control.
  
  The draw and retract duration also stops being a literal in the checkbox template and follows `--wui-duration-trigger` (160ms by default), resolved from the theme on each update, so the stroke and the indicator's background transition stay on the same beat when a theme overrides that token. That literal never reached a release — the check draw itself is new in this batch — so the `300ms` written into an earlier draft of this release was never published either.
- 5be1ee4: Internalize theme transitions into `web-ui-theme`.
  
  - Adds the boolean `transition` attribute; it is `false` by default and uses native HTML attribute-presence semantics.
  - Root themes reveal the whole page with a circular View Transition. Nested themes assign a temporary capture name and reveal only their own box.
  - Reads `--wui-theme-transition-duration` and `--wui-theme-transition-easing`, keeps one flight at a time, and falls back to an immediate appearance update when View Transitions or reduced-motion behavior makes animation unavailable.
  - Replaces the duplicated demo-side transition CSS/logic.

### Patch Changes

- 5be1ee4: Lower the dialog entrance scale token default from 1.2 to 1.1 so the default no longer overhangs narrow viewports.
- 5be1ee4: Bring `imagePreview()` into Escape arbitration, so it stops closing the layer underneath it.
  
  The preview drives its own native `<dialog>` and relied on the `cancel` event for Escape without ever registering as an open overlay. Because Escape is arbitrated globally and the arbiter calls `preventDefault()` as soon as it resolves a registered layer, having the preview open on top of anything registered meant one Escape closed the layer _underneath_ and left the preview on screen. The preview now claims its `<dialog>` while it is open — including a fresh claim after being reattached to the DOM — and its `cancel` handler is kept only for the top-layer guarantee.
  
  - Unlike the other overlays it carries no inert channel: `imagePreview()` has no `no-escape-close` option, so Escape always closes it.
- 5be1ee4: Consolidate open-overlay ownership into a single `open-overlay` module, so "this layer is open" has exactly one owner.
  
  The escape-ownership change introduced one shared arbiter, but its state was still split across three modules — `composition` (which panels are registered), `escape-dismiss` (which registered panel receives the keystroke) and `lifecycle` (when a frame transaction stops being valid). None of them owned the invariant they shared, so each overlay component re-assembled it by hand: a missed unregister, or a panel reattached to the DOM while open, could leave a visible layer the arbiter no longer knew about.
  
  - Claiming a panel now returns the handle that owns it; releasing is idempotent, and re-claiming starts a new session, which also resets the not-closable channel.
  - Sub-layers (second-level menus) adopt into the claiming handle, so a root that re-claims takes its still-visible sub-layers with it instead of orphaning them. A sub-menu that is still animating out stays owned until its transition ends, so a click inside it is no longer read as a click outside the menu.
  - A panel gives up its claim as it starts closing rather than after the exit animation, so it stops swallowing Escape while it fades out.
  - The public API and event contract are unchanged; `composition`, `escape-dismiss` and `lifecycle` were internal and are now removed.
- 5be1ee4: Fix modal dialog, drawer, and image preview not reconciling after being reattached to the DOM while open: the native `<dialog>` loses its top-layer membership when the host is detached (the `open` attribute remains, so `showModal` could never run again) and the scroll lock was not restored. Reconnecting now reconciles the native dialog presence (self-marked close + `showModal`), the scroll lock, and the nested drawer layer registration. The image preview also re-attaches its pinch-zoom gesture on remount, which was permanently lost after a detach because `firstUpdated` only runs once.
- 5be1ee4: Turn the radio and checkbox host into a shared selection-control box. The host is now inline-flex with content-driven height, so the inherited page line-height can no longer inflate it or leave an uneven gap above and below the 18px indicator; radio and checkbox now sit identically next to text and to each other. Both components read one layout stylesheet (`src/assets/selection-control.css`) and share the `--wui-selection-control-size` token, while `<web-ui-radio-group>` and `<web-ui-checkbox-group>` accept `--wui-selection-group-gap` for member spacing. Checkbox also suppresses its focus ring after pointer interaction the way radio already did.
  
  The checked states now animate: the radio dot scales from 0 to 1 (and back to 0 when the selection moves away), and the checkbox checkmark draws itself in from left to right through `<web-ui-svg-draw-lines>`. The checkmark is now the control's own stroked path rather than the filled `heroiconsCheck16Solid` icon, because drawing requires a stroke and the reveal starts at the path's first point, which also fixes the direction and the weight. Unchecking fades the checkmark out — `svg-draw-lines` only supports drawing on, not in reverse.
  
  Unchecked controls gained idle hover and pressed backgrounds on the indicator. Because the label text is part of the same trigger row, hovering or pressing the text now tints the indicator exactly like hovering the indicator itself; hover is limited to fine-pointer devices, and checked or disabled controls keep their own surfaces.
  
  The idle indicator surface moves from `--wui-color-surface-raised` to `--wui-color-surface-control`, the tier neutral buttons already use. In dark mode `surface-raised` (`#2c2c2e`) sat only ~8 luminance points above the page (`#242628`), leaving radio circles and checkbox boxes barely visible.
- 5be1ee4: Fix the toast hover pause so leaving resumes the remaining time instead of restarting the full duration, and make the pause impossible to leak.
  
  Hovering a toast used to clear the auto-close timer without recording anything, and `pointerleave` restarted the full `duration`. The two halves disagreed with each other (the element already had a real pause/resume pair for node relocation), and clearing without recording left `pointerleave` as the only way back: one missed leave — pointer dragged out of the window, element relocated or removed while hovered, layout moving the toast away from a stationary cursor — parked the toast on screen forever with no fallback.
  
  Hover now records the remaining time and resumes it, and a document-level `pointerover`/`pointerout`/`pointerleave` fallback releases the pause when the element's own `pointerleave` never arrives. A toast that is mounted while the pointer already sits over it stays paused instead of starting a countdown under the cursor.
  
  Passing `duration` explicitly during a hover pause no longer starts the timer: the value is recorded and the countdown runs with it once the pointer leaves, so an upsert can no longer close a toast that is still hovered. `duration: 0` keeps meaning "never auto-close" instead of being read as "already expired".
- 5be1ee4: Align drawer close button fallback right offset from 20px to 16px.
- 5be1ee4: Harden the toast auto-close timer and correct two README claims that no longer match the code.
  
  - `resumeAutoClose()` now clears any timer still in flight before arming the resumed one. `startAutoClose()` already did this, and pause/resume is expected to stay strictly paired, so nothing observable changes today. If the call order is ever re-arranged, assigning `_closeTimer` over a live handle left two deadlines counting down, and the earlier one closed the toast before its remaining time was up.
  - The READMEs described Escape arbitration as if `image-preview` were outside it. It registers its native `<dialog>` with the same arbiter, so layer order decides which surface closes, and the component's `cancel` handler only vetoes the native instant close so the exit transition still plays; both files now say so.
  - `--wui-drawer-close-right` is documented as `20px` while the fallback has been `16px` since `2add3405`. English and Chinese tables now match `style.css`.
- 5be1ee4: Finish the shared pressed composition of `switch`, `segmented` and `slider`: the pressed/dragged indicator of `segmented` and the pressed thumb of `slider` no longer paint a glass fill, so all three now render only the inset highlight stack and read as one flat lift.
  
  - The release that flattened their pressed and dragging shadows to a single `0 2px 20px rgb(0 0 0 / 0.2)` layer described all three as sharing the same pressed composition, but `segmented` and `slider` still painted `background-color: var(--wui-color-surface-glass, …)`. Only `switch` had actually been moved to `transparent`.
  - With the fill gone, the enlarged `scale(1.5)` indicator is a pure glass highlight over whatever sits behind it, matching the switch thumb's press state.
  - CSS only; no API, token or event change.
- 5be1ee4: Radio and checkbox no longer have a pressed state. The shared selection-control shell tinted the indicator's state layer 15% while the pointer was down, on top of the 6% hover tint; that rule is gone, so pressing either control no longer changes its surface. Hover keeps its layer, still with no transition and only on `(hover: hover) and (pointer: fine)` devices, and checked and disabled controls are unaffected. Touch devices are where this reads strongest: they never matched the hover layer either, so a tap now changes the check itself and nothing else on the control. `--wui-color-state-layer-active` is untouched and still backs the pressed states of `button`, `input-number` and `segmented-trigger`.
- 5be1ee4: Radio and checkbox hover and pressed feedback now switches in one frame. The shared selection-control shell transitioned the indicator's own `background-color` (and a `border-color` neither indicator ever gave a width), so the idle 6% hover and 15% pressed tints ramped in over `--wui-duration-focus` (200ms) while every other component's state layer swaps instantly — `button` has no background transition at all — and the README motion section promises "hover/active background feedback switches instantly with no transition". The tints move to a dedicated overlay (`::before`, clipped to the indicator radius and stacked between the control surface and the dot/checkmark), which carries no transition, so pressing and releasing read as one frame.
  
  The indicator background keeps its own transition for the checked fill, now at `--wui-duration-trigger` (160ms) to match the radio dot and the checkbox checkmark, and it fades in **and** out: checking eases the circle or box up to `--wui-color-accent`, unchecking eases it back to `--wui-color-surface-control`. Previously that fade ran on the focus duration, and the two needs — instant state-layer feedback and a fading checked fill — could not both be met by one property on one element.
  
  The checkbox checkmark now draws with the default linear easing instead of `ease-out`. The curve was the problem, not the length: `ease-out` spent most of the window on the first stroke, so the long up-stroke arrived all at once, while a constant-speed reveal spreads evenly across the whole path. The icon's own opacity fade and the unchecked fade-out stay at 160ms. Reduced-motion themes are unaffected: `web-ui-svg-draw-lines` skips playback inside a `motion="reduced"` scope.

## 6.4.0

### Minor Changes

- 4151251: Align overlay motion with the platform motion language. Timing and scale defaults change visibly across anchored floating panels (popover, menu, dropdown, select, tooltip, autocomplete), the dialog and image preview.
  
  - The dialog now enters by shrinking and exits by growing back, through a new `--wui-dialog-scale-enter` token (default `1.2`, `1` under reduced motion). It replaces the shared `--wui-scale-enter` that used to grow the dialog in from `0.97`. A resting card wider than `(100 / 1.2)vw ≈ 83.33vw` overhangs the viewport while the scale is still above `1`. With the default `360px` width that means viewports narrower than `432px`, and any card in the `90vw` branch. The exact no-overflow ceiling for `min(90vw, var(--wui-dialog-width))` is `1 / 0.9 ≈ 1.111`, because the two branches meet at a `400px` viewport (`0.9 × 400 = 360`). Lower the token to that if a hard geometric guarantee matters more than the `1.2` start. At `1.2` the overhang lasts about `57ms` of the `320ms`. The scale shares `--wui-ease-dialog` with the card's own opacity, and solving `cubic-bezier(0.2, 0, 0, 1)` numerically puts progress `0.4444` at `x = 0.1793`, so the card is never more than `44.4%` opaque while it overhangs. On a `390px` viewport the total overhang is `31px`.
  - The image preview's enter scale moves off the wrapper that also contains the control layer and onto the image surface alone. Scaling the wrapper dragged the edge-anchored glass chrome (counter, close, nav, toolbar) inward, on a `1440px` viewport by `36px` and `22px` from its final corner position, and drew it at a non-integer scale mid-flight. The chrome now holds its position and fades in while the image materializes. The image preview is a full-viewport surface, so `--wui-scale-enter` stays below `1` there and it can never take a shrink-in start the way the dialog does.
  - Anchored floating panels get a dedicated easing token, `--wui-ease-float` (`cubic-bezier(0.4, 0.38, 0.2, 1)`), shaped as a no-bounce spring (about `11%` of the progress at `10%` of the duration, `53%` at `30%`, `85%` at `50%`). They previously shared `--wui-ease-enter`, which put `85%` of the transition inside the first `30%` of the duration and read as a pop rather than an unfold. The anchor-relative `transform-origin` and the grow-in direction are unchanged.
  - `--wui-duration-float-enter` moves from `160ms` to `240ms` and `--wui-duration-float-exit` from `120ms` to `160ms`, keeping exit faster than enter.
  - `--wui-scale-enter` moves from `0.97` to `0.95` for anchored panels and image preview.
  
  Reduced-motion behavior is unchanged: durations still collapse to `0ms` and both scale tokens still resolve to `1`.
- 4151251: Close the gaps a full motion review of `@greypan/web-ui` turned up. Three motion values were reachable only through a component-local literal, so they ignored the `motion` contract, and one repeating transition was never suppressed.
  
  - `--wui-duration-swipe-settle` (`220ms`) and `--wui-ease-swipe` (`cubic-bezier(0.32, 0.72, 0, 1)`) are now declared by the theme in addition to documenting them on `<web-ui-image-preview>`. They were previously referenced only through component-level fallbacks, so under `motion="reduced"` the carousel settle still ran its full `220ms` transform, because the theme had no definition to zero out. Declaring them also brings both tokens under the `theme-token-parity` guard, which silently skipped them while the theme did not define them.
  - Icon rotation and the spinner leaf chase are now driven by `--wui-duration-spin` (`600ms`) and `--wui-duration-spinner` (`800ms`). Both are infinite loops and neither had any reduced-motion branch at all. A component-level `@media (prefers-reduced-motion: reduce)` block cannot see the `motion` attribute, and these animations read no token, so neither path could reach them. Under reduced motion they now run at `1600ms` instead of stopping, because a frozen loading indicator reads as a hung UI. The spinner's per-leaf `animation-delay` is derived from the same token, so the phase spread follows the period instead of breaking when it changes.
  - `<web-ui-toast>` enters at `scale(var(--wui-scale-enter, 0.95))` instead of a literal `scale(0.97)`. This aligns it with every other glass materialization in the library and makes the scale collapse under `motion="reduced"`.
  - The dialog backdrop now uses `var(--wui-ease-dialog)`. Sharing the card's easing keeps the backdrop from finishing most of its fade after the card has already landed, which was the visible effect of the weak built-in `ease` it used before.
  - `<web-ui-checkbox>` and `<web-ui-radio>` use `var(--wui-duration-focus, 200ms)` for their background-color and border-color transitions instead of a literal `0.2s`. The focus ring on the same elements already used that token, so the two now collapse together under reduced motion. These were the last hard-coded transition durations outside the reduced-motion blocks. The anchored panel keeps a literal `120ms` fade there on purpose, because the token it would otherwise read is the one reduced motion zeroes.
  - A tooltip that opens while another tooltip is already showing now skips its enter animation as well as its delay. It previously set the delay to `0` but still played the `240ms` unfold, so sweeping across a row of icons replayed a full unfold per target.
  
  This amends the "reduced-motion behavior is unchanged" note in the accompanying motion-alignment changeset: durations still collapse to `0ms` and both scale tokens still resolve to `1`, but the two infinite loading loops are now slowed rather than left alone.

### Patch Changes

- 4151251: Flatten the pressed and dragging shadow of `switch`, `segmented` and `slider` to a single soft `0 2px 20px rgb(0 0 0 / 0.2)` layer, replacing the previous three-layer stack. All three now share the same pressed composition: `switch` and `slider` keep the rest of their values, and `segmented` picks up the inset highlight stroke the other two already had. A pressed thumb or indicator reads as one flat lift instead of a deep stack.

## 6.3.1

### Patch Changes

- fc05655: fix(svg-draw-lines): make the host layout-neutral — wrap an icon with no box-inflation or vertical centering shift — while keeping it a transformable element (interweave prototype scales the host).
  
  style: drop the hand-written `-webkit-` vendor prefixes that lightningcss auto-generates for the CSS-in-JS `?inline` pipeline; keep the non-generatable `-webkit-` transition-list entries, `-webkit-line-clamp` box technique, `-webkit-user-drag`, and `::-webkit-*spin-button` pseudo-elements.

## 6.3.0

### Minor Changes

- a00fc1b: Add a `peek` property to `web-ui-collapse` so the closed state reveals a fixed slice of the content along the animation axis instead of collapsing to zero. The revealed area ends in an alpha-gradient fade whose length is derived from `peek` (`calc(peek * ratio)`), so there is no second attribute to set — tune it via the `--wui-collapse-peek-edge-ratio` (default `0.4`), `--wui-collapse-peek-edge-max` (default `112px`), `--wui-collapse-peek-edge` (explicit length, wins over the derived value) and `--wui-collapse-peek-edge-color` CSS variables. The gradient is a four-stop ease-out curve (opaque body, 60% alpha at 30% into the band, 26% at 65%, edge color at the end) so the fade reads clearly from its start instead of only softening the last sliver. Set the ratio to `0` to disable the fade.
- a00fc1b: Add presentation options to `imagePreview()`: `nav`, `toolbar`, `closable`, `indicator`, `swipe`, `noScrollLock` and `noBackdropClose`. Every presentation option defaults to `false`, so a preview renders only the image itself unless the consumer opts in. Also fix the preview closing when clicking the image itself.
- a00fc1b: Let `imagePreview()` be dragged to pan in any direction at any zoom level, and make that the stage's default drag behaviour. Previously a drag only did something while zoomed in, and the offsets were clamped to how far the image overflowed the stage — which is zero at 1x. The bound is now half the absolute size difference between the image and the stage: zoomed in it still reveals the cropped edges, at 1x it moves the image around inside the viewport, and either way the image can never be dragged out of the viewport. Holding the mouse button down and resting a single finger take the same Pointer path, so desktop and mobile behave identically.
  
  Narrow `swipe` to own the horizontal axis only when it actually applies — 1x, with more than one image. Everything else pans, direction free, which keeps the swipe demonstrations behaving exactly as before while 1x vertical drags and every zoomed drag now pan instead of doing nothing.
  
  Because panning also works at 1x, `resetZoom()` now has something to reset when the image is merely displaced, so the toolbar reset button is enabled whenever the image is zoomed _or_ panned rather than only above 1x.
- a00fc1b: Anchor every `imagePreview()` zoom to a point that stays visually fixed, and add built-in pinch-to-zoom. The wheel now keeps the content under the cursor still and a pinch keeps the midpoint between the two fingers still, while the toolbar buttons, keyboard shortcuts and double-click keep expanding around the viewport center. Pinch has no option because the stage already owns pointer interaction: the first finger still drives pan/swipe, the second finger both starts the pinch and aborts any in-flight pan or swipe, and the compatibility `click` that mixed input may synthesize afterwards is swallowed instead of closing the preview. The pinch handling itself lives in the internal shared gesture layer (`attachPinchGesture`, not part of the package's export map) and reports only geometry — the distance ratio plus the midpoint and its delta — leaving the mapping to scale and translation to the component.
- a00fc1b: Add an imperative `imagePreview()` image viewer. It exposes a handle-only API (`next`/`prev`/`goTo`/zoom/`close`/`closed`), renders through the native `<dialog>` top layer with the shared presence and scroll-lock lifecycle, and supports keyboard navigation, wheel zoom, drag-to-pan, and reduced-motion tokens.
- a00fc1b: Retire `--wui-duration-menu-enter/exit` and `--wui-duration-overlay-enter/exit` in favor of dedicated motion tokens. Floating panels (popover, tooltip, select, autocomplete, menu portal) now use `--wui-duration-float-enter: 160ms` and `--wui-duration-float-exit: 120ms`; toast uses `--wui-duration-toast-enter: 280ms` and `--wui-duration-toast-exit: 200ms`. Floating-panel enter/exit motion becomes faster, so this is a minor behavior change.

### Patch Changes

- a00fc1b: Prevent orphaned empty popover portal panels when controlled `open` changes back to `false`, or the popover is removed, before its open frame callback runs.
- a00fc1b: Sync the accessible empty state when an autocomplete empty slot is removed while its portal panel is open.
- a00fc1b: Add composition-aware overlay interaction ownership so nested portal panels no longer trigger parent outside-click, focusout, or scroll suppression.
- a00fc1b: Fix modal dialog positioning regression and unscaled image-preview mask.
  
  - Dialogs (dialog, image-preview, drawer) now declare `position: fixed` explicitly. The single-layer refactor had introduced `position: relative` on the dialog, overriding the UA `dialog:modal` default; a modal dialog in the top layer then laid out in document flow — rendered at the top of the page ("ghost" artifact) and scrolled with the page instead of staying centered. The explicit `fixed` is defensive against any future author rule overriding the UA default.
  - Image preview no longer scales the full-viewport mask: the enter scale (`scale(0.97)` → `1`) moved from the dialog element (which previously scaled the dedicated backdrop layer together with its content) to a new `.wui-image-preview-content` wrapper that contains the stage and the glass controls. The dialog and mask stay transform-free, so the mask fades in without scaling while the content still performs its subtle zoom-in. The dialog still never fades its own opacity, so glass control blur stays continuous.
- a00fc1b: Split dialog-level motion into dedicated tokens: `--wui-duration-dialog-enter: 320ms`, `--wui-duration-dialog-exit: 260ms`, and `--wui-ease-dialog: cubic-bezier(0.2, 0, 0, 1)`. Dialog and image-preview enter/exit motion now use these tokens so the entrance no longer collapses into the first ~100ms; reduced-motion stays at 0ms.
- a00fc1b: Add configurable dialog surface padding, title spacing, content spacing, and footer button spacing CSS custom properties.
- a00fc1b: Tune the pressed handle shadow down: `web-ui-switch` and `web-ui-segmented` keep the pressed-glass structure (solid white at rest, frosted glass + 1.5x scale + lifted shadow while pressed/dragging) but the press shadow is now slightly lighter and tighter — lower opacity on all three layers and smaller blur radii/spread. The direct-value `box-shadow` (no CSS custom-property indirection) is unchanged, so iOS Safari still transitions it reliably.
  
  Roll the two-layer glass blur out to every component that fades opacity on or around a frosted-glass surface. The root cause is the same as the dialog fix: an element with `opacity < 1` becomes a backdrop root, which disables the `backdrop-filter` of any glass element inside it (or around it) during the transition, so the blur pops in/out at the opacity endpoints instead of fading. The glass surface itself no longer transitions its own opacity and no longer carries `backdrop-filter`; a dedicated blur layer (`.wui-floating-panel-blur`, `.toast-blur`) and a content layer (`.wui-floating-panel-surface`, `.toast-surface`) each fade their own opacity, which keeps the blur continuous on every engine.
  
  - Floating panels (popover, tooltip, select, autocomplete, dropdown, context-menu via the shared menu portal): the shared `.wui-floating-panel` keeps `opacity: 1` and only animates `transform`; the two-layer structure is built by the shared overlay portal and the menu portal, so every consumer is covered.
  - Toast: `.toast` keeps `opacity: 1` and only animates `transform`; content and blur fade through `.toast-surface` / `.toast-blur`.
  - Image preview: the fullscreen dialog no longer fades its own opacity (that made the dialog a backdrop root and disabled the glass toolbar/counter blur). The scrim fades through a dedicated `.wui-image-preview-backdrop` layer, the image stage fades through `.wui-image-preview-surface`, and the glass controls (toolbar, counter, close, nav) each fade their own opacity — the counter/toolbar are the glass elements themselves, and the glass close/nav buttons fade through a newly exposed `part="button"` on `web-ui-button`'s native button (the element that actually carries `backdrop-filter`), so no control sits inside an opacity-fading ancestor and their blur stays continuous while the fade-in/out is restored.
  - Audit-only (no discrete blur switch, left unchanged): drawer (its dialog only animates transform), and the always-on glass surfaces in avatar, button, button-group, input, input-number, textarea, layout, slider, switch, segmented and theme.
  
  Reduced-motion behavior is preserved: blur/content layers keep a short opacity fade under `prefers-reduced-motion: reduce`, and the floating-panel family keeps the same enter/exit durations from the float tokens.
- a00fc1b: Finish the two-layer glass migration: the frosted-glass **background** now lives on the surface layer, not on the panel itself.
  
  Root cause (same family as the earlier blur-switch fix, confirmed by pixel sampling): the blur child layer's `backdrop-filter` samples everything painted behind it. When the panel still drew its own semi-transparent glass background, the blur layer sampled that background _plus_ the page, `brightness(1.06)` brightened the composite, and the panel background never faded with the surface — leaving a white afterimage while closing. The design already required the background to live on the surface layer; this change actually moves it there:
  
  - `.wui-floating-panel` is now guaranteed `background: transparent`; `.wui-floating-panel-surface` carries the glass background (and `border-radius: inherit`) and fades it together with the content.
  - The shared overlay portal and the menu portal move the `wui-glass` class from the panel onto the surface at build time; the local (non-portal) templates of popover, tooltip, select and autocomplete do the same. Per-component background/padding rules move to the surface-scoped selector so the visual is equivalent (background covers the same rounded rect, including padding). The surface also neutralizes the `backdrop-filter` that `wui-glass` carries (same mechanism as `.wui-dialog-surface`), so the blur comes only from the blur layer instead of stacking twice and over-brightening; the panel shadow config (`--wui-shadow-panel`) is bridged on the surface scope, where the glass element can actually consume it.
  - Toast moves its background and padding from `.toast` to `.toast-surface`; `.toast` is transparent.
  - Dialog and image-preview were already correctly migrated (transparent dialog, background on `.wui-dialog-body` inside the surface; scrim/surface layers in image-preview) and are now covered by regression assertions.
  
  Tune the pressed handle shadow down to the final values (`web-ui-switch`: `0 1px 6px rgb(0 0 0 / 0.2)`, `0 6px 16px rgb(0 0 0 / 0.16)`, `0 14px 28px rgb(0 0 0 / 0.1)`; `web-ui-segmented`: `0 0 1px rgb(0 0 0 / 0.1)`, `0 5px 14px rgb(0 0 0 / 0.16)`, `0 12px 28px rgb(0 0 0 / 0.1)`). The direct-value `box-shadow` (no custom-property indirection) is unchanged, so iOS Safari still transitions it reliably.
  
  Make carousel swipe thresholds stage-relative and robust for fast flicks: the distance threshold is now 15% of the stage width (rounded) instead of a fixed 48px, so the gesture feels consistent across screen sizes. A fast flick whose sampled velocity reaches 320px/s still commits even below that distance, and a new fallback commits when the direction is clear (a small distance) and the sampled velocity is at least half the speed threshold — real touch event streams can be merged/delayed (measured in CDP: a 40px flick spread over ~167ms is under-sampled to ~164px/s by the 100ms velocity window), which previously made quick flicks bounce back. Slow drags keep the strict distance rule. The shared drag-gesture velocity guard also stops zeroing out ultra-short flicks under 8ms.
- a00fc1b: Revert the two-layer frosted-glass structure back to a single layer with interpolated `backdrop-filter`.
  
  Dual-engine measurement (Chrome 153 + Safari 26.5) showed that `backdrop-filter` interpolates smoothly between `blur(0px)` and `blur(4px)`; the original "hard blur jump" was caused by animating `none` ↔ `blur(...)`, which cannot interpolate — not by `backdrop-filter` being non-animatable. The two-layer workaround (separate blur layer + content surface) introduced its own layer-interaction problems (brightened white cast, closing afterimage, double blur, shadow inheritance scoping), so it is removed:
  
  - Floating panels (popover/tooltip/select/autocomplete/menu portal): `wui-glass` returns to the panel itself, which carries the glass background, shadow and `backdrop-filter`. Open/close now transitions `opacity` + `backdrop-filter` (`blur(0px)` ↔ `blur(4px)`) + `transform` together; `.wui-floating-panel-blur` / `.wui-floating-panel-surface` and the portal/menu-portal DOM construction and class-moving logic are deleted.
  - Dialog: the glass card (`.wui-dialog-body`) fades its own opacity and interpolates its own blur; the dialog element itself still avoids an opacity transition so descendant blur is never disabled by a backdrop root.
  - Toast: `.toast` carries the glass and transitions `opacity` + `backdrop-filter` + `transform`; `.toast-blur` / `.toast-surface` are removed.
  - Reduced motion shortens the durations but keeps the `backdrop-filter` interpolation (reducing motion should not reintroduce a hard blur switch).
  - Image preview keeps its dedicated full-viewport structure (constant-opacity dialog + separate backdrop/surface layers and per-control opacity fades): the whole-dialog fade would move its `backdrop-filter` sampling source from dialog content to the page texture mid-transition, so it is intentionally out of scope of this single-layer change.
- a00fc1b: Swap the `imagePreview()` reset-zoom glyph from `lucide:refresh-cw` to `radix-icons:reset`, so the toolbar button reads as "back to 1x" rather than "reload". The matching `radixIconsReset` glyph is now exported from `@greypan/web-ui/icons`.
- a00fc1b: Fix iOS Safari compatibility for page backgrounds, dialog-based overlay motion, drawer close button placement, touch drag interactions, and pointer-triggered focus rings. Native dialog overlays now keep their open/close transitions on Safari, switch/segmented/slider drag gestures remain responsive on touch, and pointer-clicked controls no longer show a keyboard-style focus ring.
- a00fc1b: Suppress Safari's UA focus ring on native dialog surfaces for dialog, drawer, and image-preview. The modal panel itself is not a focusable control, so keyboard focus remains on the interactive controls inside the panel.
- a00fc1b: Fix slider and segmented drag interruptions under touch input. On touch, the browser implicitly captures the pointer to the hit element (slider thumb / segmented-trigger content), and the drag gesture then transfers capture to the drag surface with `setPointerCapture`; the hit element's `lostpointercapture` was being misread as a cancel, freezing the drag after the first step. The gesture now only cancels when the capture surface itself loses capture, ignoring the implicit-capture handoff. The `touch-action: none` host declarations and the hit-test-chain `touchmove` guard are kept as defense in depth.
  
  Fix a double rebound on Safari mobile when a draggable drawer springs back after a drag. Safari computes a CSS transition's before-change style without trusting the WAAPI fill animation's override, so the computed transform change from the drag residual (e.g. `translateX(-64px)`) to `0` at the rebound `onfinish` boundary is sampled as a transition's from-value and replays a second spring. Rewriting or clearing the inline styles cannot avoid that non-zero-to-zero sample, and deferring the `is-dragging` removal to a later animation frame is unreliable because the frame can land in the same rendering tick. The rebound finish now, while the `is-dragging` class still suppresses `transform`/`backdrop` transitions, rewrites the inline styles to the open-state terminal values and forces a synchronous style recalculation (reading `offsetWidth`) so the new `0` value is baked into Safari's transition reference, then removes `is-dragging` in the same task — the suppression is lifted only after the reference is already `0`, so no transition can start.
- a00fc1b: Render the layout mobile sidebar with built-in drawer chrome and map sidebar width/radius to drawer tokens.
- a00fc1b: Clip the layout header glow horizontally so its decorative scale/translate no longer creates horizontal page scroll on narrow viewports.
- a00fc1b: Adapt drag controls, dialogs, toasts, and form inputs for small and touch viewports.
- a00fc1b: Keep the mobile layout sidebar toggle aligned to the first header row when a header slot expands to multiple rows.
- a00fc1b: Slow the default full-motion overlay enter/exit durations from 180ms/140ms to 280ms/200ms. The change covers dialog, image-preview, toast, and shared floating-panel overlay motion; reduced-motion tokens stay at 0ms.
- a00fc1b: Add a shared overlay lifecycle transaction so frame callbacks are invalidated on same-frame close, disconnect, and reconfigure. Temporary disconnects can resume safely on reconnect.
- a00fc1b: Add stale async positioning generation guards so late floating-ui promises cannot overwrite newer overlay coordinates or width styles.
- a00fc1b: Revert the `web-ui-theme` host to `display: contents` and stop painting `--wui-color-page` on it. The block box + background painting were added in this same un-released batch as a workaround for an iOS Safari token-inheritance concern; the user verified on-device that `contents` and `block` behave identically, so the host is back to drawing nothing and the embedding application keeps full control of the surface behind the themed subtree. Custom properties still inherit into slotted content (`display` does not affect inherited custom properties).
  
  Fix the image-preview `swipe` carousel to a single-track layout. Previously the current image and the adjacent image were positioned independently with their own transforms, so on images with different aspect ratios they overlapped and misaligned. Now the current image and its neighbors sit in equal-size slides on one track: the stage clips the overflow, the whole track translates with the finger, and the adjacent image enters and leaves on the same baseline at the same size (with `loop` on, the wrap-around neighbor is always present beside the current image, so a drag near the end keeps following a real adjacent image instead of running into empty track). Releasing past the threshold slides the next image in; below it the strip bounces back, and at the non-looping bounds it bounces back instead of crossing the boundary.
  
  Fix frosted-glass handles on `web-ui-switch`, `web-ui-slider` and `web-ui-segmented` flashing their blur on long-press/drag. `backdrop-filter` was already always-on, but the background still switched from opaque white to translucent glass at press — that is the property change that makes Chrome re-rasterize the backdrop region as a hard flash. The glass surface composition (`backdrop-filter` + background) is now identical across resting, pressed and dragging states; only the transform and the lifted shadow change. A dialog's own glass surface stays stable too because the handle no longer suddenly blurs the content behind it.
  
  Deepen the pressed/dragging handle shadow on `web-ui-switch` (`0 2px 10px rgb(0 0 0 / 0.28), 0 10px 28px rgb(0 0 0 / 0.24), 0 18px 44px rgb(0 0 0 / 0.16)`) and `web-ui-segmented` (`0 0 1px rgb(0 0 0 / 0.12), 0 6px 18px rgb(0 0 0 / 0.22), 0 16px 36px rgb(0 0 0 / 0.16)`) for a stronger lifted-glass feel.
  
  Fix draggable-drawer open/close transitions being lost after rapid taps on the drag handle. Two independent causes are addressed. First, every tap finishes through the rebound path, which wrote a `translateX(0px)` inline style (kept deliberately for the Safari double-rebound fix); that zero-value inline later overrode the closed-state CSS transform, so closing via button/backdrop/Escape stopped transitioning and reopens had no animation either. The no-animation rebound path now clears the inline drag styles instead of leaving a zero transform behind, and a close that starts while no drag animation is in flight clears any leftover drag inline styles before the exit transition is computed. Second, the native dialog `close` event is dispatched asynchronously, so a fast close→reopen can deliver the previous close session's stale `close` event after the reopen; the overlay presence now flags its own `dialog.close()`, and `web-ui-drawer` / `web-ui-dialog` swallow that event (stale or not) instead of treating it as an external close that immediately closes the freshly reopened dialog. Genuine external closes (for example a form with `method="dialog"`) still close normally.
- a00fc1b: Fix the pressed/dragging handle shadow on `web-ui-switch` and `web-ui-segmented` not showing on iOS. The previous round drove the pressed `box-shadow` through a CSS custom property (`--wui-internal-glass-shadow` / a shadow-list variable); iOS Safari does not transition a property when only its custom-property input changes and can skip the discrete `var()` switch entirely, so the pressed look "reverted" on device. The pressed state now writes the `box-shadow` value directly in the class (regular property change, reliably transitioned everywhere), keeping the glass inset highlight, and the shadows are deepened further for a clearly lifted look: switch `0 2px 12px rgb(0 0 0 / 0.32), 0 14px 36px rgb(0 0 0 / 0.28), 0 28px 64px rgb(0 0 0 / 0.2)`, segmented `0 0 1px rgb(0 0 0 / 0.16), 0 10px 28px rgb(0 0 0 / 0.28), 0 24px 56px rgb(0 0 0 / 0.2)`.
  
  Fix image-preview carousel neighbors "bleeding through" while zoomed. The swipe track keeps the two neighbors rendered beside the current image, but the shared per-image transform previously applied the zoom scale and the pan offsets to every slide, so at scale > 1 the adjacent images were scaled up too and their edges entered the viewport. Now the zoom scale (and, while zoomed, the pan offsets) apply only to the current image; the neighbor slides stay at 1x and frozen in their track positions, so panning while zoomed never brings them into the viewport. At 1x the neighbors still share the vertical pan to stay aligned during diagonal swipes, and swipe behavior is unchanged.
- a00fc1b: Restore the `web-ui-switch`, `web-ui-slider` and `web-ui-segmented` handles to their original pressed-glass structure: the resting handle is a solid white thumb / indicator, and pressing or dragging switches it to frosted glass — backdrop blur + translucent glass background + 1.5x scale + a clearly lifted shadow. The previous round made the glass composition constant (backdrop blur always on, background never changing), which hid the press transition on iOS; that was the wrong target and is reverted. The iOS-safe pressed `box-shadow` from the last round is kept: the class writes the shadow value directly (no CSS custom-property indirection, which iOS Safari does not transition).
  
  Make `web-ui-dialog`'s background blur continuous across every state switch. The dialog element's own `opacity` transition made the `dialog` a backdrop root while `opacity < 1`, which completely disabled the glass body's `backdrop-filter` during the transition — the blur popped in/out at the opacity endpoints instead of fading (verified in a real browser: an ancestor with `opacity` or `filter` disables descendant backdrop-filter, while `transform` and the element's own opacity fade do not). The dialog now keeps `opacity: 1` on the element (only the transform scale animates there), fades the content through a `.wui-dialog-surface` wrapper, and blurs through a dedicated `.wui-dialog-blur` layer whose own opacity transition fades the blur smoothly; the body no longer carries its own `backdrop-filter`, so there is no double blur at rest.
  
  Lock the image-preview `swipe` gesture to horizontal at 1x. While the swipe gesture applies, the vertical delta is now ignored entirely — no vertical pan and no vertical follow (previously a 1x swipe drag still panned vertically). Zoomed-in dragging is unchanged and pans on both axes.

## 6.2.0

### Minor Changes

- e063e5e: Add a `peek` property to `web-ui-collapse` so the closed state reveals a fixed slice of the content along the animation axis instead of collapsing to zero. The revealed area ends in an alpha-gradient fade whose length is derived from `peek` (`calc(peek * ratio)`), so there is no second attribute to set — tune it via the `--wui-collapse-peek-edge-ratio` (default `0.4`), `--wui-collapse-peek-edge-max` (default `112px`), `--wui-collapse-peek-edge` (explicit length, wins over the derived value) and `--wui-collapse-peek-edge-color` CSS variables. The gradient is a four-stop ease-out curve (opaque body, 60% alpha at 30% into the band, 26% at 65%, edge color at the end) so the fade reads clearly from its start instead of only softening the last sliver. Set the ratio to `0` to disable the fade.
- e063e5e: Add presentation options to `imagePreview()`: `nav`, `toolbar`, `closable`, `indicator`, `swipe`, `noScrollLock` and `noBackdropClose`. Every presentation option defaults to `false`, so a preview renders only the image itself unless the consumer opts in. Also fix the preview closing when clicking the image itself.
- e063e5e: Let `imagePreview()` be dragged to pan in any direction at any zoom level, and make that the stage's default drag behaviour. Previously a drag only did something while zoomed in, and the offsets were clamped to how far the image overflowed the stage — which is zero at 1x. The bound is now half the absolute size difference between the image and the stage: zoomed in it still reveals the cropped edges, at 1x it moves the image around inside the viewport, and either way the image can never be dragged out of the viewport. Holding the mouse button down and resting a single finger take the same Pointer path, so desktop and mobile behave identically.
  
  Narrow `swipe` to own the horizontal axis only when it actually applies — 1x, with more than one image. Everything else pans, direction free, which keeps the swipe demonstrations behaving exactly as before while 1x vertical drags and every zoomed drag now pan instead of doing nothing.
  
  Because panning also works at 1x, `resetZoom()` now has something to reset when the image is merely displaced, so the toolbar reset button is enabled whenever the image is zoomed _or_ panned rather than only above 1x.
- e063e5e: Anchor every `imagePreview()` zoom to a point that stays visually fixed, and add built-in pinch-to-zoom. The wheel now keeps the content under the cursor still and a pinch keeps the midpoint between the two fingers still, while the toolbar buttons, keyboard shortcuts and double-click keep expanding around the viewport center. Pinch has no option because the stage already owns pointer interaction: the first finger still drives pan/swipe, the second finger both starts the pinch and aborts any in-flight pan or swipe, and the compatibility `click` that mixed input may synthesize afterwards is swallowed instead of closing the preview. The pinch handling itself lives in the internal shared gesture layer (`attachPinchGesture`, not part of the package's export map) and reports only geometry — the distance ratio plus the midpoint and its delta — leaving the mapping to scale and translation to the component.
- e063e5e: Add an imperative `imagePreview()` image viewer. It exposes a handle-only API (`next`/`prev`/`goTo`/zoom/`close`/`closed`), renders through the native `<dialog>` top layer with the shared presence and scroll-lock lifecycle, and supports keyboard navigation, wheel zoom, drag-to-pan, and reduced-motion tokens.
- e063e5e: Retire `--wui-duration-menu-enter/exit` and `--wui-duration-overlay-enter/exit` in favor of dedicated motion tokens. Floating panels (popover, tooltip, select, autocomplete, menu portal) now use `--wui-duration-float-enter: 160ms` and `--wui-duration-float-exit: 120ms`; toast uses `--wui-duration-toast-enter: 280ms` and `--wui-duration-toast-exit: 200ms`. Floating-panel enter/exit motion becomes faster, so this is a minor behavior change.

### Patch Changes

- e063e5e: Prevent orphaned empty popover portal panels when controlled `open` changes back to `false`, or the popover is removed, before its open frame callback runs.
- e063e5e: Sync the accessible empty state when an autocomplete empty slot is removed while its portal panel is open.
- e063e5e: Add composition-aware overlay interaction ownership so nested portal panels no longer trigger parent outside-click, focusout, or scroll suppression.
- e063e5e: Fix modal dialog positioning regression and unscaled image-preview mask.
  
  - Dialogs (dialog, image-preview, drawer) now declare `position: fixed` explicitly. The single-layer refactor had introduced `position: relative` on the dialog, overriding the UA `dialog:modal` default; a modal dialog in the top layer then laid out in document flow — rendered at the top of the page ("ghost" artifact) and scrolled with the page instead of staying centered. The explicit `fixed` is defensive against any future author rule overriding the UA default.
  - Image preview no longer scales the full-viewport mask: the enter scale (`scale(0.97)` → `1`) moved from the dialog element (which previously scaled the dedicated backdrop layer together with its content) to a new `.wui-image-preview-content` wrapper that contains the stage and the glass controls. The dialog and mask stay transform-free, so the mask fades in without scaling while the content still performs its subtle zoom-in. The dialog still never fades its own opacity, so glass control blur stays continuous.
- e063e5e: Split dialog-level motion into dedicated tokens: `--wui-duration-dialog-enter: 320ms`, `--wui-duration-dialog-exit: 260ms`, and `--wui-ease-dialog: cubic-bezier(0.2, 0, 0, 1)`. Dialog and image-preview enter/exit motion now use these tokens so the entrance no longer collapses into the first ~100ms; reduced-motion stays at 0ms.
- e063e5e: Add configurable dialog surface padding, title spacing, content spacing, and footer button spacing CSS custom properties.
- e063e5e: Tune the pressed handle shadow down: `web-ui-switch` and `web-ui-segmented` keep the pressed-glass structure (solid white at rest, frosted glass + 1.5x scale + lifted shadow while pressed/dragging) but the press shadow is now slightly lighter and tighter — lower opacity on all three layers and smaller blur radii/spread. The direct-value `box-shadow` (no CSS custom-property indirection) is unchanged, so iOS Safari still transitions it reliably.
  
  Roll the two-layer glass blur out to every component that fades opacity on or around a frosted-glass surface. The root cause is the same as the dialog fix: an element with `opacity < 1` becomes a backdrop root, which disables the `backdrop-filter` of any glass element inside it (or around it) during the transition, so the blur pops in/out at the opacity endpoints instead of fading. The glass surface itself no longer transitions its own opacity and no longer carries `backdrop-filter`; a dedicated blur layer (`.wui-floating-panel-blur`, `.toast-blur`) and a content layer (`.wui-floating-panel-surface`, `.toast-surface`) each fade their own opacity, which keeps the blur continuous on every engine.
  
  - Floating panels (popover, tooltip, select, autocomplete, dropdown, context-menu via the shared menu portal): the shared `.wui-floating-panel` keeps `opacity: 1` and only animates `transform`; the two-layer structure is built by the shared overlay portal and the menu portal, so every consumer is covered.
  - Toast: `.toast` keeps `opacity: 1` and only animates `transform`; content and blur fade through `.toast-surface` / `.toast-blur`.
  - Image preview: the fullscreen dialog no longer fades its own opacity (that made the dialog a backdrop root and disabled the glass toolbar/counter blur). The scrim fades through a dedicated `.wui-image-preview-backdrop` layer, the image stage fades through `.wui-image-preview-surface`, and the glass controls (toolbar, counter, close, nav) each fade their own opacity — the counter/toolbar are the glass elements themselves, and the glass close/nav buttons fade through a newly exposed `part="button"` on `web-ui-button`'s native button (the element that actually carries `backdrop-filter`), so no control sits inside an opacity-fading ancestor and their blur stays continuous while the fade-in/out is restored.
  - Audit-only (no discrete blur switch, left unchanged): drawer (its dialog only animates transform), and the always-on glass surfaces in avatar, button, button-group, input, input-number, textarea, layout, slider, switch, segmented and theme.
  
  Reduced-motion behavior is preserved: blur/content layers keep a short opacity fade under `prefers-reduced-motion: reduce`, and the floating-panel family keeps the same enter/exit durations from the float tokens.
- e063e5e: Finish the two-layer glass migration: the frosted-glass **background** now lives on the surface layer, not on the panel itself.
  
  Root cause (same family as the earlier blur-switch fix, confirmed by pixel sampling): the blur child layer's `backdrop-filter` samples everything painted behind it. When the panel still drew its own semi-transparent glass background, the blur layer sampled that background _plus_ the page, `brightness(1.06)` brightened the composite, and the panel background never faded with the surface — leaving a white afterimage while closing. The design already required the background to live on the surface layer; this change actually moves it there:
  
  - `.wui-floating-panel` is now guaranteed `background: transparent`; `.wui-floating-panel-surface` carries the glass background (and `border-radius: inherit`) and fades it together with the content.
  - The shared overlay portal and the menu portal move the `wui-glass` class from the panel onto the surface at build time; the local (non-portal) templates of popover, tooltip, select and autocomplete do the same. Per-component background/padding rules move to the surface-scoped selector so the visual is equivalent (background covers the same rounded rect, including padding). The surface also neutralizes the `backdrop-filter` that `wui-glass` carries (same mechanism as `.wui-dialog-surface`), so the blur comes only from the blur layer instead of stacking twice and over-brightening; the panel shadow config (`--wui-shadow-panel`) is bridged on the surface scope, where the glass element can actually consume it.
  - Toast moves its background and padding from `.toast` to `.toast-surface`; `.toast` is transparent.
  - Dialog and image-preview were already correctly migrated (transparent dialog, background on `.wui-dialog-body` inside the surface; scrim/surface layers in image-preview) and are now covered by regression assertions.
  
  Tune the pressed handle shadow down to the final values (`web-ui-switch`: `0 1px 6px rgb(0 0 0 / 0.2)`, `0 6px 16px rgb(0 0 0 / 0.16)`, `0 14px 28px rgb(0 0 0 / 0.1)`; `web-ui-segmented`: `0 0 1px rgb(0 0 0 / 0.1)`, `0 5px 14px rgb(0 0 0 / 0.16)`, `0 12px 28px rgb(0 0 0 / 0.1)`). The direct-value `box-shadow` (no custom-property indirection) is unchanged, so iOS Safari still transitions it reliably.
  
  Make carousel swipe thresholds stage-relative and robust for fast flicks: the distance threshold is now 15% of the stage width (rounded) instead of a fixed 48px, so the gesture feels consistent across screen sizes. A fast flick whose sampled velocity reaches 320px/s still commits even below that distance, and a new fallback commits when the direction is clear (a small distance) and the sampled velocity is at least half the speed threshold — real touch event streams can be merged/delayed (measured in CDP: a 40px flick spread over ~167ms is under-sampled to ~164px/s by the 100ms velocity window), which previously made quick flicks bounce back. Slow drags keep the strict distance rule. The shared drag-gesture velocity guard also stops zeroing out ultra-short flicks under 8ms.
- e063e5e: Revert the two-layer frosted-glass structure back to a single layer with interpolated `backdrop-filter`.
  
  Dual-engine measurement (Chrome 153 + Safari 26.5) showed that `backdrop-filter` interpolates smoothly between `blur(0px)` and `blur(4px)`; the original "hard blur jump" was caused by animating `none` ↔ `blur(...)`, which cannot interpolate — not by `backdrop-filter` being non-animatable. The two-layer workaround (separate blur layer + content surface) introduced its own layer-interaction problems (brightened white cast, closing afterimage, double blur, shadow inheritance scoping), so it is removed:
  
  - Floating panels (popover/tooltip/select/autocomplete/menu portal): `wui-glass` returns to the panel itself, which carries the glass background, shadow and `backdrop-filter`. Open/close now transitions `opacity` + `backdrop-filter` (`blur(0px)` ↔ `blur(4px)`) + `transform` together; `.wui-floating-panel-blur` / `.wui-floating-panel-surface` and the portal/menu-portal DOM construction and class-moving logic are deleted.
  - Dialog: the glass card (`.wui-dialog-body`) fades its own opacity and interpolates its own blur; the dialog element itself still avoids an opacity transition so descendant blur is never disabled by a backdrop root.
  - Toast: `.toast` carries the glass and transitions `opacity` + `backdrop-filter` + `transform`; `.toast-blur` / `.toast-surface` are removed.
  - Reduced motion shortens the durations but keeps the `backdrop-filter` interpolation (reducing motion should not reintroduce a hard blur switch).
  - Image preview keeps its dedicated full-viewport structure (constant-opacity dialog + separate backdrop/surface layers and per-control opacity fades): the whole-dialog fade would move its `backdrop-filter` sampling source from dialog content to the page texture mid-transition, so it is intentionally out of scope of this single-layer change.
- e063e5e: Swap the `imagePreview()` reset-zoom glyph from `lucide:refresh-cw` to `radix-icons:reset`, so the toolbar button reads as "back to 1x" rather than "reload". The matching `radixIconsReset` glyph is now exported from `@greypan/web-ui/icons`.
- e063e5e: Fix iOS Safari compatibility for page backgrounds, dialog-based overlay motion, drawer close button placement, touch drag interactions, and pointer-triggered focus rings. Native dialog overlays now keep their open/close transitions on Safari, switch/segmented/slider drag gestures remain responsive on touch, and pointer-clicked controls no longer show a keyboard-style focus ring.
- e063e5e: Suppress Safari's UA focus ring on native dialog surfaces for dialog, drawer, and image-preview. The modal panel itself is not a focusable control, so keyboard focus remains on the interactive controls inside the panel.
- e063e5e: Fix slider and segmented drag interruptions under touch input. On touch, the browser implicitly captures the pointer to the hit element (slider thumb / segmented-trigger content), and the drag gesture then transfers capture to the drag surface with `setPointerCapture`; the hit element's `lostpointercapture` was being misread as a cancel, freezing the drag after the first step. The gesture now only cancels when the capture surface itself loses capture, ignoring the implicit-capture handoff. The `touch-action: none` host declarations and the hit-test-chain `touchmove` guard are kept as defense in depth.
  
  Fix a double rebound on Safari mobile when a draggable drawer springs back after a drag. Safari computes a CSS transition's before-change style without trusting the WAAPI fill animation's override, so the computed transform change from the drag residual (e.g. `translateX(-64px)`) to `0` at the rebound `onfinish` boundary is sampled as a transition's from-value and replays a second spring. Rewriting or clearing the inline styles cannot avoid that non-zero-to-zero sample, and deferring the `is-dragging` removal to a later animation frame is unreliable because the frame can land in the same rendering tick. The rebound finish now, while the `is-dragging` class still suppresses `transform`/`backdrop` transitions, rewrites the inline styles to the open-state terminal values and forces a synchronous style recalculation (reading `offsetWidth`) so the new `0` value is baked into Safari's transition reference, then removes `is-dragging` in the same task — the suppression is lifted only after the reference is already `0`, so no transition can start.
- e063e5e: Render the layout mobile sidebar with built-in drawer chrome and map sidebar width/radius to drawer tokens.
- e063e5e: Clip the layout header glow horizontally so its decorative scale/translate no longer creates horizontal page scroll on narrow viewports.
- e063e5e: Adapt drag controls, dialogs, toasts, and form inputs for small and touch viewports.
- e063e5e: Keep the mobile layout sidebar toggle aligned to the first header row when a header slot expands to multiple rows.
- e063e5e: Slow the default full-motion overlay enter/exit durations from 180ms/140ms to 280ms/200ms. The change covers dialog, image-preview, toast, and shared floating-panel overlay motion; reduced-motion tokens stay at 0ms.
- e063e5e: Add a shared overlay lifecycle transaction so frame callbacks are invalidated on same-frame close, disconnect, and reconfigure. Temporary disconnects can resume safely on reconnect.
- e063e5e: Add stale async positioning generation guards so late floating-ui promises cannot overwrite newer overlay coordinates or width styles.
- e063e5e: Revert the `web-ui-theme` host to `display: contents` and stop painting `--wui-color-page` on it. The block box + background painting were added in this same un-released batch as a workaround for an iOS Safari token-inheritance concern; the user verified on-device that `contents` and `block` behave identically, so the host is back to drawing nothing and the embedding application keeps full control of the surface behind the themed subtree. Custom properties still inherit into slotted content (`display` does not affect inherited custom properties).
  
  Fix the image-preview `swipe` carousel to a single-track layout. Previously the current image and the adjacent image were positioned independently with their own transforms, so on images with different aspect ratios they overlapped and misaligned. Now the current image and its neighbors sit in equal-size slides on one track: the stage clips the overflow, the whole track translates with the finger, and the adjacent image enters and leaves on the same baseline at the same size (with `loop` on, the wrap-around neighbor is always present beside the current image, so a drag near the end keeps following a real adjacent image instead of running into empty track). Releasing past the threshold slides the next image in; below it the strip bounces back, and at the non-looping bounds it bounces back instead of crossing the boundary.
  
  Fix frosted-glass handles on `web-ui-switch`, `web-ui-slider` and `web-ui-segmented` flashing their blur on long-press/drag. `backdrop-filter` was already always-on, but the background still switched from opaque white to translucent glass at press — that is the property change that makes Chrome re-rasterize the backdrop region as a hard flash. The glass surface composition (`backdrop-filter` + background) is now identical across resting, pressed and dragging states; only the transform and the lifted shadow change. A dialog's own glass surface stays stable too because the handle no longer suddenly blurs the content behind it.
  
  Deepen the pressed/dragging handle shadow on `web-ui-switch` (`0 2px 10px rgb(0 0 0 / 0.28), 0 10px 28px rgb(0 0 0 / 0.24), 0 18px 44px rgb(0 0 0 / 0.16)`) and `web-ui-segmented` (`0 0 1px rgb(0 0 0 / 0.12), 0 6px 18px rgb(0 0 0 / 0.22), 0 16px 36px rgb(0 0 0 / 0.16)`) for a stronger lifted-glass feel.
  
  Fix draggable-drawer open/close transitions being lost after rapid taps on the drag handle. Two independent causes are addressed. First, every tap finishes through the rebound path, which wrote a `translateX(0px)` inline style (kept deliberately for the Safari double-rebound fix); that zero-value inline later overrode the closed-state CSS transform, so closing via button/backdrop/Escape stopped transitioning and reopens had no animation either. The no-animation rebound path now clears the inline drag styles instead of leaving a zero transform behind, and a close that starts while no drag animation is in flight clears any leftover drag inline styles before the exit transition is computed. Second, the native dialog `close` event is dispatched asynchronously, so a fast close→reopen can deliver the previous close session's stale `close` event after the reopen; the overlay presence now flags its own `dialog.close()`, and `web-ui-drawer` / `web-ui-dialog` swallow that event (stale or not) instead of treating it as an external close that immediately closes the freshly reopened dialog. Genuine external closes (for example a form with `method="dialog"`) still close normally.
- e063e5e: Fix the pressed/dragging handle shadow on `web-ui-switch` and `web-ui-segmented` not showing on iOS. The previous round drove the pressed `box-shadow` through a CSS custom property (`--wui-internal-glass-shadow` / a shadow-list variable); iOS Safari does not transition a property when only its custom-property input changes and can skip the discrete `var()` switch entirely, so the pressed look "reverted" on device. The pressed state now writes the `box-shadow` value directly in the class (regular property change, reliably transitioned everywhere), keeping the glass inset highlight, and the shadows are deepened further for a clearly lifted look: switch `0 2px 12px rgb(0 0 0 / 0.32), 0 14px 36px rgb(0 0 0 / 0.28), 0 28px 64px rgb(0 0 0 / 0.2)`, segmented `0 0 1px rgb(0 0 0 / 0.16), 0 10px 28px rgb(0 0 0 / 0.28), 0 24px 56px rgb(0 0 0 / 0.2)`.
  
  Fix image-preview carousel neighbors "bleeding through" while zoomed. The swipe track keeps the two neighbors rendered beside the current image, but the shared per-image transform previously applied the zoom scale and the pan offsets to every slide, so at scale > 1 the adjacent images were scaled up too and their edges entered the viewport. Now the zoom scale (and, while zoomed, the pan offsets) apply only to the current image; the neighbor slides stay at 1x and frozen in their track positions, so panning while zoomed never brings them into the viewport. At 1x the neighbors still share the vertical pan to stay aligned during diagonal swipes, and swipe behavior is unchanged.
- e063e5e: Restore the `web-ui-switch`, `web-ui-slider` and `web-ui-segmented` handles to their original pressed-glass structure: the resting handle is a solid white thumb / indicator, and pressing or dragging switches it to frosted glass — backdrop blur + translucent glass background + 1.5x scale + a clearly lifted shadow. The previous round made the glass composition constant (backdrop blur always on, background never changing), which hid the press transition on iOS; that was the wrong target and is reverted. The iOS-safe pressed `box-shadow` from the last round is kept: the class writes the shadow value directly (no CSS custom-property indirection, which iOS Safari does not transition).
  
  Make `web-ui-dialog`'s background blur continuous across every state switch. The dialog element's own `opacity` transition made the `dialog` a backdrop root while `opacity < 1`, which completely disabled the glass body's `backdrop-filter` during the transition — the blur popped in/out at the opacity endpoints instead of fading (verified in a real browser: an ancestor with `opacity` or `filter` disables descendant backdrop-filter, while `transform` and the element's own opacity fade do not). The dialog now keeps `opacity: 1` on the element (only the transform scale animates there), fades the content through a `.wui-dialog-surface` wrapper, and blurs through a dedicated `.wui-dialog-blur` layer whose own opacity transition fades the blur smoothly; the body no longer carries its own `backdrop-filter`, so there is no double blur at rest.
  
  Lock the image-preview `swipe` gesture to horizontal at 1x. While the swipe gesture applies, the vertical delta is now ignored entirely — no vertical pan and no vertical follow (previously a 1x swipe drag still panned vertically). Zoomed-in dragging is unchanged and pans on both axes.

## Unreleased

### Minor Changes

- Add `imagePreview()`, an imperative full-viewport image preview. It has no declarative tag contract: it is opened through `imagePreview(options)`, mounted into the nearest `web-ui-theme` overlay container (or an explicit `container`) and driven through the returned handle (`index`, `scale`, `images`, `closed`, `next`, `prev`, `goTo`, `zoomIn`, `zoomOut`, `resetZoom`, `close`). It shares the `native-dialog-presence` and `scroll-lock` plugins with `<web-ui-dialog>` rather than wrapping that component, because the preview needs a dialog that fills the viewport itself with its own pointer interaction.
- Add presentation options to `imagePreview()`: `nav`, `toolbar`, `closable`, `indicator`, `swipe`, `noScrollLock` and `noBackdropClose`. Every presentation option defaults to `false`, so a preview now renders only the image itself unless the consumer opts in. `noScrollLock` and `noBackdropClose` mirror the same-named `<web-ui-dialog>` properties in naming and semantics.
- Anchor every `imagePreview()` zoom to a point that stays visually fixed, and add built-in pinch-to-zoom. The wheel now keeps the content under the cursor still and a pinch keeps the midpoint between the two fingers still, while the toolbar buttons, keyboard shortcuts and double-click keep expanding around the viewport center. Pinch has no option because the stage already owns pointer interaction: the first finger still drives pan/swipe, the second finger both starts the pinch and aborts any in-flight pan or swipe, and the compatibility `click` that mixed input may synthesize afterwards is swallowed instead of closing the preview. The pinch handling itself lives in the internal shared gesture layer (`attachPinchGesture`, not part of the package's export map) and reports only geometry — the distance ratio plus the midpoint and its delta — leaving the mapping to scale and translation to the component.
- Let `imagePreview()` be dragged to pan in any direction at any zoom level, and make that the stage's default drag behaviour. Previously a drag only did something while zoomed in, and the offsets were clamped to how far the image overflowed the stage — which is zero at 1x. The bound is now half the absolute size difference between the image and the stage: zoomed in it still reveals the cropped edges, at 1x it moves the image around inside the viewport, and either way the image can never be dragged out of the viewport. Holding the mouse button down and resting a single finger take the same Pointer path, so desktop and mobile behave identically. `swipe` is narrowed to own the horizontal axis only when it actually applies (1x, more than one image); everything else pans, direction free. Because panning also works at 1x, `resetZoom()` now has something to reset when the image is merely displaced, so the toolbar reset button is enabled whenever the image is zoomed *or* panned rather than only above 1x.
- Expose drawer section padding tokens: `--wui-drawer-header-padding` (default `16px 20px`), `--wui-drawer-content-padding` (default `20px`), `--wui-drawer-footer-padding` (default `16px 20px`). The content padding token also drives the drag bar visual center via `calc(var(--wui-drawer-content-padding) / 2)`, so changing content padding automatically repositions the drag bar.

### Patch Changes

- Fix `imagePreview()` closing when the user clicked the image. As soon as the stage held pointer capture, the compatibility `click` event was retargeted to the stage and treated as a backdrop click; the same retargeting also broke double-click zoom while zoomed. Pan and swipe now share `attachDragGesture`, which defers pointer capture until the drag threshold is crossed, and backdrop detection relies on the (un-retargeted) `pointerdown` origin instead of the `click` target. That origin is recorded only for the primary left-button pointer and ignored for non-pointer clicks (keyboard activation, programmatic `.click()`), so a secondary touch or a synthetic click cannot close the preview by accident.
- Constrain `imagePreview()` images to the viewport at 1x. The stage relied on an implicit grid row sized by its content, so `max-width` / `max-height: 100%` had no definite reference and large images were clipped by the viewport instead of contained inside it.
- Align the `imagePreview()` toolbar padding with the other glass pills (`6px 10px` → `6px`).
- Use the `radix-icons:reset` glyph for the `imagePreview()` reset-zoom button instead of `lucide:refresh-cw`, so the affordance reads as "back to 1x" rather than "reload".
- Reduce drawer drag zone default from `32px` to `20px` (`--wui-drawer-drag-zone-size`). Consumer can override back to 32px+ if needed.
- Reduce slider thumb default dimensions: width `30px` → `24px`, height `20px` → `18px`. Add `--wui-slider-thumb-radius` token (default `8px`) replacing the auto-derived pill shape. Glass corner radius now uses this token instead of `calc(min(width, height) / 2)`.

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
  - The inset is no longer a hard-coded internal value; all other floating-card behavior (drag-close distance math, controlled hover end-state) reads the same variable and follows the token automatically.
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
  
  - Non-headless drawers now render as floating rounded cards inset 8px from all viewport edges; elastic drag distances read as margin changes instead of gaps
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
  - Height/width animation via CSS grid `0fr ↔ 1fr` transition — content-adaptive, zero JS measurement, interruptible (grid-transition selection carried over from the collapse design iteration; API shape superseded by the single-element form). `horizontal` switches the axis (default vertical).
  - Three-state closed semantics; consumer light DOM is never moved: default closed state sets `hidden` on the internal content container, `keep-mounted` (now on the root element) keeps content measurable inside the collapsed track with `inert` (scroll position preserved).
  - Headless kernel: the component carries no visual styling beyond the animation structure; trigger and content typography come from the consumer.
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
  - The inset is no longer a hard-coded internal value; all other floating-card behavior (drag-close distance math, controlled hover end-state) reads the same variable and follows the token automatically.
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
  
  - Non-headless drawers now render as floating rounded cards inset 8px from all viewport edges; elastic drag distances read as margin changes instead of gaps
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
  - Height/width animation via CSS grid `0fr ↔ 1fr` transition — content-adaptive, zero JS measurement, interruptible (grid-transition selection carried over from the collapse design iteration; API shape superseded by the single-element form). `horizontal` switches the axis (default vertical).
  - Three-state closed semantics; consumer light DOM is never moved: default closed state sets `hidden` on the internal content container, `keep-mounted` (now on the root element) keeps content measurable inside the collapsed track with `inert` (scroll position preserved).
  - Headless kernel: the component carries no visual styling beyond the animation structure; trigger and content typography come from the consumer.
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

  详见 `docs/adr/0005-web-ui-component-architecture.md`。

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
