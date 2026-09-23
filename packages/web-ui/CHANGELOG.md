# @greypan/web-ui

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
