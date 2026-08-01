# web-ui Component Guide

Read this guide before changing `packages/web-ui`. The package-level `AGENTS.md` contains the short mandatory rules; this guide explains the implementation conventions behind them.

## Sources of truth

- Theme colors, layers, and motion defaults: `packages/web-ui/src/components/theme/style.css`
- Overlay placement and theme scope: `packages/web-ui/src/shared/overlay/` and `packages/web-ui/src/shared/theme/`
- Shared portal menu styles: `packages/web-ui/src/assets/menu-portal.css`
- Public component API: `packages/web-ui/README.md` and `README.CN.md`

Do not duplicate token values in guidance. Every `var(--wui-*, fallback)` used by a standalone component must use the equivalent light-theme value from `theme/style.css`.

## Adding or changing a component

- Add new built-in icons to `packages/web-ui/icons.used.json`, then run `pnpm --filter @greypan/web-ui generate-icons`. Import generated icon data from `@/icons`; do not add a runtime icon dependency.
- Add a new component to both `src/types/vue.ts` and `src/types/react.ts` so framework users receive type support.
- Treat properties, defaults, allowed values, slots, methods, events, accessibility semantics, and form behavior as the public contract. Normalize literal and numeric properties through `@/shared/normalize` so JavaScript callers receive documented fallback behavior.
- Synchronize `README.md` and `README.CN.md` when that public contract changes. Their structure must remain equivalent.

## Styling, layers, and motion

- Prefer the semantic `--wui-*` color, surface, shadow, layer, and motion tokens over literal values. Component-local variables are implementation details, not public API.
- `surface-glass` is for transparent controls; `surface-overlay` is for readable global overlay panels. Use the raised surface level that matches the visual contrast required by the control.
- Keep the sticky layout header above content and sidebar. Use local layers for non-portal panels; portal menus use the menu layer; Toast sits above menus; native Dialog and Drawer use the browser top layer. BackTop belongs to the auxiliary layer below portal menus.
- High-frequency press interactions use press tokens; color and background feedback uses the feedback token; Dropdown, ContextMenu, and Select use menu enter/exit tokens; generic anchored overlays use overlay enter/exit tokens; Drawer uses its drawer token. `motion="system"` follows `prefers-reduced-motion`; `reduced` disables displacement within its theme scope; nested `full` scopes restore normal tokens.
- Overlay visibility transitions must reuse `shared/overlay/presence`; overlay positioning remains owned by `defineOverlay`. In reduced motion, remove transform displacement while retaining necessary brief opacity or state feedback.
- Put pointer hover affordances inside `@media (hover: hover) and (pointer: fine)`.

## Overlay architecture

- Shared overlay state is defined with `defineXxx(...): Plugin` factories, each returning `definePlugin(...)`; components instantiate it through `defineXxx(...).make(...)` instead of an internal state class.
- Reuse `shared/overlay/anchored-panel` for a single panel anchored to a trigger. The component retains its trigger, focus, content, and dismissal semantics; the shared module owns local/portal mounting, positioning, and presence.
- Use `shared/menu-portal` for Dropdown and ContextMenu. Their common menu-tree operations live there, while anchor-based versus coordinate-based placement stays local to each component.
- Reuse `shared/overlay/native-dialog-presence` for native `<dialog>` modals such as Dialog and Drawer. Keep native top-layer, backdrop, and Escape policy in the owning component.
- Acquire page-scroll blocking through `createScrollLockLease()`. Release the lease on disconnect; never call a global unlock for a lock the instance did not acquire.

## Shadow DOM and Lit

- Each component stylesheet begins with the universal `box-sizing: border-box` rule for descendants.
- Keep host styling limited to layout, containment, cursor, and inherited token definitions. Rendered visual styling belongs inside the shadow tree, where page resets cannot override it.
- Do not use global HTML attributes such as `hidden`, `title`, or `role` as component-specific state attributes. Map declarative boolean attributes explicitly. A default-true boolean that must accept a framework-provided `"false"` string uses `booleanWithFalseString` and tests its attribute path.
- Use `classMap()` for multi-class state, `styleMap()` or safe template values for styles, and Lit's `nothing` for absent conditional content. When a prop and slot express the same content, the slot wins and slot changes must update dependent layout state.
- Use top-level `:host([attribute])` selectors rather than nested host attribute selectors.
- Prefer native CSS nesting for component descendant states; keep the scroll viewport and padded content as separate elements when padding must scroll with the content.

## Interaction, lifecycle, and accessibility

- Disabled components block interaction in logic; do not use `pointer-events: none` as the disabled mechanism because it removes cursor and tooltip behavior.
- Global listeners, portal resources, and scroll locks release only resources acquired by that instance. Check that an element remains connected before creating global resources from an update lifecycle.
- Prefer Pointer Events to mouse-specific events. Ignore touch pointers for hover-triggered behavior, use capture plus `pointercancel` for drags, and use `click` for external-click dismissal. Keep `contextmenu` and focus events as their own semantics.
- Interactive components require suitable roles and accessible names; use `:focus-visible`; forward host labels to native shadow controls. Prefer native `<dialog>` for modal dialogs and wait for its visual exit before closing it.
- Form-associated controls use `ElementInternals`, synchronize form values and disabled state, and emit composed bubbling `input` then `change` only for user-originated changes. Framework-specific value-change event names are not public API.

## Tests

- Test public contracts, not private fields, internal classes, or implementation order.
- Default `*.spec.ts` tests cover host properties, events, reflection, slots, and non-browser DOM behavior. `*.browser.spec.ts` covers ElementInternals, FormData, pointer interaction, focus, portals, and native dialogs.
- Use the helpers in `@/shared/test-utils`. Follow the browser-mode and reduced-motion guidance in [`testing.md`](testing.md).
