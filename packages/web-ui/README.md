# @greypan/web-ui

> Web components for React, Vue, and plain HTML.

English | [简体中文](./README.CN.md)

## Demo

- [Vue demo](https://pan-z2l0ahvi.github.io/mono/vue-web-ui-demo/)
- [React demo](https://pan-z2l0ahvi.github.io/mono/react-web-ui-demo/)

## Install

```bash
npm install @greypan/web-ui
```

`lit` is a required peer dependency.

The React and Vue type adapters are optional. They target these framework versions:

- **React 19** with `@types/react >= 19`. React 19 writes custom element props as DOM properties and binds custom events through JSX `on` keys. React 18 and earlier only write attributes, so object and array props and custom events need manual `ref` and `addEventListener` code.
- **Vue 3.5 or newer**. Vue 3.5 keeps the custom element host type on `DefineComponent`, so template refs, `$el`, named handlers, and event payloads resolve to the concrete component without casts. Earlier versions lose the host type and the adapter degrades.

The version requirements come from props and events. Slots do not depend on the framework version: they are native Shadow DOM slots and behave the same in React, Vue, and plain HTML.

Older framework versions can still render the components as plain custom elements. Use attributes and `addEventListener`, and skip the typed adapter.

Each adapter is enabled by a single global type reference in `env.d.ts`. The React and Vue sections below show the exact reference and the utility types you can import.

## Quick start

```js
import '@greypan/web-ui'
// Or import one component:
// import '@greypan/web-ui/components/button'
```

A subpath import registers only the component it names. Import every tag the page uses.

```html
<web-ui-button variant="primary">Click me</web-ui-button> <web-ui-input placeholder="Name"></web-ui-input>
```

## CSS classes

`@greypan/web-ui/classes.css` provides two reusable classes. Components use the same styles internally.

```js
import '@greypan/web-ui/classes.css'
```

### `.wui-glass`

Add `.wui-glass` to any container for a frosted surface.

```html
<div class="wui-glass">...</div>
```

- The class provides the translucent background, the `backdrop-filter` blur, saturation, brightness, an inset highlight and shadow, and a 1px ring drawn with `::before`.
- The container needs a box size and a background that can be sampled. The class adds `position: relative` only when the host has no other position, removes the host border, and follows the host `border-radius`.
- For non-pill surfaces, set `--wui-glass-corner-radius` to match the element radius.

| Token                          | Default                   | Description                                                  |
| ------------------------------ | ------------------------- | ------------------------------------------------------------ |
| `--wui-color-surface-glass`    | `rgb(250 250 250 / 0.34)` | Translucent surface. Dark theme uses `rgb(44 44 46 / 0.42)`. |
| `--wui-glass-blur`             | `4px`                     | Backdrop blur radius. Set `0px` to disable.                  |
| `--wui-glass-saturation`       | `160%`                    | Backdrop saturation.                                         |
| `--wui-glass-brightness`       | `1.06`                    | Backdrop brightness. Dark theme uses `1.02`.                 |
| `--wui-color-glass-highlight`  | `rgb(255 255 255 / 0.9)`  | Inset highlight. Dark theme uses `rgb(255 255 255 / 0.1)`.   |
| `--wui-glass-corner-radius`    | `32px`                    | Radius of the ring lighting.                                 |
| `--wui-color-glass-ring`       | `rgb(0 0 0 / 0.05)`       | Ring base. Dark theme uses `rgb(255 255 255 / 0.05)`.        |
| `--wui-color-glass-ring-sheen` | `rgb(255 255 255 / 0.5)`  | Lit-corner sheen. Dark theme uses `rgb(255 255 255 / 0.2)`.  |
| `--wui-color-glass-ring-shade` | `rgb(0 0 0 / 0.03)`       | Unlit-corner shade. Dark theme uses `rgb(0 0 0 / 0.5)`.      |
| `--wui-shadow-glass`           | Four-layer diffuse shadow | Element shadow. The class default applies when unset.        |

### `.wui-glow`

Add `.wui-glow` to any container for a decorative background glow.

```html
<div class="wui-glow">...</div>
```

- The gradient and blur are background layers. Content stays above them.
- The container needs a box size. The class adds `position: relative` when the host has no other position and adds `isolation: isolate`.
- By default it draws a `--wui-color-page` gradient from the top and overlays `blur(4px)`. The blurred layer extends 24px below the container and fades out. An ancestor with `overflow: hidden` clips that tail.
- On an opaque host the blur cannot sample what is behind the host. Keep the host surface translucent for a frosted look.

| Token                           | Default                         | Description                                                                     |
| ------------------------------- | ------------------------------- | ------------------------------------------------------------------------------- |
| `--wui-glow-color`              | `var(--wui-color-page, #fff)`   | Gradient start colour.                                                          |
| `--wui-glow-gradient-direction` | `to bottom`                     | `linear-gradient` direction.                                                    |
| `--wui-glow-gradient`           | Built from colour and direction | Full background image. Set `none` to disable.                                   |
| `--wui-glow-blur`               | `4px`                           | Backdrop blur radius. Set `0px` to disable.                                     |
| `--wui-glow-overhang`           | `24px`                          | How far the blurred layer extends below the box.                                |
| `--wui-glow-fade`               | `36px`                          | Full-strength-to-transparent length. Keep it at least as large as the overhang. |

## Vite

`@greypan/web-ui/vite` exports `webUiOptimizeDeps`, a list of runtime dependencies to merge into `optimizeDeps.include`.

```js
import { webUiOptimizeDeps } from '@greypan/web-ui/vite'

export default {
  optimizeDeps: {
    include: [...webUiOptimizeDeps]
  }
}
```

Add the list when Vite's dependency scanner cannot follow the component graph, for example when routes or pages load through a virtual module such as file-based routing or `import.meta.glob`. An app whose entry statically imports every component module does not need it.

- Entries use Vite's `<pkg> > <dep>` form, so they resolve through web-ui's dependency tree.
- Reference the export instead of copying entries.
- It affects dev pre-bundling only. Builds are unaffected.
- After changing a config that carries the list, remove `node_modules/.vite` once and restart.

## Framework setup

### How props, attributes, events, and slots map

Every `web-ui-*` element exposes the same four surfaces.

| Surface   | Naming                   | Use for                                                                         |
| --------- | ------------------------ | ------------------------------------------------------------------------------- |
| Property  | camelCase                | Objects, arrays, booleans, numbers, and values you read or write at runtime.    |
| Attribute | kebab-case               | Declarative string values in plain HTML.                                        |
| Event     | kebab-case               | User actions such as `open-change`, plus native `click`, `input`, and `change`. |
| Slot      | `slot="name"` on a child | Projecting your own nodes into default or named regions.                        |

Native events are composed and reach framework handlers. Custom events are dispatched on the host element. Assigning a property does not emit a custom event.

Slots are native Shadow DOM slots. Your nodes stay in the light DOM and the component projects them:

- Plain children go to the default slot.
- For a named slot, put `slot="name"` on the child element.
- Framework slot syntax such as Vue `v-slot` or React render props does not apply to custom elements.

```html
<web-ui-layout>
  <div slot="header">Header</div>
  <nav slot="sidebar">Sidebar</nav>
  <main>Main content</main>
</web-ui-layout>
```

### React

#### Setup

**1. Install the runtime and tooling**

Install React 19, `@types/react >= 19`, and `@greypan/unplugin-web-components`.

**2. Enable automatic component imports**

In `vite.config.ts`:

```ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import react from '@vitejs/plugin-react'

export default {
  plugins: [unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true }), react()]
}
```

Keep `unpluginWebComponents` before `react()` so tag detection sees the original source. If you do not use the plugin, import the components you use by hand.

**3. Add the global types**

Add the reference once in `env.d.ts`:

```ts
/// <reference types="@greypan/web-ui/types/react" />
```

Make sure `env.d.ts` is included by your TypeScript config: the `include` list in `tsconfig.app.json`, or the equivalent entry in `tsconfig.json`. The reference augments JSX intrinsics globally, so every file gets `web-ui-*` tags, props, events, and refs without per-file imports.

#### Props and events

Use camelCase property names for booleans and non-string values. React 19 writes them as DOM properties. Plain strings can stay as attributes.

```tsx
import '@greypan/web-ui'

import { useState } from 'react'

function App() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button variant="primary" onClick={() => alert('clicked')}>
        Click
      </web-ui-button>
      <web-ui-input onInput={event => console.log(event.currentTarget.value)} />
      <web-ui-dialog open={open} noScrollLock onopen-change={event => setOpen(event.detail.open)} />
    </>
  )
}
```

- Custom events use the exact `on<event>` spelling, including the hyphen: `onopen-change`, not `onOpenChange`.
- Native events use React names: `onInput`, `onChange`, `onFocus`, `onBlur`.
- `currentTarget` is typed as the component instance for both native and custom events.
- Avoid writing `disabled="false"` or `open="false"`. A present attribute means `true`. Pass the boolean value instead.

#### Slots

Use ordinary children for the default slot and the `slot` attribute for named slots.

```tsx
<web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
  <button type="button">Show details</button>
  <div slot="content">Details</div>
</web-ui-collapse>
```

#### TypeScript utility types

The global reference already types tags, props, events, and refs. Use the exported utility types when you need to name those types in your own code.

```tsx
import type { WebUiDialog, WebUiEvent, WebUiEventName } from '@greypan/web-ui'
import { useRef } from 'react'

function onDialogOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  const open: boolean = event.detail.open
  const host: WebUiDialog = event.currentTarget
}

const dialogRef = useRef<WebUiDialog>(null)
const eventName: WebUiEventName<WebUiDialog> = 'open-change'
```

- `WebUiEvent<Component, EventName>` types a named handler. The event name must be declared by that component.
- `WebUiEventName<Component>` is the union of that component's custom event names. Use it for variables, maps, and generic helpers.
- Component classes such as `WebUiDialog` are both the runtime element class and the instance type for `useRef`.
- In React, `event.currentTarget` is the component instance. `event.target` follows `SyntheticEvent` semantics and stays `EventTarget`.
- For your own React wrapper component, `LitReactWrapper<Component>` gives the props type. Import it from `@greypan/web-ui/types/react`.

```ts
import type { WebUiDialog } from '@greypan/web-ui'
import type { LitReactWrapper } from '@greypan/web-ui/types/react'

type DialogProps = LitReactWrapper<WebUiDialog>
```

#### Portal content

When a component moves a child into its portal shadow root, React's synthetic `onClick` cannot receive that child's event. Bind a native listener through a `ref`.

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

In `portal` mode, panel content is moved into the overlay shadow root:

- A bare conditional child such as `{condition && <el/>}` cannot be removed while the panel is open if its node has already moved.
- Render conditional content inside a stable wrapper. React records the wrapper as the insertion parent, so additions and removals keep working.
- Keeping content mounted and toggling visibility is also valid.

```tsx
<web-ui-popover portal open={open} trigger="none">
  <div className="panel-body">{editing && <TagEditor />}</div>
</web-ui-popover>
```

### Vue

#### Setup

**1. Install the runtime and tooling**

Install Vue 3.5 or newer, `@greypan/unplugin-web-components`, and `@vitejs/plugin-vue`.

**2. Enable custom elements and automatic imports**

In `vite.config.ts`:

```ts
import unpluginWebComponents from '@greypan/unplugin-web-components/vite'
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [
    vue({
      template: { compilerOptions: { isCustomElement: tag => tag.startsWith('web-ui-') } }
    }),
    unpluginWebComponents({ tagPrefix: 'web-ui', packageName: '@greypan/web-ui', sideEffects: true })
  ]
}
```

The `isCustomElement` option stops Vue from treating `web-ui-*` tags as unknown Vue components. The unplugin entry imports each component when its tag appears. If you do not use the plugin, import the components you use by hand.

**3. Add the global types**

Add the reference once in `env.d.ts`:

```ts
/// <reference types="@greypan/web-ui/types/vue" />
```

Make sure `env.d.ts` is included by your TypeScript config: the `include` list in `tsconfig.app.json`, or the equivalent entry in `tsconfig.json`. The reference registers every `web-ui-*` tag in `GlobalComponents`, so templates and template refs are typed without per-file imports.

#### Props and events

Bind properties with camelCase names. Vue writes unknown kebab-case bindings as attributes, and the string `"false"` is truthy.

```vue
<template>
  <web-ui-button variant="primary" @click="handleClick">Click</web-ui-button>
  <web-ui-input :value="value" @input="value = $event.target.value" />
  <web-ui-select :value="framework" @change="framework = $event.target.value" />
</template>
```

Use `:sidebarCollapsed="false"` or the `.prop` modifier, not `:sidebar-collapsed="false"`.

```vue
<web-ui-layout
  header-glow
  sidebar-collapsible
  :sidebarCollapsed="sidebarCollapsed"
  :sidebarOpen="sidebarOpen"
  @sidebar-collapsed-change="sidebarCollapsed = $event.detail.collapsed"
  @sidebar-open-change="sidebarOpen = $event.detail.open"
/>
```

Vue event types need no casts. `@input` and `@change` on value-bearing components resolve to the component emit, so `$event.target` is the component instance. Kebab-case events such as `open-change` keep the `CustomEvent` payload type in `$event.detail`. Native events such as `@click` and `@focus` still bind to any `web-ui-*` element. See TypeScript utility types below for named handlers.

#### Slots

Use the `slot` attribute on child elements. Vue slot syntax such as `v-slot` targets Vue components, not custom elements.

```vue
<web-ui-layout>
  <div slot="header">Header</div>
  <nav slot="sidebar">Sidebar</nav>
  <main>Main content</main>
</web-ui-layout>
```

#### TypeScript utility types

The global reference already registers tags in `GlobalComponents`, so inline `$event` and template refs are typed without casts. Use the exported utility types for named handlers and reusable helpers.

```vue
<script setup lang="ts">
import type { WebUiDialog, WebUiEvent, WebUiEventName } from '@greypan/web-ui'
import { ref } from 'vue'

function onDialogOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  const open: boolean = event.detail.open
  const host: WebUiDialog = event.currentTarget
}

const dialogRef = ref<WebUiDialog>()
const eventName: WebUiEventName<WebUiDialog> = 'open-change'
</script>
```

- `WebUiEvent<Component, EventName>` types a named handler. Use the component's declared event name.
- `WebUiEventName<Component>` is the union of that component's custom event names. Use it for variables, maps, and generic helpers.
- `ref<WebUiDialog>()` types a template ref to the custom element instance.
- Inline handlers such as `@input="value = $event.target.value"` already resolve without casts.
- For your own Vue wrapper component, `LitVueWrapper<Component>` gives the props type. Import it from `@greypan/web-ui/types/vue`.

```ts
import type { WebUiDialog } from '@greypan/web-ui'
import type { LitVueWrapper } from '@greypan/web-ui/types/vue'

type DialogProps = LitVueWrapper<WebUiDialog>
```

#### Portal content

Panel content added or removed while a panel is open migrates into the panel automatically. On close it returns to its original anchor. Reordering or splicing a keyed `v-for` list while a panel is open is not supported. Apply those updates while the panel is closed, or only append and remove at the end of the list.

### Lit

Portal panels support live rendering for Lit child parts. Conditional content inside `web-ui-popover`, `web-ui-tooltip`, `web-ui-select`, and `web-ui-autocomplete` moves into the open panel. Removals and element swaps work while the panel is open, and close restores the original anchor.

Reordering a `repeat()` list while a panel is open is not supported. Apply the reorder while the panel is closed.

`web-ui-dropdown` manages items through the shared menu portal. Additions while the panel is open work. Removals and element swaps of items that already live in the panel are not supported. `web-ui-context-menu` does not observe host-side insertions and is outside these guarantees.

### Attribute and event boundaries

`web-ui-*` elements are the public DOM boundary. `id`, `class`, `style`, global HTML attributes, and `data-*` stay on the custom element host and are not copied into the shadow root. Components expose native attributes only when their docs define a mapping. For example, `web-ui-button` maps `type` to its inner button and accepts `button`, `submit`, or `reset`.

ARIA attributes are explicit. Use the component's documented attributes, not a blanket `aria-*` pass-through. Components own their role and interaction state. Native composed events such as `click`, `input`, and `change` are the primary interaction API. Kebab-case custom events such as `open-change` describe user actions. Assigning a property programmatically does not emit them.

### Cursor behavior

Interactive controls use the arrow cursor. Disabled controls use `not-allowed`. Slider, switch, and segmented controls switch to `grabbing` only while dragging. Cursor styles live inside shadow roots, so a document-level selector cannot override them.

### State models

Components use three state models. Do not assume `controlled` means the same thing on every component.

**Gesture overlays (tooltip, popover, dropdown, select, autocomplete).**
Gestures and `show()` / `hide()` / `toggle()` all change the state and dispatch `open-change`; assigning `el.open`
directly is silent. Components self-manage their `open` value unless you coordinate externally. You may observe the
event and write it back to `open`, but the component does not require or wait for that write-back.

**User-originated events only (collapse, dialog, drawer, back-top).**
`*-change` events fire only for user-originated toggles; assigning the property programmatically (`el.open = true`) or
calling an imperative method (`show()`, `close()`, `toggle()`) never emits.

For a switch or checkbox that must stay on only after a server call, use optimistic updates. Flip immediately, observe `change`, set `loading` during the request, and write the property back on failure.

### Form controls

Form controls participate in native `FormData`, constraint validation, `form.reset()`, and browser form-state restoration. The reset default is captured once, after declarative attributes are applied on first connection. Later property updates do not change it. A disabled ancestor `fieldset` disables interaction and validation without changing the control's public `disabled` property. For checkbox and radio groups, the group owns submission, reset, and restoration.

`web-ui-button` is form-associated so its host can own an outer form and forward `submit` and `reset` activation. It contributes no value to `FormData`.

## Components

Each component has a doc page with the API reference, behavior notes, and interactive examples. The table below is the index.

| Category           | Component                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form controls      | [`<web-ui-input>`](./docs/input.md), [`<web-ui-textarea>`](./docs/textarea.md), [`<web-ui-editable-text>`](./docs/editable-text.md), [`<web-ui-input-number>`](./docs/input-number.md), [`<web-ui-select>`](./docs/select.md), [`<web-ui-autocomplete>`](./docs/autocomplete.md), [`<web-ui-slider>`](./docs/slider.md), [`<web-ui-checkbox>`](./docs/checkbox.md), [`<web-ui-radio>`](./docs/radio.md), [`<web-ui-switch>`](./docs/switch.md), [`<web-ui-segmented>`](./docs/segmented.md), [`<web-ui-checkbox-group>`](./docs/checkbox-group.md), [`<web-ui-radio-group>`](./docs/radio-group.md) |
| Buttons            | [`<web-ui-button>`](./docs/button.md), [`<web-ui-button-group>`](./docs/button-group.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Overlay and modal  | [`<web-ui-dialog>`](./docs/dialog.md), [`<web-ui-drawer>`](./docs/drawer.md), [`imagePreview()`](./docs/image-preview.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| In-flow disclosure | [`<web-ui-collapse>`](./docs/collapse.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Floating           | [`<web-ui-popover>`](./docs/popover.md), [`<web-ui-tooltip>`](./docs/tooltip.md), [`<web-ui-context-menu>`](./docs/context-menu.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Menu               | [`<web-ui-dropdown>`](./docs/dropdown.md), [`<web-ui-dropdown-item>`](./docs/dropdown-item.md), [`<web-ui-dropdown-divider>`](./docs/dropdown-divider.md), [`<web-ui-dropdown-header>`](./docs/dropdown-header.md)                                                                                                                                                                                                                                                                                                                                                                                  |
| Data display       | [`<web-ui-avatar>`](./docs/avatar.md), [`<web-ui-badge>`](./docs/badge.md), [`<web-ui-empty>`](./docs/empty.md), [`<web-ui-grouped-text>`](./docs/grouped-text.md), [`<web-ui-middle-ellipsis>`](./docs/middle-ellipsis.md), [`<web-ui-icon>`](./docs/icon.md), [`<web-ui-progress>`](./docs/progress.md), [`<web-ui-spinner>`](./docs/spinner.md)                                                                                                                                                                                                                                                  |
| Layout and utility | [`<web-ui-layout>`](./docs/layout.md), [`<web-ui-back-top>`](./docs/back-top.md), [`<web-ui-svg-draw-lines>`](./docs/svg-draw-lines.md), [`<web-ui-theme>`](./docs/theme.md)                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Notification       | [`<web-ui-toast>`](./docs/toast.md), [`shake()`](./docs/shake.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Sub-items          | [`<web-ui-option>`](./docs/option.md), [`<web-ui-segmented-trigger>`](./docs/segmented-trigger.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
