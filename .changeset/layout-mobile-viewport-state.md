---
'@greypan/web-ui': minor
'@greypan/interweave': patch
---

`<web-ui-layout>` exposes the mobile-viewport state it renders by, so consumers no longer keep a breakpoint of their own.

**New API.** `mobile` is a **derived, read-only** member: a getter-backed property, a reflected `mobile` attribute, and a `mobile-change` (`CustomEvent<{ mobile: boolean }>`) notification that fires once per crossing, including the connect-time evaluation when the element mounts on a narrow viewport. It is not an input — the property is read-only (assignments take no effect and throw for strict-mode callers) and setting the attribute is reverted in the same reaction, value included, with no event for either. Read `layout.mobile` for the current value and subscribe to `mobile-change` for updates; CSS can target `web-ui-layout[mobile]`.

**Consuming it.** The layout re-renders in a microtask, so a consumer that reacts on a scheduler macrotask reads the old value while the new tree is already on screen. Vue is fine with a template `@mobile-change` binding (listeners are attached before insertion and flush in a microtask); React needs the element through a ref, the value read and subscribed inside `useLayoutEffect`, and the write-back wrapped in `flushSync`. Without that, the layout's React demo rendered the drawer with a stale consumer width for a frame on every crossing into mobile — measured at 2 of 221 sampled frames, zero after the fix.

**Timing change.** The judgement moved from `window.innerWidth <= 640` plus a 100 ms `resize` debounce to `matchMedia('(width <= 640px)')` — the same condition as the layout's own `@media (width <= 640px)`. The tree switch, that CSS rule and `mobile` now flip at the same instant. Previously the layout could keep rendering the desktop tree for up to 100 ms after the CSS had hidden the aside, during which the sidebar disappeared entirely, and crossing back showed the drawer alone for the same window. Same-side viewport changes no longer recompute anything.

The breakpoint literal still appears four times (layout and drawer, TS and CSS): a media query cannot read a custom property, so it cannot be single-sourced. `components/drawer/__tests__/breakpoint-parity.spec.ts` guards their equality.

**App CSS follows the same attribute.** The three apps declare a Tailwind v4 custom variant on `web-ui-layout[mobile]`, so the mobile side of the 640 boundary is written once instead of once per breakpoint utility:

```css
@custom-variant mobile (&:where(web-ui-layout[mobile], web-ui-layout[mobile] *));
```

Every `max-[640px]:` (plus Interweave's single `max-sm:`) becomes `mobile:`. The min-width side does **not** follow, and that is a measured result rather than an omission: replacing the demos' `sm:` with a `desktop:` variant (and even with the media form `@media (width > 640px)`) silently overrode `md:` and `lg:`, because Tailwind v4 emits `@custom-variant` rules after the theme breakpoints and `:where()` keeps the specificity tied — so the later rule wins, and `desktop:grid-cols-4` flattened the home page to 2 columns at every width (baseline 3) and the svg demo to 3 (baseline 5). `sm:` and the demos' `--breakpoint-sm` token therefore stay, and the trap is documented in all three `global.css` files with those numbers. Two further costs: the variant only reaches nodes inside the layout subtree (overlay content portaled to `document.body` — menus, popover, tooltip, select, autocomplete, image-preview, toast — must keep using media queries; no such node uses it today), and breakpoints the layout does not model (`md:`, `lg:`, `xl:`, `max-[900px]:`) stay media queries.

In the Interweave frontend the shell consumes the new event, provides the value to the page, and the page's drawers and dialogs read it from there; the local `useMediaQuery` composable is gone. Decision record: `docs/adr/0023-layout-exposes-derived-mobile-viewport-state.md`.
