# @greypan/web-ui

> Lit-based web components for React, Vue, and vanilla JS

English | [简体中文](./README.CN.md)

## Demo

[View components used by vue](https://pan-z2l0ahvi.github.io/mono/vue-web-ui-demo/)

[View components used by react](https://pan-z2l0ahvi.github.io/mono/react-web-ui-demo/)

## Install

```bash
npm install @greypan/web-ui
```

Requires `lit` as a dependency.

## Quick Start

```js
import '@greypan/web-ui'
// import '@greypan/web-ui/components/button'
```

A subpath import registers only the component it names, so import every tag the page uses.

```html
<web-ui-button variant="primary">Click me</web-ui-button> <web-ui-icon .icon="${lucidePlus}"></web-ui-icon>
```

## Scrollbars

`@greypan/web-ui/scrollbars` carries the repo-wide scrollbar behavior for [OverlayScrollbars](https://github.com/KingSora/OverlayScrollbars)
hosts: a macOS-aligned theme, auto-hide that reveals the bar while scrolling, and clicking the track scrolling to that spot.
Import the stylesheet once per document and pass the options to whichever adapter you initialize with.

```js
import '@greypan/web-ui/scrollbars.css'
import { webUiScrollbarsOptions } from '@greypan/web-ui/scrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react' // or overlayscrollbars-vue

;<OverlayScrollbarsComponent options={webUiScrollbarsOptions}>{children}</OverlayScrollbarsComponent>
```

- `overlayscrollbars` is an optional peer dependency and is only needed by this subpath. The stylesheet already
  contains the library's structural styles, so it replaces `import 'overlayscrollbars/overlayscrollbars.css'`.
- Keep the container's own `overflow` declaration (`overflow-y-auto`, …). OverlayScrollbars overrides it once it
  takes over, but it is what keeps the container scrollable until then.
- The target must be a plain scroll container. OverlayScrollbars turns the host into a flex row and moves its
  children into a generated viewport, so a host whose own layout carries meaning — a grid, a centred box, a `ul`/`ol`
  — loses it.
- OverlayScrollbars only changes the element it is initialized on; children keep their native scrollbars. To cover
  the document scroller, initialize `document.body` — `window.scrollY` / `window.scrollTo` keep their native
  semantics there.
- Components that own a scroll container (`select`, `autocomplete`, the dropdown / context-menu panels,
  `dialog`, `drawer`, `toast`) theme that container's **internal** scrollbar inside their own shadow root.
  OverlayScrollbars cannot reach a shadow root — its structural styles and theme classes are document-level
  selectors — so the components read the same inherited `--wui-scrollbar-*` colours through `scrollbar-color`
  / `scrollbar-width` on the native scrollbar instead. `::-webkit-scrollbar` is deliberately not used: styling
  it opts out of the platform's overlay scrollbar and reserves a layout gutter, which these scrollbars must
  not do. Import this stylesheet for the internal scrollbars to follow the appearance, just like the
  page-level ones.

## Vite

`@greypan/web-ui/vite` exports `webUiOptimizeDeps`, the list of web-ui runtime dependencies an app has to merge
into `optimizeDeps.include`.

web-ui components pull `lit`, `@lit/context` and `@floating-ui/dom` out of web-ui's own dist. Those packages are
not in the app's dependencies, so Vite cannot resolve them from the app, and a bare name is skipped in silence.
The scanner then finds them mid-request, prints `optimized dependencies changed. reloading`, and that module load
fails with `Failed to fetch dynamically imported module`.

The list is needed when the scanner cannot follow the component graph: routes or pages loaded through a virtual
module, such as file-based routing (`vue-router/vite`) or `import.meta.glob`. An app whose entry statically
imports every component module already pulls the graph into the startup scan and does not need it.

```js
import { webUiOptimizeDeps } from '@greypan/web-ui/vite'

export default {
  optimizeDeps: {
    include: [...webUiOptimizeDeps]
  }
}
```

- The entries use Vite's `<pkg> > <dep>` resolution form, so they resolve through web-ui's dependency tree
  rather than the app's.
- Reference the export instead of copying entries. It tracks web-ui's runtime dependencies.
- It only affects dev-time pre-bundling. Builds are unaffected.
- After changing a config that carries the list, remove `node_modules/.vite` once and restart. A warm cache
  hides a missing entry until CI, which has no cache.

## Framework Setup

### Cross-framework API conventions

`web-ui-*` elements expose three surfaces. The **DOM / JavaScript API is the source of truth**: Properties use
camelCase, Attributes use kebab-case, Events use kebab-case.

| Surface   | Naming     | Examples                                      |
| --------- | ---------- | --------------------------------------------- |
| Property  | camelCase  | `open`, `sidebarCollapsed`, `noScrollLock`    |
| Attribute | kebab-case | `open`, `sidebar-collapsed`, `no-scroll-lock` |
| Event     | kebab-case | `open-change`, `sidebar-collapsed-change`     |

- **Boolean attributes** follow native HTML presence semantics: absent → `false`, presence → `true`. A framework
  binding that writes `disabled="false"` produces the string `"false"`, which is truthy. **Bind dynamic booleans as
  properties** (camelCase), not attributes, so `false` is written as a real property.
- **Vue**: dynamic binding must go to **Properties** with camelCase names (`:sidebarCollapsed="x"`, `:open="x"`).
  A kebab-case binding like `:sidebar-collapsed="x"` is written as a string attribute and cannot express `false`;
  use the camelCase property. The `.prop` modifier is only valid with the camelCase name
  (`:sidebarCollapsed.prop="x"`). String/number values may stay on kebab-case attributes (`:max-height="120"`).
  `v-model` is supported on value-bearing controls (`web-ui-input`, `web-ui-select`, `web-ui-autocomplete`, …) and
  compiles to the element `value` property + `input` event.
- **React**: React 19 writes DOM properties for custom-element props, so use camelCase props (`open={open}`,
  `noScrollLock`, `value={value}`). Never pass complex data (objects, arrays) through attribute strings. Bind
  them as properties. Kebab-case JSX props on a custom element are written as attributes.

### React

Requires `@types/react >= 19` as optional peer dependency.

```ts
// vite.config.ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'

export default {
  plugins: [unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true })]
}

// env.d.ts
import '@greypan/web-ui/types/react'
```

```tsx
import '@greypan/web-ui'

function App() {
  return (
    <>
      <web-ui-button variant="primary" onClick={() => alert('clicked')}>
        Click
      </web-ui-button>
      <web-ui-input onInput={e => console.log(e.currentTarget.value)} />
    </>
  )
}
```

#### React custom-element events and boolean properties

React 19 registers Custom Element events using the suffix of the JSX `on` key unchanged. Event names are
case-sensitive: bind `open-change` as `onopen-change`, not `onOpenChange`. Standard `input`, `change`, `focus`,
and `blur` events use React's conventional `onInput`, `onChange`, `onFocus`, and `onBlur` handlers. Their
`currentTarget` is typed as the component instance, so `value` and `checked` are read cast-free. The `target`
follows React SyntheticEvent semantics (`EventTarget`) and is not narrowed. Kebab-case custom events carry their
`CustomEvent` detail typed. Boolean properties follow native HTML semantics: absence is `false` and presence is
`true`.

```tsx
<web-ui-dialog
  open={open}
  noScrollLock
  onopen-change={event => setOpen(event.detail.open)}
/>
<web-ui-select value={value} onChange={event => setValue(event.currentTarget.value)} />
```

When a component moves a child into its Portal Shadow DOM (such as a `web-ui-dropdown` menu item), React's
root-delegated synthetic `onClick` cannot receive that child's event. Bind a native listener directly through a
`ref` instead:

```tsx
const itemRef = useRef<HTMLElement>(null)

useEffect(() => {
  const item = itemRef.current
  if (!item) return
  const close = () => setOpen(false)
  item.addEventListener('click', close)
  return () => item.removeEventListener('click', close)
}, [])

<web-ui-dropdown-item ref={itemRef}>Paste and close</web-ui-dropdown-item>
```

In `portal` mode the library physically moves panel content into the overlay Shadow DOM:

- React removes nodes through its recorded insertion parent, so a bare conditional child (`{condition && <el/>}`) whose node was already migrated cannot be removed while the panel is open: the commit fails and the node can reappear when the panel closes.
- Conditionally render inside a stable wrapper element instead. React records the wrapper as the insertion parent, so wrapper-local additions and removals keep working while the panel is open and across open/close cycles (example below).
- Bare conditional additions while the panel is open (appending to the host) keep working and migrate into the panel automatically.
- Keeping content mounted and toggling visibility remains a valid fallback.

```tsx
<web-ui-popover portal open={open} trigger="manual">
  <div className="panel-body">{editing && <TagEditor />}</div>
</web-ui-popover>
```

### Lit

Portal panels support live rendering for Lit child parts: `${condition ? html`<el/>` : nothing}` inside
`web-ui-popover`, `web-ui-tooltip`, `web-ui-select` and `web-ui-autocomplete` migrates into the open panel
automatically, removals and element-to-element swaps work while the panel is open, and on close content is
restored to its original anchor position. lit-html child-part markers stay in the host light DOM, so
subsequent patches keep anchoring correctly. Boundary: reordering a `repeat()` list while a panel is open is
not supported. Lit inserts relative to host part markers while sibling items already live in the panel, the
same cross-container anchoring boundary as Vue's keyed `v-for`. Apply list reorders while the panel is closed.

`web-ui-dropdown` manages menu items through the shared menu portal, which reconciles from both the host and
the panel: child-part additions while the panel is open work, but lit cannot reach items that already live in
the panel, so removals and element swaps there are not supported. Apply them while the panel is closed.
`web-ui-context-menu` does not observe host-side insertions and is not covered by these live-rendering
guarantees.

### Vue

Requires `vue >= 3.5` as optional peer dependency.

Portal panels support live rendering: content conditionally added or removed while a panel is open (Vue
`v-if` inside `web-ui-select`, `web-ui-autocomplete`, `web-ui-popover`, `web-ui-tooltip`, `web-ui-dropdown`,
`web-ui-context-menu`) migrates into the open panel automatically in template order, and on close everything
is restored to its original anchor position so subsequent patches keep working. Boundary: splicing or
reordering a keyed `v-for` list while a panel is open is not supported. Vue's keyed children diff resolves
insertion anchors against sibling nodes already migrated into the panel, so its patch fails and items can be
lost, regardless of compilation path (compiled templates included). Apply such list updates while the panel
is closed, or keep to appends/removals at the list tail.

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'

export default {
  plugins: [
    vue({
      template: { compilerOptions: { isCustomElement: tag => tag.startsWith('web-ui-') } }
    }),
    unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true })
  ]
}

// env.d.ts
import '@greypan/web-ui/types/vue'
```

```vue
<template>
  <web-ui-button variant="primary" @click="handleClick">Click</web-ui-button>
  <web-ui-input v-model="value" />
  <web-ui-select :value="framework" @change="framework = $event.target.value" />
</template>
```

Boolean properties must be bound with the **camelCase property name**, not the kebab-case attribute. Vue writes
attribute bindings as strings, and boolean attributes follow presence semantics, so `:sidebar-collapsed="false"`
produces the string `"false"`, which is truthy. Binding the camelCase name (`:sidebarCollapsed="false"`, or the
`.prop` modifier) makes Vue write the DOM property directly:

```vue
<web-ui-layout
  header-glow
  :sidebarCollapsed="sidebarCollapsed"
  :sidebarOpen="sidebarOpen"
  @sidebar-collapsed-change="sidebarCollapsed = $event.detail.collapsed"
  @sidebar-open-change="sidebarOpen = $event.detail.open"
/>
```

Vue events are typed cast-free: `@input`/`@change` on value-bearing components resolve to the component emit, so
`$event.target` is the component instance and `value`/`checked` are read directly. `$event.detail` keeps the
`CustomEvent` payload type for kebab-case events like `open-change`. Named handlers annotate with
`WebUiEvent<WebUiXxx, 'change'>`; use `WebUiEventName<WebUiXxx>` when a value or generic represents an
event name, because it accepts only the component's string `$events` keys. `@click`/`@focus` and other native
events not declared as emits remain bindable on any `web-ui-*` element.

### Attribute and event boundaries

`web-ui-*` elements are the public DOM boundary. `id`, `class`, `style`, global HTML attributes, and `data-*` stay on
the custom-element host; they are not copied into its Shadow DOM. Components expose native-element attributes only when
they document an explicit semantic mapping. For example, `web-ui-button` maps `type` to its inner button and accepts
only `button`, `submit`, or `reset` (invalid values become `button`).

ARIA attributes are explicit: use the component's documented naming attributes, not a blanket `aria-*` pass-through.
Components own their role and interaction state. Browser-native composed events such as `click`, `input`, and `change`
remain the primary interaction API. Kebab-case custom events such as `open-change` describe user-originated component
state changes; assigning a property programmatically does not emit them.

### Cursor behavior

Interactive controls use the native arrow cursor instead of the hand cursor. Disabled controls use `not-allowed`.
Slider, switch, and segmented controls keep the arrow cursor during hover and press feedback, then switch to
`grabbing` only while a drag is active. Dedicated drag handles and resize controls keep their specialized cursors.
Cursor styles live inside Shadow DOM, so a plain document-level selector cannot override them.

### Controlled state semantics

`web-ui-*` elements do not use a single "controlled" contract; three distinct state models exist, chosen per component
family by the nature of the interaction. Do not assume `controlled` means the same thing across components.

**User-originated events only (all `open`-style components: collapse, popover, dropdown, tooltip, dialog, drawer, back-top).**
`*-change` events (`open-change`, etc.) fire only for user-originated toggles; assigning the property programmatically
(`el.open = true`) or calling an imperative method (`show()`, `close()`, `toggle()`) never emits. Components self-manage
their `open` value unless you coordinate externally. You may observe the event and write it back for your own state, but
the component does not require or wait for that write-back.

**Request-then-write-back (`controlled` on dialog and drawer only).**
With `controlled`, user close actions (Escape, backdrop, built-in close, drag-release) only _request_ `open=false`; the
component does not change its own state, and it stays open until the consumer writes `open=false`. This is the modal
confirmation semantics. Closing a dialog or drawer is typically an operation that needs consumer approval (unsaved form,
confirmation), and unlike instantaneous open/close, it is not safe for the component to self-commit. Only these two modal
components use this mode; the instant open/close family (collapse, popover, dropdown, tooltip) does not need it.

**Native form-model (input, textarea, input-number, select, checkbox, radio, switch, autocomplete).**
The control manages its own value/checked state internally; user interaction flips it immediately and then dispatches
native `input`/`change` events. Assigning the property programmatically (`el.checked = true`) overrides the internal
state. This mirrors native `<input type="checkbox">`. There is no `controlled` prop because the value is always readable
and writable, and React/Vue layers provide their own controlled wrappers on top.

For interactions that need an external round-trip before the flip is durable (e.g. a switch that should only stay on
after an API call succeeds), use the optimistic-update path:

- Flip immediately, then observe `change`.
- Set the control's `loading` during the request; this blocks further interaction and shows a spinner.
- On failure, write the property back (`el.checked = false`) and surface a toast.

The flip-before-approval window is accepted; there is no `controlled` prop for a reject-before-flip contract.

### Form-associated controls

All form controls participate in native `FormData`, constraint validation, `form.reset()` and browser form-state restoration. The control captures its reset default once, after declarative attributes have been applied on its first connection. Later runtime property updates do not redefine that default. A disabled ancestor `fieldset` disables validation and interaction without mutating the control's public `disabled` property. For checkbox/radio groups, the group is the single submission, reset and restoration owner; managed child controls do not submit or restore an independent state.

`web-ui-button` is also form-associated so its host can own an outer form and forward `submit`/`reset` activation. It contributes no value to `FormData`.

## All Components

Every component has its own doc page: API reference, behavior notes and interactive examples all live under [`docs/`](docs/). The table below is just the index.

| Category               | Component                                                 |
| ---------------------- | --------------------------------------------------------- |
| **Form Controls**      | [`<web-ui-input>`](docs/input.md)                         |
|                        | [`<web-ui-textarea>`](docs/textarea.md)                   |
|                        | [`<web-ui-editable-text>`](docs/editable-text.md)         |
|                        | [`<web-ui-input-number>`](docs/input-number.md)           |
|                        | [`<web-ui-select>`](docs/select.md)                       |
|                        | [`<web-ui-autocomplete>`](docs/autocomplete.md)           |
|                        | [`<web-ui-slider>`](docs/slider.md)                       |
|                        | [`<web-ui-checkbox>`](docs/checkbox.md)                   |
|                        | [`<web-ui-radio>`](docs/radio.md)                         |
|                        | [`<web-ui-switch>`](docs/switch.md)                       |
|                        | [`<web-ui-segmented>`](docs/segmented.md)                 |
|                        | [`<web-ui-checkbox-group>`](docs/checkbox-group.md)       |
|                        | [`<web-ui-radio-group>`](docs/radio-group.md)             |
| **Buttons**            | [`<web-ui-button>`](docs/button.md)                       |
|                        | [`<web-ui-button-group>`](docs/button-group.md)           |
| **Overlay / Modal**    | [`<web-ui-dialog>`](docs/dialog.md)                       |
|                        | [`<web-ui-drawer>`](docs/drawer.md)                       |
|                        | [`imagePreview()`](docs/image-preview.md)                 |
| **In-flow Disclosure** | [`<web-ui-collapse>`](docs/collapse.md)                   |
| **Floating**           | [`<web-ui-popover>`](docs/popover.md)                     |
|                        | [`<web-ui-tooltip>`](docs/tooltip.md)                     |
|                        | [`<web-ui-context-menu>`](docs/context-menu.md)           |
| **Menu**               | [`<web-ui-dropdown>`](docs/dropdown.md)                   |
|                        | [`<web-ui-dropdown-item>`](docs/dropdown-item.md)         |
|                        | [`<web-ui-dropdown-divider>`](docs/dropdown-divider.md)   |
|                        | [`<web-ui-dropdown-header>`](docs/dropdown-header.md)     |
| **Data Display**       | [`<web-ui-avatar>`](docs/avatar.md)                       |
|                        | [`<web-ui-badge>`](docs/badge.md)                         |
|                        | [`<web-ui-empty>`](docs/empty.md)                         |
|                        | [`<web-ui-middle-ellipsis>`](docs/middle-ellipsis.md)     |
|                        | [`<web-ui-icon>`](docs/icon.md)                           |
|                        | [`<web-ui-spinner>`](docs/spinner.md)                     |
| **Layout & Utility**   | [`<web-ui-layout>`](docs/layout.md)                       |
|                        | [`<web-ui-back-top>`](docs/back-top.md)                   |
|                        | [`<web-ui-svg-draw-lines>`](docs/svg-draw-lines.md)       |
|                        | [`<web-ui-theme>`](docs/theme.md)                         |
| **Notification**       | [`<web-ui-toast>`](docs/toast.md)                         |
| **Sub-items**          | [`<web-ui-option>`](docs/option.md)                       |
|                        | [`<web-ui-segmented-trigger>`](docs/segmented-trigger.md) |
