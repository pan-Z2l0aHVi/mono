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

```html
<web-ui-button variant="primary">Click me</web-ui-button> <web-ui-icon .icon="${lucidePlus}"></web-ui-icon>
```

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
  binding that writes `disabled="false"` produces the string `"false"`, which is truthy — **bind dynamic booleans as
  properties** (camelCase), not attributes, so `false` is written as a real property.
- **Vue**: dynamic binding must go to **Properties** with camelCase names (`:sidebarCollapsed="x"`, `:open="x"`).
  A kebab-case binding like `:sidebar-collapsed="x"` is written as a string attribute and cannot express `false`;
  use the camelCase property. The `.prop` modifier is only valid with the camelCase name
  (`:sidebarCollapsed.prop="x"`). String/number values may stay on kebab-case attributes (`:max-height="120"`).
  `v-model` is supported on value-bearing controls (`web-ui-input`, `web-ui-select`, `web-ui-autocomplete`, …) and
  compiles to the element `value` property + `input` event.
- **React**: React 19 writes DOM properties for custom-element props, so use camelCase props (`open={open}`,
  `noScrollLock`, `value={value}`). Never pass complex data (objects, arrays) through attribute strings — bind
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
and `blur` events use React's conventional `onInput`, `onChange`, `onFocus`, and `onBlur` handlers — their
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

### Vue

Requires `vue >= 3.5` as optional peer dependency.

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
attribute bindings as strings, and boolean attributes follow presence semantics — so `:sidebar-collapsed="false"`
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

### Form-associated controls

All form controls participate in native `FormData`, constraint validation, `form.reset()` and browser form-state restoration. The control captures its reset default once, after declarative attributes have been applied on its first connection. Later runtime property updates do not redefine that default. A disabled ancestor `fieldset` disables validation and interaction without mutating the control's public `disabled` property. For checkbox/radio groups, the group is the single submission, reset and restoration owner; managed child controls do not submit or restore an independent state.

## All Components

| Category             | Component                                                 |
| -------------------- | --------------------------------------------------------- |
| **Form Controls**    | [`<web-ui-input>`](#web-ui-input)                         |
|                      | [`<web-ui-textarea>`](#web-ui-textarea)                   |
|                      | [`<web-ui-input-number>`](#web-ui-input-number)           |
|                      | [`<web-ui-select>`](#web-ui-select)                       |
|                      | [`<web-ui-autocomplete>`](#web-ui-autocomplete)           |
|                      | [`<web-ui-slider>`](#web-ui-slider)                       |
|                      | [`<web-ui-checkbox>`](#web-ui-checkbox)                   |
|                      | [`<web-ui-radio>`](#web-ui-radio)                         |
|                      | [`<web-ui-switch>`](#web-ui-switch)                       |
|                      | [`<web-ui-segmented>`](#web-ui-segmented)                 |
|                      | [`<web-ui-checkbox-group>`](#web-ui-checkbox-group)       |
|                      | [`<web-ui-radio-group>`](#web-ui-radio-group)             |
| **Buttons**          | [`<web-ui-button>`](#web-ui-button)                       |
|                      | [`<web-ui-button-group>`](#web-ui-button-group)           |
| **Overlay / Modal**  | [`<web-ui-dialog>`](#web-ui-dialog)                       |
|                      | [`<web-ui-drawer>`](#web-ui-drawer)                       |
| **Floating**         | [`<web-ui-popover>`](#web-ui-popover)                     |
|                      | [`<web-ui-tooltip>`](#web-ui-tooltip)                     |
|                      | [`<web-ui-context-menu>`](#web-ui-context-menu)           |
| **Menu**             | [`<web-ui-dropdown>`](#web-ui-dropdown)                   |
|                      | [`<web-ui-dropdown-item>`](#web-ui-dropdown-item)         |
|                      | [`<web-ui-dropdown-divider>`](#web-ui-dropdown-divider)   |
|                      | [`<web-ui-dropdown-header>`](#web-ui-dropdown-header)     |
| **Data Display**     | [`<web-ui-avatar>`](#web-ui-avatar)                       |
|                      | [`<web-ui-badge>`](#web-ui-badge)                         |
|                      | [`<web-ui-empty>`](#web-ui-empty)                         |
|                      | [`<web-ui-icon>`](#web-ui-icon)                           |
|                      | [`<web-ui-spinner>`](#web-ui-spinner)                     |
| **Layout & Utility** | [`<web-ui-layout>`](#web-ui-layout)                       |
|                      | [`<web-ui-back-top>`](#web-ui-back-top)                   |
|                      | [`<web-ui-svg-draw-lines>`](#web-ui-svg-draw-lines)       |
|                      | [`<web-ui-theme>`](#web-ui-theme)                         |
| **Notification**     | [`<web-ui-toast>`](#web-ui-toast)                         |
| **Sub-items**        | [`<web-ui-option>`](#web-ui-option)                       |
|                      | [`<web-ui-segmented-trigger>`](#web-ui-segmented-trigger) |

## API Reference

### Form Controls

Form controls implement `static formAssociated = true` and integrate with native `<form>`: values are submitted via `FormData`, and `formResetCallback()` / `formDisabledCallback()` handle lifecycle.

#### `<web-ui-input>`

Text input with clearable, prefix/suffix slots.

| Attribute     | Type      | Default  | Description         |
| ------------- | --------- | -------- | ------------------- |
| `value`       | `string`  | `''`     | Input value         |
| `type`        | `string`  | `'text'` | HTML input type     |
| `placeholder` | `string`  | `''`     | Placeholder text    |
| `name`        | `string`  | `''`     | Form field name     |
| `disabled`    | `boolean` | `false`  | Disabled state      |
| `readonly`    | `boolean` | `false`  | Read-only state     |
| `required`    | `boolean` | `false`  | Required validation |
| `clearable`   | `boolean` | `false`  | Show clear button   |
| `full`        | `boolean` | `false`  | Full width          |
| `borderless`  | `boolean` | `false`  | No border           |
| `aria-label`  | `string`  | —        | Accessible label    |

**Events:** `input`, `change`, `focus`, `blur`

**Slots:** `prefix`, `default`, `suffix`

**CSS Custom Properties:**

| Property                  | Default                          | Description        |
| ------------------------- | -------------------------------- | ------------------ |
| `--wui-input-clear-color` | `var(--wui-color-text-tertiary)` | Clear button color |

#### `<web-ui-textarea>`

Multi-line text input with auto-resize.

| Attribute         | Type      | Default | Description                               |
| ----------------- | --------- | ------- | ----------------------------------------- |
| `value`           | `string`  | `''`    | Textarea value                            |
| `placeholder`     | `string`  | `''`    | Placeholder text                          |
| `rows`            | `number`  | `3`     | Visible rows                              |
| `name`            | `string`  | `''`    | Form field name                           |
| `disabled`        | `boolean` | `false` | Disabled state                            |
| `readonly`        | `boolean` | `false` | Read-only state                           |
| `required`        | `boolean` | `false` | Required validation                       |
| `clearable`       | `boolean` | `false` | Show clear button                         |
| `full`            | `boolean` | `false` | Full width                                |
| `borderless`      | `boolean` | `false` | No border                                 |
| `autosize`        | `boolean` | `false` | Auto-resize height                        |
| `max-height`      | `number`  | `0`     | Autosize max height (px); `0` = unlimited |
| `minlength`       | `number`  | —       | Minimum length validation                 |
| `maxlength`       | `number`  | —       | Maximum length validation                 |
| `aria-label`      | `string`  | —       | Accessible label                          |
| `aria-labelledby` | `string`  | —       | Accessible label reference                |

**Events:** `input`, `change`, `focus`, `blur`

**Methods:** `focus()`, `blur()`, `select()`

**Slots:** `prefix`, `suffix`

**CSS Custom Properties:**

| Property                     | Default                          | Description        |
| ---------------------------- | -------------------------------- | ------------------ |
| `--wui-textarea-width`       | `200px`                          | Textarea width     |
| `--wui-textarea-clear-color` | `var(--wui-color-text-tertiary)` | Clear button color |

#### `<web-ui-input-number>`

Numeric input with step buttons and keyboard control.

| Attribute     | Type      | Default    | Description         |
| ------------- | --------- | ---------- | ------------------- |
| `value`       | `number`  | `0`        | Current value       |
| `min`         | `number`  | `0`        | Minimum value       |
| `max`         | `number`  | `Infinity` | Maximum value       |
| `step`        | `number`  | `1`        | Step increment      |
| `precision`   | `number`  | `0`        | Decimal precision   |
| `placeholder` | `string`  | `''`       | Placeholder text    |
| `name`        | `string`  | `''`       | Form field name     |
| `disabled`    | `boolean` | `false`    | Disabled state      |
| `readonly`    | `boolean` | `false`    | Read-only state     |
| `required`    | `boolean` | `false`    | Required validation |

**Events:** `input`, `change`

ArrowUp/ArrowDown keyboard increments and decrements the value. Empty or `-` input is ignored on commit; the value stays at the last valid number.

#### `<web-ui-select>`

Select dropdown with option items, keyboard navigation, and portal support.

| Attribute          | Type                               | Default | Description                       |
| ------------------ | ---------------------------------- | ------- | --------------------------------- |
| `value`            | `string`                           | `''`    | Selected value                    |
| `placeholder`      | `string`                           | `''`    | Placeholder text                  |
| `name`             | `string`                           | `''`    | Form field name                   |
| `disabled`         | `boolean`                          | `false` | Disabled state                    |
| `required`         | `boolean`                          | `false` | Required validation               |
| `portal`           | `boolean`                          | `false` | Render dropdown in theme overlay  |
| `no-scroll-lock`   | `boolean`                          | `false` | Do not lock body scroll when open |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —       | Explicit portal container         |

**Events:** `input`, `change`, `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `default` (project `<web-ui-option>` elements), `trigger` (custom trigger content — replaces the default label and chevron area)

**Methods:** none

Child `<web-ui-option>` elements register via `option-register` / `option-unregister` events. Supports ArrowDown/ArrowUp/Enter/Escape keyboard navigation.

**CSS Custom Properties:**

| Property                  | Default | Description        |
| ------------------------- | ------- | ------------------ |
| `--wui-select-max-width`  | `500px` | Dropdown max width |
| `--wui-overlay-min-width` | `200px` | Dropdown min width |

#### `<web-ui-autocomplete>`

Editable combobox with input filtering and single option selection.

| Attribute          | Type                               | Default      | Description                                                               |
| ------------------ | ---------------------------------- | ------------ | ------------------------------------------------------------------------- |
| `value`            | `string`                           | `''`         | Current input text (form value)                                           |
| `selected-value`   | `string`                           | `''`         | Value of the option exactly matching the input label (derived, read-only) |
| `placeholder`      | `string`                           | `''`         | Placeholder text                                                          |
| `filter`           | `'none' \| 'prefix' \| 'contains'` | `'contains'` | Candidate filtering mode (matched against option label)                   |
| `name`             | `string`                           | `''`         | Form field name                                                           |
| `disabled`         | `boolean`                          | `false`      | Disabled state                                                            |
| `readonly`         | `boolean`                          | `false`      | Read-only state (no typing, no dropdown)                                  |
| `required`         | `boolean`                          | `false`      | Required validation                                                       |
| `portal`           | `boolean`                          | `false`      | Render dropdown in theme overlay                                          |
| `no-scroll-lock`   | `boolean`                          | `false`      | Do not lock body scroll when open                                         |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —            | Explicit portal container                                                 |
| `aria-label`       | `string`                           | —            | Accessible name                                                           |
| `aria-labelledby`  | `string`                           | —            | Accessible name references                                                |

**Events:** `input`, `change`, `focus`, `blur`, `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `default` (project `<web-ui-option>` elements)

Typing filters the option list by label (`contains` or `prefix`, or `none` to disable filtering). Selecting an option fills the input with its label and exposes the option's value via `selected-value`; `change` fires on selection commit. Supports ArrowDown/ArrowUp/Enter/Escape keyboard navigation.

**CSS Custom Properties:**

| Property                       | Default | Description            |
| ------------------------------ | ------- | ---------------------- |
| `--wui-autocomplete-max-width` | `500px` | Dropdown max width     |
| `--wui-overlay-min-width`      | `200px` | Dropdown minimum width |

#### `<web-ui-slider>`

Range slider with marks and vertical orientation.

| Attribute  | Type      | Default | Description          |
| ---------- | --------- | ------- | -------------------- |
| `value`    | `number`  | `0`     | Current value        |
| `min`      | `number`  | `0`     | Minimum value        |
| `max`      | `number`  | `100`   | Maximum value        |
| `step`     | `number`  | `1`     | Step increment       |
| `name`     | `string`  | `''`    | Form field name      |
| `disabled` | `boolean` | `false` | Disabled state       |
| `required` | `boolean` | `false` | Required validation  |
| `marks`    | `boolean` | `false` | Show tick marks      |
| `vertical` | `boolean` | `false` | Vertical orientation |

**Events:** `input` (during drag), `change` (on release or keyboard)

**Methods:** `focus()`, `blur()`

Supports ArrowLeft/Right/Up/Down, Home/End, PageUp/PageDown keyboard navigation. Uses pointer capture for drag interaction across mouse, touch, and pen.

**CSS Custom Properties:**

| Property                       | Default                             | Description            |
| ------------------------------ | ----------------------------------- | ---------------------- |
| `--wui-slider-width`           | `200px`                             | Slider width           |
| `--wui-slider-vertical-height` | `200px`                             | Vertical slider height |
| `--wui-slider-height`          | `var(--wui-slider-track-size, 6px)` | Track thickness        |
| `--wui-slider-track-size`      | `6px`                               | Track size             |
| `--wui-slider-thumb-width`     | `24px`                              | Thumb short axis       |
| `--wui-slider-thumb-height`    | `32px`                              | Thumb long axis        |
| `--wui-slider-marks-inset`     | `0`                                 | Marks inset from edges |

#### `<web-ui-checkbox>`

Individual checkbox.

| Attribute  | Type      | Default | Description           |
| ---------- | --------- | ------- | --------------------- |
| `checked`  | `boolean` | `false` | Checked state         |
| `value`    | `string`  | `''`    | Form submission value |
| `name`     | `string`  | `''`    | Form field name       |
| `disabled` | `boolean` | `false` | Disabled state        |
| `required` | `boolean` | `false` | Required validation   |

**Events:** `input`, `change`

**Slots:** `default` (label text)

Uses native `<label>` with `role="checkbox"` and `aria-checked`. Enter/Space keyboard toggle.

#### `<web-ui-radio>`

Individual radio button.

| Attribute  | Type      | Default | Description           |
| ---------- | --------- | ------- | --------------------- |
| `checked`  | `boolean` | `false` | Checked state         |
| `value`    | `string`  | `''`    | Form submission value |
| `name`     | `string`  | `''`    | Form field name       |
| `disabled` | `boolean` | `false` | Disabled state        |
| `required` | `boolean` | `false` | Required validation   |

**Events:** `input`, `change`

**Slots:** `default` (label text)

#### `<web-ui-switch>`

Toggle switch.

| Attribute  | Type      | Default | Description             |
| ---------- | --------- | ------- | ----------------------- |
| `checked`  | `boolean` | `false` | Checked (on) state      |
| `value`    | `string`  | `''`    | Form submission value   |
| `name`     | `string`  | `''`    | Form field name         |
| `disabled` | `boolean` | `false` | Disabled state          |
| `required` | `boolean` | `false` | Required validation     |
| `loading`  | `boolean` | `false` | Loading (spinner) state |

**Events:** `input`, `change`

**Slots:** none

Uses `role="switch"` and `aria-checked`. Pointer events for pressed visual state.

#### `<web-ui-segmented>`

Segmented control — single-select button group.

| Attribute  | Type      | Default | Description            |
| ---------- | --------- | ------- | ---------------------- |
| `value`    | `string`  | `''`    | Selected trigger value |
| `name`     | `string`  | `''`    | Form field name        |
| `disabled` | `boolean` | `false` | Disables all triggers  |
| `required` | `boolean` | `false` | Required validation    |

**Events:** `input`, `change`

**Slots:** `default` (project `<web-ui-segmented-trigger>` elements)

Form-associated: integrates with native `<form>` via `ElementInternals`.

Manages child trigger `checked` state based on `value`. `disabled` supplies inherited effective disabled state without changing a trigger's own `disabled` property. Setting `value` directly does not dispatch `input`/`change`.

#### `<web-ui-checkbox-group>`

Checkbox group managing multiple selection.

| Attribute  | Type       | Default | Description                 |
| ---------- | ---------- | ------- | --------------------------- |
| `value`    | `string[]` | `[]`    | Selected values             |
| `name`     | `string`   | `''`    | Form field name             |
| `disabled` | `boolean`  | `false` | Disables all child controls |
| `required` | `boolean`  | `false` | Required validation         |

**Events:** `input`, `change`

**Slots:** `default` (project `<web-ui-checkbox>` elements)

Syncs child checkbox `checked` state. `disabled` supplies inherited effective disabled state without changing a child's own `disabled` property. Listens to child `change` events.

#### `<web-ui-radio-group>`

Radio group managing single selection.

| Attribute  | Type      | Default | Description                              |
| ---------- | --------- | ------- | ---------------------------------------- |
| `value`    | `string`  | `''`    | Selected radio value                     |
| `name`     | `string`  | `''`    | Form field name (propagates to children) |
| `disabled` | `boolean` | `false` | Disables all child controls              |
| `required` | `boolean` | `false` | Required validation                      |

**Events:** `input`, `change`

**Slots:** `default` (project `<web-ui-radio>` elements)

`disabled` supplies inherited effective disabled state without changing a child's own `disabled` property.

---

### Buttons

#### `<web-ui-button>`

Styled button with variants and loading state.

| Attribute    | Type                                                         | Default    | Description                                                             |
| ------------ | ------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------- |
| `variant`    | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'`  | Button variant                                                          |
| `type`       | `'button' \| 'submit' \| 'reset'`                            | `'button'` | Inner-button type; invalid values become `button`                       |
| `disabled`   | `boolean`                                                    | `false`    | Disabled state                                                          |
| `loading`    | `boolean`                                                    | `false`    | Loading spinner                                                         |
| `full`       | `boolean`                                                    | `false`    | Full width                                                              |
| `icon`       | `boolean`                                                    | `false`    | Icon-only mode                                                          |
| `size`       | `string`                                                     | `''`       | Button height in px (icon mode: also sets min-width for square default) |
| `aria-label` | `string`                                                     | —          | Accessible label (delegated to inner button)                            |

**Events:** standard `click`

**Slots:** `prefix`, `default`, `suffix`

`submit` and `reset` do not submit or reset an ancestor form outside the component's Shadow DOM. Use a
form-associated control when external form submission behavior is required.

Disabled and loading states prevent `click` events.

**CSS Custom Properties:**

| Property                 | Default       | Description                             |
| ------------------------ | ------------- | --------------------------------------- |
| `--wui-button-width`     | `max-content` | Button width                            |
| `--wui-button-px`        | `12px`        | Horizontal padding                      |
| `--wui-button-gap`       | `8px`         | Gap between prefix/default/suffix slots |
| `--wui-button-color`     | variant-based | Button text color                       |
| `--wui-button-bg`        | variant-based | Button background color                 |
| `--wui-button-bg-hover`  | variant-based | Button hover background                 |
| `--wui-button-bg-active` | variant-based | Button active background                |

#### `<web-ui-button-group>`

Button group that manages child button layout and direction.

| Attribute   | Type                         | Default        | Description      |
| ----------- | ---------------------------- | -------------- | ---------------- |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |

**Slots:** `default` (project `<web-ui-button>` elements)

Applies the direction to the grouped button layout without changing child button attributes.

---

### Overlay / Modal

#### `<web-ui-dialog>`

Modal dialog using native `<dialog>` with `showModal()`.

| Attribute           | Type      | Default | Description                         |
| ------------------- | --------- | ------- | ----------------------------------- |
| `open`              | `boolean` | `false` | Dialog visibility                   |
| `no-scroll-lock`    | `boolean` | `false` | Do not lock body scroll when open   |
| `no-backdrop-close` | `boolean` | `false` | Do not close on backdrop click      |
| `no-escape-close`   | `boolean` | `false` | Do not close when Escape is pressed |

**Events:** `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `body`, `title`, `default`, `footer`

**Methods:** `showModal()`, `close()`

Uses native `<dialog>` with `@cancel` prevention. Escape calls `close()` unless `no-escape-close` is present. Click on backdrop closes dialog unless `no-backdrop-close` is present.

**CSS Custom Properties:**

| Property                  | Default                     | Description         |
| ------------------------- | --------------------------- | ------------------- |
| `--wui-dialog-max-width`  | `360px`                     | Dialog max width    |
| `--wui-dialog-overlay-bg` | `var(--wui-color-backdrop)` | Backdrop background |

#### `<web-ui-drawer>`

Side drawer using native `<dialog>` with closing animation. In non-headless mode the drawer renders as a floating rounded card inset from all viewport edges (matching the layout sidebar's card language), so elastic drag distances read as margin changes rather than gaps.

| Attribute           | Type                                     | Default   | Description                                                                       |
| ------------------- | ---------------------------------------- | --------- | --------------------------------------------------------------------------------- |
| `open`              | `boolean`                                | `false`   | Drawer visibility                                                                 |
| `placement`         | `'right' \| 'left' \| 'top' \| 'bottom'` | `'right'` | Slide-in direction                                                                |
| `heading`           | `string`                                 | `''`      | Title text (fallback when no header slot)                                         |
| `closable`          | `boolean`                                | `false`   | Show close button                                                                 |
| `no-scroll-lock`    | `boolean`                                | `false`   | Do not lock body scroll when open                                                 |
| `no-backdrop-close` | `boolean`                                | `false`   | Do not close on backdrop click                                                    |
| `request-only`      | `boolean`                                | `false`   | User close actions only request `open=false`; the consumer must update `open`     |
| `headless`          | `boolean`                                | `false`   | Keep only overlay behavior and render the default slot without built-in drawer UI |
| `dialog-label`      | `string`                                 | `''`      | Accessible name for the internal native dialog; required in headless mode         |
| `draggable`         | `boolean`                                | `false`   | Show a drag bar on the inner edge for drag-to-close gestures                      |

**Events:** `open-change` (`CustomEvent<{ open: boolean }>`). With `request-only`, Escape, backdrop and the built-in close button only request `open=false`; the drawer remains open until the consumer writes `open=false`. If native dialog closure occurs while that request is rejected, the drawer restores its open top-layer state and emits the same request.

**Slots:** `header`, `default`, `footer` — with `headless`, only the `default` slot is rendered.

**Methods:** `show()`, `close()`

`headless` keeps the native dialog, backdrop, placement animation, Escape/backdrop close behavior, and scroll locking. It does not render the built-in glass body, header, close button, or footer; style the default-slot content completely in the consumer.

Closing keeps the native dialog in the top layer until the `--wui-duration-drawer-exit` transition completes (240ms by default), then calls `dialog.close()`. Escape always follows this close path; `no-backdrop-close` controls backdrop clicks only.

**Drag to close:** With `draggable`, a gray capsule drag bar appears on the drawer's inner edge (left edge for `right`, right edge for `left`, bottom edge for `top`, top edge for `bottom`) while open. Dragging follows the pointer in real time (backdrop fades proportionally); releasing past ~1/3 of the drawer size or with a fast closing flick springs the drawer shut, otherwise it springs back open. The close direction is placement-aware. With `request-only`, release past the threshold only emits `open-change(false)`; the drawer holds at the closed position briefly and springs back open if the consumer rejects the write-back. Drag-to-open is not supported because the closed drawer renders nothing outside the native dialog. Under `prefers-reduced-motion`, release snaps instantly without spring animation.

**CSS Custom Properties:**

| Property                  | Default                            | Description                                |
| ------------------------- | ---------------------------------- | ------------------------------------------ |
| `--wui-drawer-width`      | `320px`                            | Drawer width                               |
| `--wui-drawer-height`     | `300px`                            | Drawer height (top/bottom)                 |
| `--wui-drawer-bg`         | `var(--wui-color-surface-overlay)` | Drawer body background                     |
| `--wui-drawer-radius`     | `28px`                             | Floating card corner radius (non-headless) |
| `--wui-drawer-overlay-bg` | `rgb(0 0 0 / 0.12)`                | Backdrop background                        |

---

### Floating

#### `<web-ui-popover>`

Popover overlay anchored to trigger element.

| Attribute          | Type                               | Default    | Description               |
| ------------------ | ---------------------------------- | ---------- | ------------------------- |
| `open`             | `boolean`                          | `false`    | Popover visibility        |
| `disabled`         | `boolean`                          | `false`    | Disabled state            |
| `placement`        | `Placement`                        | `'bottom'` | Floating UI placement     |
| `trigger`          | `'click' \| 'hover' \| 'manual'`   | `'click'`  | Open trigger              |
| `offset`           | `number`                           | `8`        | Offset from anchor        |
| `portal`           | `boolean`                          | `false`    | Render in theme overlay   |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —          | Explicit portal container |

**Events:** `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `trigger`, `default`

**Methods:** `show()`, `close()`, `toggle()`

Hover mode uses `pointerenter`/`pointerleave` with delay. Click mode toggles on trigger click. Manual mode only responds to imperative `show()`/`close()`.

#### `<web-ui-tooltip>`

Tooltip overlay using pointer/focus triggers.

| Attribute          | Type                               | Default | Description                        |
| ------------------ | ---------------------------------- | ------- | ---------------------------------- |
| `placement`        | `Placement`                        | `'top'` | Floating UI placement              |
| `content`          | `string`                           | `''`    | Tooltip text (alternative to slot) |
| `open`             | `boolean`                          | `false` | Tooltip visibility                 |
| `disabled`         | `boolean`                          | `false` | Disabled state                     |
| `show-delay`       | `number`                           | `200`   | Show delay in ms                   |
| `hide-delay`       | `number`                           | `100`   | Hide delay in ms                   |
| `offset`           | `number`                           | `6`     | Offset from trigger                |
| `portal`           | `boolean`                          | `false` | Render in theme overlay            |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —       | Explicit portal container          |

**Events:** `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `default` (trigger), `content` (tooltip panel)

`open` is a controlled visibility property. Pointer/focus triggers update it, and direct updates synchronize the local or portal panel. Adjacent tooltips open immediately after the first tooltip is visible; pointer/focus triggers otherwise use delay timers.

**CSS Custom Properties:**

| Property                  | Default | Description       |
| ------------------------- | ------- | ----------------- |
| `--wui-tooltip-max-width` | `240px` | Tooltip max width |
| `--wui-tooltip-font-size` | `13px`  | Tooltip font size |

#### `<web-ui-context-menu>`

Right-click context menu.

| Attribute        | Type      | Default | Description                |
| ---------------- | --------- | ------- | -------------------------- |
| `disabled`       | `boolean` | `false` | Disabled state             |
| `no-scroll-lock` | `boolean` | `false` | Allow background scrolling |

**Events:** `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `default` (menu items content)

**Methods:** `openAt(x: number, y: number)`, `close()`

Opens on `contextmenu` event. Menu items: `<web-ui-dropdown-item>`, `<web-ui-dropdown-divider>`, `<web-ui-dropdown-header>`. Supports keyboard navigation (Arrow keys, Enter, Escape) and submenu hover with `pointerenter`.

---

### Menu

#### `<web-ui-dropdown>`

Dropdown menu with multi-level submenu support.

| Attribute        | Type        | Default          | Description                       |
| ---------------- | ----------- | ---------------- | --------------------------------- |
| `open`           | `boolean`   | `false`          | Menu visibility                   |
| `disabled`       | `boolean`   | `false`          | Disabled state                    |
| `placement`      | `Placement` | `'bottom-start'` | Floating UI placement             |
| `offset`         | `number`    | `4`              | Offset from trigger               |
| `match-width`    | `boolean`   | `false`          | Match trigger width               |
| `no-scroll-lock` | `boolean`   | `false`          | Do not lock body scroll when open |

**Events:** `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `trigger`, `default` (menu items)

**Methods:** `openMenu()`, `closeAll()`

Items: `<web-ui-dropdown-item>`, `<web-ui-dropdown-divider>`, `<web-ui-dropdown-header>`. Submenus via `submenu` attribute on `<web-ui-dropdown-item>`. Full keyboard navigation (Arrow keys, Home, End, Enter, Space, Escape).

#### `<web-ui-dropdown-item>`

Menu item for dropdown or context-menu.

| Attribute  | Type      | Default | Description          |
| ---------- | --------- | ------- | -------------------- |
| `disabled` | `boolean` | `false` | Disabled state       |
| `submenu`  | `boolean` | `false` | Has submenu children |
| `value`    | `string`  | `''`    | Item value           |
| `pl`       | `string`  | `''`    | Padding-left offset  |

**Slots:** `prefix`, `default`, `suffix`

**Methods:** `focusItem()`

Role: `menuitem`. Submenu items should be projected as child elements.

#### `<web-ui-dropdown-divider>`

Menu divider line. Role: `separator`. No attributes.

#### `<web-ui-dropdown-header>`

Menu section header. No attributes. Slots: `default` (text content).

---

### Data Display

#### `<web-ui-avatar>`

Avatar display with image fallback.

| Attribute | Type                   | Default    | Description                      |
| --------- | ---------------------- | ---------- | -------------------------------- |
| `src`     | `string`               | `''`       | Image source URL                 |
| `alt`     | `string`               | `''`       | Alternative text                 |
| `name`    | `string`               | `''`       | Display name (initials fallback) |
| `size`    | `number`               | `40`       | Avatar size in px                |
| `shape`   | `'circle' \| 'square'` | `'circle'` | Shape variant                    |

**Slots:** `default` (fallback content when image fails)

#### `<web-ui-badge>`

Badge / notification count.

| Attribute      | Type                                                           | Default       | Description               |
| -------------- | -------------------------------------------------------------- | ------------- | ------------------------- |
| `count`        | `number`                                                       | `0`           | Display count             |
| `max`          | `number`                                                       | `99`          | Maximum count (shows 99+) |
| `dot`          | `boolean`                                                      | `false`       | Dot mode (no count)       |
| `show-zero`    | `boolean`                                                      | `false`       | Show when count is 0      |
| `badge-hidden` | `boolean`                                                      | `false`       | Hide completely           |
| `offset-x`     | `number`                                                       | `0`           | Horizontal offset         |
| `offset-y`     | `number`                                                       | `0`           | Vertical offset           |
| `placement`    | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` | Badge position            |

#### `<web-ui-empty>`

Empty state placeholder.

| Attribute     | Type                             | Default    | Description      |
| ------------- | -------------------------------- | ---------- | ---------------- |
| `title`       | `string`                         | `''`       | Title text       |
| `description` | `string`                         | `''`       | Description text |
| `size`        | `'small' \| 'medium' \| 'large'` | `'medium'` | Empty state size |

**Slots:** `default` (title, overrides `title` prop), `icon`, `description`, `action`

**CSS Custom Properties:**

| Property                            | Default     | Description                    |
| ----------------------------------- | ----------- | ------------------------------ |
| `--wui-empty-min-height`            | `240px`     | Min height (medium)            |
| `--wui-empty-padding`               | `32px 24px` | Padding (medium)               |
| `--wui-empty-icon-size`             | `56px`      | Icon container size (medium)   |
| `--wui-empty-content-width`         | `480px`     | Max width of title/description |
| `--wui-empty-title-font-size`       | `16px`      | Title font size (medium)       |
| `--wui-empty-description-font-size` | `14px`      | Description font size (medium) |

#### `<web-ui-icon>`

Icon renderer using Iconify data objects.

| Property | Type          | Default | Description                      |
| -------- | ------------- | ------- | -------------------------------- |
| `.icon`  | `IconifyIcon` | —       | Icon data (Lit property binding) |
| `size`   | `number`      | `18`    | Icon size in px                  |
| `color`  | `string`      | —       | Icon color                       |
| `spin`   | `boolean`     | `false` | Rotation animation               |

Has `aria-hidden="true"`.

```js
import { lucideLoaderCircle } from '@greypan/web-ui/icons'
html`<web-ui-icon .icon=${lucideLoaderCircle} spin />`
```

**CSS Custom Properties:**

| Property           | Default   | Description |
| ------------------ | --------- | ----------- |
| `--wui-icon-color` | `inherit` | Icon color  |

#### `<web-ui-spinner>`

Loading spinner.

| Attribute     | Type     | Default | Description        |
| ------------- | -------- | ------- | ------------------ |
| `size`        | `number` | `24`    | Spinner size in px |
| `color`       | `string` | —       | Spinner color      |
| `description` | `string` | `''`    | Description text   |

Role: `status`, `aria-label="加载中"`.

**Slots:** `description`

**Static API:**

```ts
import { WebUiSpinner } from '@greypan/web-ui'

WebUiSpinner.show() // show
WebUiSpinner.show({ size: 32, duration: 2000 }) // show with options
WebUiSpinner.hide() // hide
```

`WebUiSpinner.show(options?: { size?: number; duration?: number; description?: string })`

---

### Layout & Utility

#### `<web-ui-layout>`

Responsive page layout with an optional full-width banner, a collapsible desktop sidebar, and a headless-drawer mobile sidebar. The page itself scrolls; the desktop sidebar and header stick to the viewport after the banner scrolls away.

| Attribute           | Type      | Default   | Description                                                                                        |
| ------------------- | --------- | --------- | -------------------------------------------------------------------------------------------------- |
| `sidebar-collapsed` | `boolean` | `false`   | Controlled desktop sidebar collapsed state                                                         |
| `sidebar-open`      | `boolean` | `false`   | Controlled mobile sidebar drawer open state                                                        |
| `header-glow`       | `boolean` | `false`   | Decorative Header background glow behind slot content                                              |
| `sidebar-width`     | `string`  | `'240px'` | Expanded desktop and mobile sidebar width                                                          |
| `collapsed-width`   | `string`  | `'72px'`  | Collapsed desktop sidebar width                                                                    |
| `sidebar-resizable` | `boolean` | `false`   | Enable drag-to-resize on the desktop sidebar edge                                                  |
| `sidebar-min-width` | `string`  | —         | Resize lower bound (px); falls back to `collapsed-width`                                           |
| `sidebar-max-width` | `string`  | —         | Resize upper bound (px); clamped to half the viewport, which always wins over the configured value |

**Events:** `sidebar-collapsed-change` (`CustomEvent<{ collapsed: boolean }>`) requests a desktop collapse-state update. `sidebar-open-change` (`CustomEvent<{ open: boolean }>`) requests a mobile drawer open-state update. `sidebar-width-change` (`CustomEvent<{ width: string }>`) requests a sidebar width update after a resize drag ends. Consumers must write the requested value back to the corresponding controlled property.

**Sidebar resize:** With `sidebar-resizable`, a resize handle appears on the desktop sidebar's right edge (hidden while collapsed). Hovering or dragging shows a 3px accent vertical line with a `col-resize` cursor. Dragging updates the width in real time (transition suppressed, clamped to `[min, max]` and the viewport); releasing emits `sidebar-width-change` with the final pixel width and returns control to the `sidebar-width` property once the consumer writes it back. `pointercancel` restores the property-controlled width without emitting. The handle is keyboard-operable (WAI-ARIA splitter pattern): focus it and use ←/→ to step by 16px (Shift for 64px), Home/End to jump to min/max, Enter to commit via the same `sidebar-width-change` request, and Escape to revert an uncommitted adjustment. The mobile drawer always supports drag-to-close via its built-in `draggable` drawer.

| Slot      | Description                                                                               |
| --------- | ----------------------------------------------------------------------------------------- |
| `banner`  | Optional full-width banner above the layout body                                          |
| `header`  | Sticky content-area header                                                                |
| `sidebar` | Sidebar-card content. The consumer owns its internal fixed regions and scroll containers. |
| `default` | Main content                                                                              |
| `tabbar`  | Bottom tab bar                                                                            |

`web-ui-layout` constrains the sidebar card and owns the desktop toggle area, but does not create a sidebar scrollport. To make only part of the sidebar scroll, make the `sidebar` slot root a `height: 100%; min-height: 0` flex column and apply `overflow-y: auto` to the intended child. This keeps consumer-defined headers and footers fixed without adding extra public slots.

At `640px` and below, the sidebar becomes a headless `web-ui-drawer`. The consumer content is rendered in the same rounded sidebar card; the mobile toggle appears in the header row.

`header-glow` adds a pointer-transparent decorative glow behind header-slot content and the mobile toggle. It is a Header background rather than a foreground layer, so slotted content remains above it. Override its color with `--wui-layout-header-glow-color` (default: `--wui-color-page`). The glow concentration and spread are controlled by the internal variable `--wui-layout-header-glow-height` (default: `150%`); increase for stronger coverage, decrease for a subtler effect. Layout layers are ordered as Header (`10`) < Auxiliary (`20`) < Banner (`30`) < Tabbar (`40`) < Sidebar (`50`).

**CSS Custom Properties:**

| Property                      | Default | Description                                      |
| ----------------------------- | ------- | ------------------------------------------------ |
| `--wui-layout-sidebar-radius` | `28px`  | Border radius of sidebar card (desktop & mobile) |

#### `<web-ui-back-top>`

Scroll-to-top button.

| Attribute         | Type                    | Default    | Description              |
| ----------------- | ----------------------- | ---------- | ------------------------ |
| `scroll-behavior` | `'smooth' \| 'auto'`    | `'smooth'` | Scroll behavior          |
| `threshold`       | `number`                | `200`      | Scroll threshold to show |
| `visible`         | `boolean`               | `false`    | Current visibility state |
| `scrollTarget`    | `HTMLElement \| Window` | `window`   | Scroll container         |

**Slots:** `default` (custom button content)

**Methods:** `toTop()`

**Positioning:** With `scrollTarget` as `window`, the button is fixed to the viewport corner. With `scrollTarget` as an `HTMLElement`, place the element inside that container and the button floats at the container's bottom corner via `position: sticky`. Offsets follow the `--wui-back-top-top/right/bottom/left` CSS variables.

Role: `button`, keyboard Enter scrolls to top.

**CSS Custom Properties:**

| Property                  | Default                          | Description   |
| ------------------------- | -------------------------------- | ------------- |
| `--wui-back-top-position` | `fixed`                          | CSS position  |
| `--wui-back-top-z-index`  | `var(--wui-layer-auxiliary, 20)` | Z-index       |
| `--wui-back-top-top`      | `auto`                           | Top offset    |
| `--wui-back-top-right`    | `20px`                           | Right offset  |
| `--wui-back-top-bottom`   | `20px`                           | Bottom offset |
| `--wui-back-top-left`     | `auto`                           | Left offset   |

#### `<web-ui-svg-draw-lines>`

SVG line drawing animation using `stroke-dashoffset`. Animates geometry in-place — no cloning, no DOM manipulation.

| Attribute  | Type     | Default    | Description                                       |
| ---------- | -------- | ---------- | ------------------------------------------------- |
| `duration` | `number` | `1000`     | Animation duration in ms, clamped to `[0, 30000]` |
| `easing`   | `string` | `'linear'` | CSS easing function passed to `element.animate()` |

Both attributes are reflected.

**Methods:** `replay(): Promise<void>` — cancels running animation, re-collects geometry elements from current DOM, and starts a new animation. All targets animate in parallel with the same duration/easing. Resolves when all complete. Returns immediately without animation when the nearest theme scope uses `motion="reduced"`, or when its `motion="system"` mode matches `prefers-reduced-motion: reduce`.

**Slots:** `default` — SVG content to animate. Accepts inline `<svg>` elements (light DOM) as well as components that render an SVG in an open shadow root, such as `<web-ui-icon>`. Closed shadow roots are skipped.

Finds `path`, `rect`, `circle`, `line`, `polyline`, `polygon`, `ellipse` elements by recursively traversing the light DOM and all open shadow roots. Paths ending with `Z`/`z` receive a temporary gap fix for proper closing-segment rendering. After animation completes or is cancelled, all in-line styles are restored.

#### `<web-ui-theme>`

Theme provider defining CSS custom property tokens.

| Attribute    | Type                              | Default    | Description                                   |
| ------------ | --------------------------------- | ---------- | --------------------------------------------- |
| `appearance` | `'light' \| 'dark' \| 'system'`   | `'light'`  | Color scheme                                  |
| `motion`     | `'full' \| 'reduced' \| 'system'` | `'system'` | Motion preference for this nested theme scope |

**Methods:** `getOverlayRoot()` — returns the portal overlay container

Defines foundation, color, layer, shadow, and motion tokens for its subtree. `motion="system"` follows `prefers-reduced-motion`; use `motion="reduced"` to reduce animation in a scope or `motion="full"` in a nested theme to restore normal token values. System appearance follows `prefers-color-scheme`.

**Foundation tokens:**

| Property                  | Default | Description                                      |
| ------------------------- | ------- | ------------------------------------------------ |
| `--wui-font-size`         | `14px`  | Base font size for controls                      |
| `--wui-input-width`       | `200px` | Default width for compact form controls          |
| `--wui-control-size`      | `40px`  | Default height and square min-width for controls |
| `--wui-overlay-min-width` | `200px` | Minimum anchored overlay width                   |
| `--wui-focus-ring-width`  | `3px`   | Focus indicator width                            |

**Layer tokens:**

| Property                     | Default | Description                  |
| ---------------------------- | ------- | ---------------------------- |
| `--wui-layer-base`           | `0`     | Base content                 |
| `--wui-layer-inline-overlay` | `1`     | Overlay local to a component |
| `--wui-layer-header`         | `10`    | Page header                  |
| `--wui-layer-auxiliary`      | `20`    | Floating utility controls    |
| `--wui-layer-banner`         | `30`    | Banners                      |
| `--wui-layer-tabbar`         | `40`    | Tab bars                     |
| `--wui-layer-sidebar`        | `50`    | Sidebars                     |
| `--wui-layer-menu`           | `100`   | Menus and floating panels    |
| `--wui-layer-menu-nested`    | `110`   | Nested menus                 |
| `--wui-layer-toast`          | `200`   | Toasts                       |
| `--wui-layer-loading`        | `300`   | Blocking loading surfaces    |

**Motion tokens:** duration defaults are `--wui-duration-press: 80ms`, `--wui-duration-feedback: 100ms`, `--wui-duration-trigger: 160ms`, `--wui-duration-focus: 200ms`, `--wui-duration-menu-enter: 140ms`, `--wui-duration-menu-exit: 100ms`, `--wui-duration-overlay-enter: 180ms`, `--wui-duration-overlay-exit: 140ms`, `--wui-duration-drawer-enter: 280ms`, `--wui-duration-drawer-exit: 240ms`, `--wui-duration-layout: 200ms`. Easing tokens are `--wui-ease-enter` and `--wui-ease-slide`; enter scale is `--wui-scale-enter: 0.97`.

**Color tokens:**

| Property                           | Light default                                                | Dark default                                                 | Description                     |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------- |
| `--wui-color-page`                 | `#fff`                                                       | `#18181a`                                                    | Page background                 |
| `--wui-color-surface`              | `#fff`                                                       | `#2c2c2e`                                                    | Plain surface                   |
| `--wui-color-surface-raised`       | `#f2f2f7`                                                    | `#2c2c2e`                                                    | Raised surface                  |
| `--wui-color-surface-control`      | `#dfdfdf`                                                    | `#3a3a3c`                                                    | Neutral control surface         |
| `--wui-color-surface-track`        | `#e5e5ea`                                                    | `#444446`                                                    | Slider and switch track surface |
| `--wui-color-surface-glass`        | `rgb(250 250 250 / 0.34)`                                    | `rgb(44 44 46 / 0.42)`                                       | Liquid glass surface            |
| `--wui-color-surface-glass-hover`  | `color-mix(... text 6%, surface-glass)`                      | `color-mix(... text 6%, surface-glass)`                      | Full glass hover background     |
| `--wui-color-surface-glass-active` | `color-mix(... text 15%, surface-glass)`                     | `color-mix(... text 15%, surface-glass)`                     | Full glass pressed background   |
| `--wui-color-surface-overlay`      | `rgb(246 246 246 / 0.82)`                                    | `rgb(44 44 46 / 0.82)`                                       | Translucent overlay surface     |
| `--wui-color-text`                 | `#1b1b1b`                                                    | `#f5f5f7`                                                    | Primary text                    |
| `--wui-color-text-secondary`       | `#6a6a6a`                                                    | `#a1a1a6`                                                    | Secondary text                  |
| `--wui-color-text-tertiary`        | `color-mix(in srgb, var(--wui-color-text) 35%, transparent)` | `color-mix(in srgb, var(--wui-color-text) 42%, transparent)` | Tertiary text and quiet icons   |
| `--wui-color-text-disabled`        | `color-mix(in srgb, var(--wui-color-text) 32%, transparent)` | `color-mix(in srgb, var(--wui-color-text) 38%, transparent)` | Disabled foreground text        |
| `--wui-color-state-layer-hover`    | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`  | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`  | Transparent hover overlay       |
| `--wui-color-state-layer-active`   | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)` | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)` | Transparent pressed overlay     |
| `--wui-color-border`               | `rgb(0 0 0 / 0.1)`                                           | `rgb(255 255 255 / 0.14)`                                    | Normal border and divider       |
| `--wui-color-glass-border`         | `rgb(51 51 51 / 0.12)`                                       | `rgb(255 255 255 / 0.16)`                                    | Glass border tint               |
| `--wui-color-glass-highlight`      | `rgb(255 255 255 / 0.9)`                                     | `rgb(255 255 255 / 0.22)`                                    | Glass edge highlight            |
| `--wui-color-accent`               | `#08f`                                                       | `#0a84ff`                                                    | Accent and focused input border |
| `--wui-color-on-accent`            | `#fff`                                                       | `#fff`                                                       | Foreground on accent            |
| `--wui-color-success`              | `#16a34a`                                                    | `#30d158`                                                    | Success                         |
| `--wui-color-warning`              | `#d97706`                                                    | `#ff9f0a`                                                    | Warning                         |
| `--wui-color-danger`               | `#dc2626`                                                    | `#ff453a`                                                    | Danger                          |
| `--wui-color-info`                 | `#2563eb`                                                    | `#64d2ff`                                                    | Info                            |
| `--wui-color-backdrop`             | `rgb(0 0 0 / 0.12)`                                          | `rgb(0 0 0 / 0.48)`                                          | Modal backdrop                  |
| `--wui-color-focus-ring`           | `rgb(0 136 255 / 0.4)`                                       | `rgb(10 132 255 / 0.62)`                                     | Focus indicator color           |

**Shadow tokens:**

| Property               | Light default                    | Dark default                    | Description                 |
| ---------------------- | -------------------------------- | ------------------------------- | --------------------------- |
| `--wui-shadow-overlay` | `2px 16px 40px rgb(0 0 0 / 0.4)` | `0 18px 48px rgb(0 0 0 / 0.54)` | Modal and drawer shadow     |
| `--wui-shadow-panel`   | `0 3px 9px rgb(0 0 0 / 0.27)`    | `0 4px 16px rgb(0 0 0 / 0.35)`  | Small floating panel shadow |
| `--wui-shadow-glass`   | four-layer diffuse shadow        | `0 12px 32px rgb(0 0 0 / 0.38)` | Base liquid glass shadow    |

**Internal tokens:** variables prefixed `--wui-internal-*` are private wiring between shadow DOM parts; they are not part of the public token API and must not be overridden by consumers.

---

### Notification

#### `<web-ui-toast>`

Individual toast notification element. Managed by imperative API.

When using the element directly, `no-close-button` is a standard boolean attribute that hides its close button.

**Imperative API:**

```ts
import { toast } from '@greypan/web-ui'

// Create
toast.success('Operation completed')
toast.error('Something went wrong', { duration: 5000 })
toast.info('Heads up')
toast.warning('Be careful')

// With options
const id = toast({ message: 'Custom', type: 'info', position: 'bottom-right', duration: 4000, closable: true })

// Close
toast.close(id)
toast.clear()

// Update visible content without resetting auto-close timing
toast.updateMessage(id, { message: 'Upload 60% complete', heading: 'Uploading' })
```

**ToastOptions:**

| Option      | Type                                                                                              | Default                   | Description                                 |
| ----------- | ------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------- |
| `message`   | `string`                                                                                          | —                         | Notification text                           |
| `type`      | `'success' \| 'info' \| 'warning' \| 'error'`                                                     | `'info'`                  | Toast type                                  |
| `duration`  | `number`                                                                                          | `3000` (`5000` for error) | Auto-close duration (0 = no auto-close)     |
| `closable`  | `boolean`                                                                                         | `true`                    | Show close button                           |
| `id`        | `string`                                                                                          | auto                      | Deduplication identifier                    |
| `heading`   | `string`                                                                                          | `''`                      | Bold heading text                           |
| `position`  | `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'` | `'top-right'`             | Screen position                             |
| `target`    | `Element`                                                                                         | —                         | Used to find nearest theme scope            |
| `container` | `HTMLElement`                                                                                     | —                         | Explicit mount container (highest priority) |

**`toast.updateMessage(id, options)`** updates the visible toast's `message` and, when supplied, `heading`. It does not restart the auto-close timer. `options` is `ToastMessageUpdateOptions`: `{ message: string; heading?: string }`.

**Events:** `toast-close` (`CustomEvent<{ id: string; reason: 'auto' | 'manual' | 'programmatic' | 'clear' }>`)

Hover pauses auto-close timer (uses `pointerenter`/`pointerleave`). Batch-mounts toasts created in the same microtask.

**CSS Custom Properties:**

| Property                        | Default | Description                                        |
| ------------------------------- | ------- | -------------------------------------------------- |
| `--wui-toast-viewport-gap`      | `16px`  | Visible distance between toasts and viewport edges |
| `--wui-toast-container-padding` | `40px`  | Container padding reserved for diffuse shadows     |

---

### Sub-items

#### `<web-ui-option>`

Selection option for `<web-ui-select>`.

| Attribute  | Type      | Default | Description                                   |
| ---------- | --------- | ------- | --------------------------------------------- |
| `value`    | `string`  | `''`    | Selection value                               |
| `label`    | `string`  | `''`    | Display text; falls back to default slot text |
| `selected` | `boolean` | `false` | Currently selected                            |
| `disabled` | `boolean` | `false` | Disabled state                                |

**Slots:** `default` (fallback label text), `prefix` (content before label), `suffix` (content after label)

Not form-associated (child of select, not independent submit).

**CSS Custom Properties:**

| Property                     | Default | Description                                   |
| ---------------------------- | ------- | --------------------------------------------- |
| `--wui-option-check-display` | `block` | Display mode of the selection check indicator |

#### `<web-ui-segmented-trigger>`

Segment trigger for `<web-ui-segmented>`.

| Attribute  | Type      | Default | Description                        |
| ---------- | --------- | ------- | ---------------------------------- |
| `value`    | `string`  | `''`    | Segment value                      |
| `checked`  | `boolean` | `false` | Currently selected                 |
| `disabled` | `boolean` | `false` | Individually disables this trigger |

**Events:** `change`

Not form-associated (child of segmented, not independent submit).

**CSS Custom Properties:**

| Property                            | Default                          | Description               |
| ----------------------------------- | -------------------------------- | ------------------------- |
| `--wui-segmented-trigger-px`        | `12px`                           | Horizontal padding        |
| `--wui-segmented-trigger-bg-hover`  | `--wui-color-state-layer-hover`  | Trigger hover background  |
| `--wui-segmented-trigger-bg-active` | `--wui-color-state-layer-active` | Trigger active background |
