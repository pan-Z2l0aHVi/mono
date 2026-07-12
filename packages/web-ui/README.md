# @greypan/web-ui

Lit-based web components for React, Vue, and vanilla JS

English | [简体中文](./README.CN.md)

## Features

- **Button**: Styled button with full/primary/text/icon variants
- **BackTop**: Scroll-to-top with configurable threshold and smooth scroll
- **Layout**: Page layout with header/sidebar/tabbar slots
- **SVG Draw Lines**: SVG line drawing animation with easing control
- **Framework compatible**: Works with React, Vue, and vanilla HTML

## Install

```bash
# npm
npm install @greypan/web-ui

# pnpm
pnpm add @greypan/web-ui

# yarn
yarn add @greypan/web-ui

# bun
bun add @greypan/web-ui
```

> Requires `lit` as a dependency.

## Quick Start

```html
<script type="module" src="@greypan/web-ui"></script>

<web-ui-button primary>Click me</web-ui-button>
<web-ui-button text>Cancel</web-ui-button>
<web-ui-button icon>
  <iconify-icon icon="lucide:plus"></iconify-icon>
</web-ui-button>
```

## API

### `<web-ui-button>`

Styled button component.

| Attribute | Type      | Default | Description       |
| --------- | --------- | ------- | ----------------- |
| `full`    | `boolean` | `false` | Full width button |
| `primary` | `boolean` | `false` | Primary style     |
| `text`    | `boolean` | `false` | Text-only style   |
| `icon`    | `boolean` | `false` | Icon-only mode    |

### `<web-ui-back-top>`

Scroll-to-top button.

| Attribute      | Type                    | Default  | Description                     |
| -------------- | ----------------------- | -------- | ------------------------------- |
| `smooth`       | `boolean`               | `true`   | Smooth scroll animation         |
| `threshold`    | `number`                | `200`    | Scroll threshold to show button |
| `visible`      | `boolean`               | `false`  | Current visibility state        |
| `scrollTarget` | `HTMLElement \| Window` | `window` | Scroll container                |

**Events:**

| Event            | Detail                 | Description              |
| ---------------- | ---------------------- | ------------------------ |
| `visible-change` | `{ visible: boolean }` | Visibility state changed |

### `<web-ui-layout>`

Page layout with slots.

| Slot      | Description       |
| --------- | ----------------- |
| `header`  | Header area       |
| `sidebar` | Sidebar area      |
| `tabbar`  | Tab bar area      |
| (default) | Main content area |

### `<web-ui-svg-draw-lines>`

SVG line drawing animation component. Wraps an `<svg>` element and animates stroke-dashoffset.

| Attribute  | Type     | Default    | Description              |
| ---------- | -------- | ---------- | ------------------------ |
| `duration` | `number` | `1000`     | Animation duration in ms |
| `easing`   | `string` | `'linear'` | CSS easing function      |

```html
<web-ui-svg-draw-lines duration="2000" easing="ease-in-out">
  <svg viewBox="0 0 100 100">
    <path d="M10 10 L90 10 L90 90 L10 90 Z" fill="none" stroke="black" />
  </svg>
</web-ui-svg-draw-lines>
```
