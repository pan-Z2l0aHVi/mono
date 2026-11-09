# @greypan/app-scrollbars

> Shared overlay scrollbar options for the workspace apps.

English | [简体中文](./README.CN.md)

## What it provides

`@greypan/web-ui` does not depend on it. Web UI components use native CSS scrollbars with the `--wui-scrollbar-handle` token.

`overlayscrollbars` comes from the workspace catalog, so the bundled CSS and the runtime used by each app stay on the same version.

## Usage

```ts
import appScrollbarsOptions from '@greypan/app-scrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react' // or overlayscrollbars-vue
```

Importing the package also loads its stylesheet. Pass the default export wherever OverlayScrollbars is initialized.

```tsx
<OverlayScrollbarsComponent options={appScrollbarsOptions}>{children}</OverlayScrollbarsComponent>
```

To take over the document scrollbar, initialize `document.body`. The package also registers the click-scroll plugin, so clicking the track scrolls to the clicked position.

## Tokens

| Token                           | Owner             | Meaning                                                                    |
| ------------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `--wui-scrollbar-handle`        | `@greypan/web-ui` | Resting thumb colour. The outermost theme mirrors it to `documentElement`. |
| `--app-scrollbar-handle-hover`  | this package      | Thumb colour while hovered.                                                |
| `--app-scrollbar-handle-active` | this package      | Thumb colour while pressed.                                                |

Native scrollbars have no hover or active states, so `web-ui` defines only the resting token. The theme switches all three through `web-ui-theme[resolved-appearance]`. The document scrollbar under `<body>` follows through `html:has()`.

## API

### Default export

`PartialOptions` for OverlayScrollbars. It applies the bundled scrollbar style, hides the scrollbar after 2 seconds without scrolling, and scrolls to the clicked position without animation.

### `APP_SCROLLBARS_THEME`

The style class name, `os-theme-macos`. It is the `scrollbars.theme` value in the default export and is also defined in the bundled stylesheet.
