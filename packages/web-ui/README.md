# @greypan/web-ui

> Lit-based web components for React, Vue, and vanilla JS

English | [简体中文](./README.CN.md)

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

### React

Requires `@types/react >= 16` as optional peer dependency.

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
      <web-ui-input onInput={e => console.log((e.target as any).value)} />
    </>
  )
}
```

### Vue

Requires `vue >= 3` as optional peer dependency.

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
</template>
```

## All Components

| Category             | Component                                                 |
| -------------------- | --------------------------------------------------------- |
| **Form Controls**    | [`<web-ui-input>`](#web-ui-input)                         |
|                      | [`<web-ui-textarea>`](#web-ui-textarea)                   |
|                      | [`<web-ui-input-number>`](#web-ui-input-number)           |
|                      | [`<web-ui-select>`](#web-ui-select)                       |
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
| **Menu**             | [`<web-ui-dropdown-menu>`](#web-ui-dropdown-menu)         |
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
| `required`    | `boolean` | `false`  | Required validation |
| `clearable`   | `boolean` | `false`  | Show clear button   |
| `full`        | `boolean` | `false`  | Full width          |
| `borderless`  | `boolean` | `false`  | No border           |

**Events:** `input`, `change`, `focus`, `blur`

**Slots:** `prefix`, `default`, `suffix`

#### `<web-ui-textarea>`

Multi-line text input with auto-resize.

| Attribute         | Type      | Default | Description                |
| ----------------- | --------- | ------- | -------------------------- |
| `value`           | `string`  | `''`    | Textarea value             |
| `placeholder`     | `string`  | `''`    | Placeholder text           |
| `rows`            | `number`  | `3`     | Visible rows               |
| `name`            | `string`  | `''`    | Form field name            |
| `disabled`        | `boolean` | `false` | Disabled state             |
| `readonly`        | `boolean` | `false` | Read-only state            |
| `required`        | `boolean` | `false` | Required validation        |
| `clearable`       | `boolean` | `false` | Show clear button          |
| `full`            | `boolean` | `false` | Full width                 |
| `borderless`      | `boolean` | `false` | No border                  |
| `autosize`        | `boolean` | `false` | Auto-resize height         |
| `minlength`       | `number`  | —       | Minimum length validation  |
| `maxlength`       | `number`  | —       | Maximum length validation  |
| `aria-label`      | `string`  | —       | Accessible label           |
| `aria-labelledby` | `string`  | —       | Accessible label reference |

**Events:** `input`, `change`, `focus`, `blur`

**Methods:** `focus()`, `blur()`, `select()`

**Slots:** `prefix`, `suffix`

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
| `required`    | `boolean` | `false`    | Required validation |

**Events:** `input`, `change`

ArrowUp/ArrowDown keyboard increments and decrements the value.

#### `<web-ui-select>`

Select dropdown with option items, keyboard navigation, and portal support.

| Attribute          | Type                               | Default | Description                      |
| ------------------ | ---------------------------------- | ------- | -------------------------------- |
| `value`            | `string`                           | `''`    | Selected value                   |
| `placeholder`      | `string`                           | `''`    | Placeholder text                 |
| `name`             | `string`                           | `''`    | Form field name                  |
| `disabled`         | `boolean`                          | `false` | Disabled state                   |
| `required`         | `boolean`                          | `false` | Required validation              |
| `portal`           | `boolean`                          | `false` | Render dropdown in theme overlay |
| `lock-scroll`      | `boolean`                          | `true`  | Lock body scroll when open       |
| `overlayContainer` | `HTMLElement \| () => HTMLElement` | —       | Explicit portal container        |

**Events:** `input`, `change`, `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `default` (project `<web-ui-option>` elements), `trigger` (custom trigger content — replaces the default label and chevron area)

**Methods:** none

Child `<web-ui-option>` elements register via `option-register` / `option-unregister` events. Supports ArrowDown/ArrowUp/Enter/Escape keyboard navigation.

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
| `disabled` | `boolean` | `false` | Disabled state         |
| `required` | `boolean` | `false` | Required validation    |

**Events:** `input`, `change`

**Slots:** `default` (project `<web-ui-segmented-trigger>` elements)

Form-associated: integrates with native `<form>` via `ElementInternals`.

Manages child trigger `checked` state based on `value`. Setting `value` directly does not dispatch `input`/`change`.

#### `<web-ui-checkbox-group>`

Checkbox group managing multiple selection.

| Attribute  | Type       | Default | Description                             |
| ---------- | ---------- | ------- | --------------------------------------- |
| `value`    | `string[]` | `[]`    | Selected values                         |
| `name`     | `string`   | `''`    | Form field name                         |
| `disabled` | `boolean`  | `false` | Disabled state (propagates to children) |
| `required` | `boolean`  | `false` | Required validation                     |

**Events:** `input`, `change`

**Slots:** `default` (project `<web-ui-checkbox>` elements)

Syncs with child checkbox `checked`/`disabled` via public property access. Listens to child `change` events.

#### `<web-ui-radio-group>`

Radio group managing single selection.

| Attribute  | Type      | Default | Description                              |
| ---------- | --------- | ------- | ---------------------------------------- |
| `value`    | `string`  | `''`    | Selected radio value                     |
| `name`     | `string`  | `''`    | Form field name (propagates to children) |
| `disabled` | `boolean` | `false` | Disabled state (propagates to children)  |
| `required` | `boolean` | `false` | Required validation                      |

**Events:** `input`, `change`

**Slots:** `default` (project `<web-ui-radio>` elements)

---

### Buttons

#### `<web-ui-button>`

Styled button with variants and loading state.

| Attribute  | Type                                                         | Default   | Description                            |
| ---------- | ------------------------------------------------------------ | --------- | -------------------------------------- |
| `variant`  | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'glass'` | `'glass'` | Button variant                         |
| `disabled` | `boolean`                                                    | `false`   | Disabled state                         |
| `loading`  | `boolean`                                                    | `false`   | Loading spinner                        |
| `full`     | `boolean`                                                    | `false`   | Full width                             |
| `icon`     | `boolean`                                                    | `false`   | Icon-only mode                         |
| `size`     | `string`                                                     | `''`      | Size format `height` or `heightxwidth` |

**Events:** standard `click`

**Slots:** `prefix`, `default`, `suffix`

Disabled and loading states prevent `click` events.

#### `<web-ui-button-group>`

Button group that manages child button layout and direction.

| Attribute   | Type                         | Default        | Description      |
| ----------- | ---------------------------- | -------------- | ---------------- |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |

**Slots:** `default` (project `<web-ui-button>` elements)

Propagates `direction` attribute to child buttons.

---

### Overlay / Modal

#### `<web-ui-dialog>`

Modal dialog using native `<dialog>` with `showModal()`.

| Attribute          | Type      | Default | Description                |
| ------------------ | --------- | ------- | -------------------------- |
| `open`             | `boolean` | `false` | Dialog visibility          |
| `lock-scroll`      | `boolean` | `true`  | Lock body scroll when open |
| `overlay-closable` | `boolean` | `true`  | Close on backdrop click    |

**Events:** `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `body`, `title`, `default`, `footer`

**Methods:** `showModal()`, `close()`

Uses native `<dialog>` with `@cancel` prevention (Escape calls `close()`). Click on backdrop closes dialog.

#### `<web-ui-drawer>`

Side drawer using native `<dialog>` with closing animation.

| Attribute          | Type                                     | Default   | Description                               |
| ------------------ | ---------------------------------------- | --------- | ----------------------------------------- |
| `open`             | `boolean`                                | `false`   | Drawer visibility                         |
| `placement`        | `'right' \| 'left' \| 'top' \| 'bottom'` | `'right'` | Slide-in direction                        |
| `heading`          | `string`                                 | `''`      | Title text (fallback when no header slot) |
| `closable`         | `boolean`                                | `false`   | Show close button                         |
| `lock-scroll`      | `boolean`                                | `true`    | Lock body scroll when open                |
| `overlay-closable` | `boolean`                                | `true`    | Close on backdrop click                   |

**Events:** `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `header`, `default`, `footer`

**Methods:** `show()`, `close()`

Closing keeps the native dialog in the top layer until the `--wui-duration-drawer` transition completes (280ms by default), then calls `dialog.close()`. Escape always follows this close path; `overlay-closable` controls backdrop clicks only.

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

#### `<web-ui-context-menu>`

Right-click context menu.

| Attribute     | Type      | Default | Description               |
| ------------- | --------- | ------- | ------------------------- |
| `disabled`    | `boolean` | `false` | Disabled state            |
| `lock-scroll` | `boolean` | `true`  | Prevent background scroll |

**Events:** `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `default` (menu items content)

**Methods:** `openAt(x: number, y: number)`, `close()`

Opens on `contextmenu` event. Menu items: `<web-ui-dropdown-item>`, `<web-ui-dropdown-divider>`, `<web-ui-dropdown-header>`. Supports keyboard navigation (Arrow keys, Enter, Escape) and submenu hover with `pointerenter`.

---

### Menu

#### `<web-ui-dropdown-menu>`

Dropdown menu with multi-level submenu support.

| Attribute     | Type        | Default          | Description                |
| ------------- | ----------- | ---------------- | -------------------------- |
| `open`        | `boolean`   | `false`          | Menu visibility            |
| `disabled`    | `boolean`   | `false`          | Disabled state             |
| `placement`   | `Placement` | `'bottom-start'` | Floating UI placement      |
| `offset`      | `number`    | `4`              | Offset from trigger        |
| `match-width` | `boolean`   | `false`          | Match trigger width        |
| `lock-scroll` | `boolean`   | `true`           | Lock body scroll when open |

**Events:** `open-change` (`CustomEvent<{ open: boolean }>`)

**Slots:** `trigger`, `default` (menu items)

**Methods:** `openMenu()`, `closeAll()`

Items: `<web-ui-dropdown-item>`, `<web-ui-dropdown-divider>`, `<web-ui-dropdown-header>`. Submenus via `submenu` attribute on `<web-ui-dropdown-item>`. Full keyboard navigation (Arrow keys, Home, End, Enter, Space, Escape).

#### `<web-ui-dropdown-item>`

Menu item for dropdown-menu or context-menu.

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

| Attribute   | Type                                                           | Default       | Description               |
| ----------- | -------------------------------------------------------------- | ------------- | ------------------------- |
| `count`     | `number`                                                       | `0`           | Display count             |
| `max`       | `number`                                                       | `99`          | Maximum count (shows 99+) |
| `dot`       | `boolean`                                                      | `false`       | Dot mode (no count)       |
| `show-zero` | `boolean`                                                      | `false`       | Show when count is 0      |
| `hidden`    | `boolean`                                                      | `false`       | Hide completely           |
| `offset-x`  | `number`                                                       | `0`           | Horizontal offset         |
| `offset-y`  | `number`                                                       | `0`           | Vertical offset           |
| `placement` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` | Badge position            |

#### `<web-ui-empty>`

Empty state placeholder.

| Attribute     | Type                             | Default    | Description      |
| ------------- | -------------------------------- | ---------- | ---------------- |
| `title`       | `string`                         | `''`       | Title text       |
| `description` | `string`                         | `''`       | Description text |
| `size`        | `'small' \| 'medium' \| 'large'` | `'medium'` | Empty state size |

**Slots:** `default` (title, overrides `title` prop), `icon`, `description`, `action`

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

Page layout grid.

| Slot      | Description     |
| --------- | --------------- |
| `header`  | Sticky top bar  |
| `default` | Main content    |
| `sidebar` | Side navigation |
| `tabbar`  | Bottom tab bar  |

#### `<web-ui-back-top>`

Scroll-to-top button.

| Attribute      | Type                    | Default  | Description              |
| -------------- | ----------------------- | -------- | ------------------------ |
| `smooth`       | `boolean`               | `true`   | Smooth scroll            |
| `threshold`    | `number`                | `200`    | Scroll threshold to show |
| `visible`      | `boolean`               | `false`  | Current visibility state |
| `scrollTarget` | `HTMLElement \| Window` | `window` | Scroll container         |

**Slots:** `default` (custom button content)

**Methods:** `toTop()`

Role: `button`, keyboard Enter scrolls to top.

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

Defines `--wui-color-*`, `--wui-shadow-*`, `--wui-layer-*`, and motion tokens. Motion tokens are stable and may be overridden per theme scope: `--wui-duration-press`, `--wui-duration-fast`, `--wui-duration-overlay-enter`, `--wui-duration-overlay-exit`, `--wui-duration-drawer`, `--wui-ease-out`, `--wui-ease-standard`, `--wui-scale-press`, and `--wui-scale-enter`. `motion="system"` follows `prefers-reduced-motion`; use `motion="reduced"` to reduce animation in a scope or `motion="full"` in a nested theme to restore the normal token values. System appearance follows `prefers-color-scheme`.

---

### Notification

#### `<web-ui-toast>`

Individual toast notification element. Managed by imperative API.

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

#### `<web-ui-segmented-trigger>`

Segment trigger for `<web-ui-segmented>`.

| Attribute  | Type      | Default | Description        |
| ---------- | --------- | ------- | ------------------ |
| `value`    | `string`  | `''`    | Segment value      |
| `checked`  | `boolean` | `false` | Currently selected |
| `disabled` | `boolean` | `false` | Disabled state     |

**Events:** `change`

Not form-associated (child of segmented, not independent submit).
