# @greypan/app-scrollbars

> OverlayScrollbars configuration and macOS theme shared by the workspace apps

English | [简体中文](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/app-scrollbars/README.CN.md)

## Scope

This is private app infrastructure, not a public package. It owns the app-level overlay scrollbar behavior and the
macOS theme, so there is one copy instead of one per app.

`@greypan/web-ui` does not depend on it. Components theme their own scroll containers with native CSS and the
`--wui-scrollbar-handle` token from `web-ui-theme`.

`overlayscrollbars` is resolved through the workspace catalog, so the structural CSS bundled here and the runtime
instance used by each app stay on the same version.

## Usage

```ts
import appScrollbarsOptions from '@greypan/app-scrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react' // or overlayscrollbars-vue
```

Importing the package also loads its stylesheet, so there is no second import to remember. Pass the default export
wherever OverlayScrollbars is initialized:

```tsx
<OverlayScrollbarsComponent options={appScrollbarsOptions}>{children}</OverlayScrollbarsComponent>
```

To take over the document scrollbar instead of a container, initialize `document.body`. Importing the package
also registers the click-scroll plugin, so track clicks scroll to the clicked position immediately.

## Tokens

| Token                           | Owner             | Meaning                                                                    |
| ------------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `--wui-scrollbar-handle`        | `@greypan/web-ui` | Resting thumb colour; mirrored to `documentElement` by the outermost theme |
| `--app-scrollbar-handle-hover`  | this package      | Thumb colour while hovered                                                 |
| `--app-scrollbar-handle-active` | this package      | Thumb colour while pressed                                                 |

Native scrollbars have no hover or active states, so `web-ui` deliberately does not define those two; only the
overlay scrollbar needs them. The theme switches all three through `web-ui-theme[resolved-appearance]`, and the
document-level scrollbar under `<body>` follows via `html:has()`.

## API

### default export

`PartialOptions` for OverlayScrollbars (`satisfies PartialOptions`): macOS theme, auto-hide on scroll with a 2 s
delay, and click-to-scroll that lands at the clicked position without animation.

### `APP_SCROLLBARS_THEME`

The theme class name (`os-theme-macos`) carried by the default export's `scrollbars.theme`, also defined in the
bundled stylesheet.
