# Layout

English | [简体中文](./layout.CN.md)

Responsive page layout with an optional full-width banner, a collapsible sidebar on desktop, and a drawer by default on mobile. Set `no-sidebar` to drop the entire sidebar and keep the content-only layout. The page itself scrolls; once the banner scrolls out, the desktop sidebar and header stay fixed within the viewport.

## Samples

### Basic

Five slots each take one region. `banner` spans the full width above the body, `header` is the sticky header of the content area, `sidebar` is the sidebar card content, the default slot is the main content area, and `tabbar` is the bottom bar.

`header-glow` adds a decorative glow behind the header slot content; it belongs to the background layer, so the slot content always sits above it.

layout is an app-shell-level full-screen layout that fills the viewport by default. Inside a height-constrained container, set `--wui-layout-viewport-height` to the container height so the page minimum height and the desktop sidebar are limited to this container.

The mobile Toggle only requests opening through `sidebar-open-change`; opening the Drawer requires your app to write that value back to `sidebar-open`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
      <web-ui-layout header-glow sidebarOpen={open} onsidebar-open-change={event => setOpen(event.detail.open)}>
        <div
          slot="banner"
          className="flex items-center justify-center bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
        >
          Full-width banner
        </div>
        <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
          Header
        </div>
        <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span className="rounded-md p-2 text-sm">Overview</span>
          <span className="rounded-md p-2 text-sm">Components</span>
          <span className="rounded-md p-2 text-sm">Theme</span>
        </nav>
        <div className="p-4">
          <p className="m-0 text-sm">
            The body scrolls with the inner scrollbar, while the header and tabbar stick to the top and bottom edges of
            the container.
          </p>
          <div className="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
        </div>
        <div slot="tabbar" className="flex items-center justify-center px-4 py-2 text-xs">
          Tabbar
        </div>
      </web-ui-layout>
    </div>
  )
}
```

```vue
<template>
  <div
    class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
  >
    <web-ui-layout header-glow :sidebarOpen="open" @sidebar-open-change="open = $event.detail.open">
      <div
        slot="banner"
        class="flex items-center justify-center bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
      >
        Full-width banner
      </div>
      <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
      <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
        <span class="rounded-md p-2 text-sm">Overview</span>
        <span class="rounded-md p-2 text-sm">Components</span>
        <span class="rounded-md p-2 text-sm">Theme</span>
      </nav>
      <div class="p-4">
        <p class="m-0 text-sm">
          The body scrolls with the inner scrollbar, while the header and tabbar stick to the top and bottom edges of
          the container.
        </p>
        <div class="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
      </div>
      <div slot="tabbar" class="flex items-center justify-center px-4 py-2 text-xs">Tabbar</div>
    </web-ui-layout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
```

### No sidebar

`no-sidebar` removes the sidebar structure from the layout entirely: desktop has no aside or collapse toggle, and narrow viewports have no header toggle or drawer either, leaving only the `banner` / `header` / default content / `tabbar` regions.

The `sidebar` slot is not rendered, but your app nodes stay in the light DOM. Removing the attribute restores the normal sidebar layout.

```tsx
export default function Demo() {
  return (
    <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
      <web-ui-layout no-sidebar header-glow>
        <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
          Header
        </div>
        <div className="p-4">
          <p className="m-0 text-sm">
            With no-sidebar there is no aside, Toggle, or Drawer, so the content column fills the row.
          </p>
          <div className="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
        </div>
        <div slot="tabbar" className="flex items-center justify-center px-4 py-2 text-xs">
          Tabbar
        </div>
      </web-ui-layout>
    </div>
  )
}
```

```vue
<template>
  <div
    class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
  >
    <web-ui-layout no-sidebar header-glow>
      <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
      <div class="p-4">
        <p class="m-0 text-sm">
          With no-sidebar there is no aside, Toggle, or Drawer, so the content column fills the row.
        </p>
        <div class="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
      </div>
      <div slot="tabbar" class="flex items-center justify-center px-4 py-2 text-xs">Tabbar</div>
    </web-ui-layout>
  </div>
</template>
```

### Collapsible sidebar

`sidebar-collapsed` is the controlled collapsed state of the desktop sidebar. It only narrows the desktop aside to `collapsed-width` and does not affect the mobile Drawer.

The desktop Toggle is rendered only when `sidebar-collapsible` is set; your app then writes the requested value from `sidebar-collapsed-change` back.

Both branches render the same `sidebar` slot content. If the content density should follow the collapsed state, your app must narrow that condition by `mobile` (for example `collapsed && !layout.mobile`, or CSS `web-ui-layout[mobile]`), otherwise the collapsed state also appears in the Drawer.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
        <web-ui-layout
          sidebarCollapsible
          sidebarCollapsed={collapsed}
          onsidebar-collapsed-change={event => setCollapsed(event.detail.collapsed)}
          sidebarOpen={open}
          onsidebar-open-change={event => setOpen(event.detail.open)}
        >
          <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
            <span className="rounded-md p-2 text-sm">Overview</span>
            <span className="rounded-md p-2 text-sm">Components</span>
            <span className="rounded-md p-2 text-sm">Theme</span>
            <span className="rounded-md p-2 text-sm">Settings</span>
          </nav>
          <div className="p-4">
            <p className="m-0 text-sm">
              Click the Toggle at the bottom of the sidebar to collapse / expand; layout only narrows the desktop aside
              to 60px.
            </p>
          </div>
        </web-ui-layout>
      </div>
      <p className="text-sm text-(--wui-color-text-secondary)">sidebar-collapsed: {collapsed ? 'true' : 'false'}</p>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <div
      class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
    >
      <web-ui-layout
        sidebar-collapsible
        :sidebarCollapsed="collapsed"
        @sidebar-collapsed-change="collapsed = $event.detail.collapsed"
        :sidebarOpen="open"
        @sidebar-open-change="open = $event.detail.open"
      >
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">Overview</span>
          <span class="rounded-md p-2 text-sm">Components</span>
          <span class="rounded-md p-2 text-sm">Theme</span>
          <span class="rounded-md p-2 text-sm">Settings</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">
            Click the Toggle at the bottom of the sidebar to collapse / expand; layout only narrows the desktop aside to
            60px.
          </p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">sidebar-collapsed: {{ collapsed ? 'true' : 'false' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const collapsed = ref(false)
const open = ref(false)
</script>
```

### Resize by dragging

With `sidebar-resizable` enabled, a resize handle appears on the right edge of the desktop sidebar (hidden in the collapsed state), and dragging changes the width in real time. After focusing it with the keyboard, ←/→ step by 16px (Shift accelerates to 64px), and Home/End jump to the lower/upper bound.

Releasing the drag or committing with the keyboard Enter dispatches one `sidebar-width-change` carrying the final pixel width. Once your app writes it back, the width is taken over by `sidebar-width` again. Escape reverts an uncommitted adjustment.

`sidebar-min-width` / `sidebar-max-width` are px literals; the upper bound is also limited to half the viewport, and the built-in limit takes precedence over the configured value.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [width, setWidth] = useState('240px')
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
        <web-ui-layout
          sidebar-resizable
          sidebarWidth={width}
          sidebar-min-width="160px"
          sidebar-max-width="360px"
          onsidebar-width-change={event => setWidth(event.detail.width)}
          sidebarOpen={open}
          onsidebar-open-change={event => setOpen(event.detail.open)}
        >
          <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
            <span className="rounded-md p-2 text-sm">Overview</span>
            <span className="rounded-md p-2 text-sm">Components</span>
            <span className="rounded-md p-2 text-sm">Theme</span>
          </nav>
          <div className="p-4">
            <p className="m-0 text-sm">
              Drag the handle on the right edge of the desktop sidebar to resize; after focusing, use ←/→ to step, Enter
              to commit, and Escape to revert the uncommitted adjustment.
            </p>
          </div>
        </web-ui-layout>
      </div>
      <p className="text-sm text-(--wui-color-text-secondary)">sidebar-width: {width}</p>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <div
      class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
    >
      <web-ui-layout
        sidebar-resizable
        :sidebarWidth="width"
        sidebar-min-width="160px"
        sidebar-max-width="360px"
        @sidebar-width-change="width = $event.detail.width"
        :sidebarOpen="open"
        @sidebar-open-change="open = $event.detail.open"
      >
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">Overview</span>
          <span class="rounded-md p-2 text-sm">Components</span>
          <span class="rounded-md p-2 text-sm">Theme</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">
            Drag the handle on the right edge of the desktop sidebar to resize; after focusing, use ←/→ to step, Enter
            to commit, and Escape to revert the uncommitted adjustment.
          </p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">sidebar-width: {{ width }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const width = ref('240px')
const open = ref(false)
</script>
```

### Mobile drawer and viewport detection

`sidebar-open` is the controlled visibility of the mobile Drawer and is independent of `sidebar-collapsed`.

`mobile` is written exclusively by layout and flips at the `640px` breakpoint at the same instant the page switches to the mobile branch, dispatching a `mobile-change` event as well.

In React, read `layout.mobile` inside `useLayoutEffect` before subscribing (the event dispatched at mount time precedes the subscription); write back on a breakpoint crossing with `flushSync`, otherwise there is one frame where the new tree is already on screen while your app still holds the old value.

Vue's template listener is attached before the element is inserted, so binding directly is enough.

Narrow the viewport to 640px or below and layout switches to the mobile branch: a Toggle appears in the header, and clicking it requests the Drawer to open through `sidebar-open-change`. The mobile Drawer enables both `draggable` and `page-shift`: opening it slides the page toward the Drawer's entry direction (to the right) by `16vw` (recalculated when the viewport width changes), and closing it restores the page.

```tsx
import type { WebUiLayout } from '@greypan/web-ui'
import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export default function Demo() {
  const layoutRef = useRef<WebUiLayout>(null)
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)

  useLayoutEffect(() => {
    const layout = layoutRef.current
    if (!layout) return
    setMobile(layout.mobile)
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<{ mobile: boolean }>).detail.mobile
      flushSync(() => setMobile(next))
    }
    layout.addEventListener('mobile-change', onChange)
    return () => layout.removeEventListener('mobile-change', onChange)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]">
        <web-ui-layout ref={layoutRef} sidebarOpen={open} onsidebar-open-change={event => setOpen(event.detail.open)}>
          <div slot="header" className="flex items-center px-4 py-2 text-sm font-medium">
            Header
          </div>
          <nav slot="sidebar" className="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
            <span className="rounded-md p-2 text-sm">Navigation</span>
            <span className="rounded-md p-2 text-sm">Components</span>
          </nav>
          <div className="p-4">
            <p className="m-0 text-sm">
              Narrow the viewport to 640px or below and a Toggle appears in the header; clicking it requests the Drawer
              to open through sidebar-open-change.
            </p>
          </div>
        </web-ui-layout>
      </div>
      <p className="text-sm text-(--wui-color-text-secondary)">
        mobile: {mobile ? 'true' : 'false'} · sidebar-open: {open ? 'true' : 'false'}
      </p>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col gap-3">
    <div
      class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
    >
      <web-ui-layout
        :sidebarOpen="open"
        @sidebar-open-change="open = $event.detail.open"
        @mobile-change="mobile = $event.detail.mobile"
      >
        <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">Navigation</span>
          <span class="rounded-md p-2 text-sm">Components</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">
            Narrow the viewport to 640px or below and a Toggle appears in the header; clicking it requests the Drawer to
            open through sidebar-open-change.
          </p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">
      mobile: {{ mobile ? 'true' : 'false' }} · sidebar-open: {{ open ? 'true' : 'false' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const mobile = ref(false)
</script>
```

## API

### Props

| Name                  | Description                                                                                                                                                                                                                                                | Type               | Default   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------- |
| `no-sidebar`          | Renders no sidebar structure: desktop aside, collapse toggle and resize handle, mobile header toggle and drawer; the `sidebar` slot is not rendered.                                                                                                       | `boolean`          | `false`   |
| `sidebar-collapsible` | Renders the desktop collapse / expand toggle. Without it no Toggle is rendered and no `sidebar-collapsed-change` request is produced by clicking; the desktop width is still driven by `sidebar-collapsed`, and the mobile drawer Toggle is unaffected.    | `boolean`          | `false`   |
| `sidebar-collapsed`   | Controlled collapsed state of the desktop sidebar; it only narrows the desktop side and does not affect the mobile Drawer.                                                                                                                                 | `boolean`          | `false`   |
| `sidebar-open`        | Controlled open state of the mobile sidebar Drawer.                                                                                                                                                                                                        | `boolean`          | `false`   |
| `header-glow`         | Shows a decorative glow behind the header slot content.                                                                                                                                                                                                    | `boolean`          | `false`   |
| `ariaLabels`          | Grouped overrides for the built-in accessible names (sidebar collapse/expand, resize, open navigation menu, main navigation) (property); keys without a value use the built-in English copy, and sidebar-related keys are not rendered under `no-sidebar`. | `LayoutAriaLabels` | -         |
| `mobile`              | Read-only calculated value: whether the current viewport is at or below the mobile breakpoint; writing the attribute is reverted, and assigning the property has no effect.                                                                                | `boolean`          | `false`   |
| `sidebar-width`       | Sidebar width when expanded on desktop and mobile.                                                                                                                                                                                                         | `string`           | `'240px'` |
| `collapsed-width`     | Sidebar width when collapsed on desktop.                                                                                                                                                                                                                   | `string`           | `'60px'`  |
| `sidebar-resizable`   | Enables drag resizing on the right edge of the desktop sidebar.                                                                                                                                                                                            | `boolean`          | `false`   |
| `sidebar-min-width`   | Lower bound (px) for drag resizing; defaults to `collapsed-width`.                                                                                                                                                                                         | `string`           | -         |
| `sidebar-max-width`   | Upper bound (px) for drag resizing; limited to half the viewport, with the built-in limit taking precedence.                                                                                                                                               | `string`           | -         |

### Events

| Name                       | Description                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidebar-collapsed-change` | Requests an update of the desktop collapse state; `detail.collapsed` is the requested value, and your app must write it back to `sidebar-collapsed`.                              |
| `sidebar-open-change`      | Requests an update of the mobile Drawer open state; `detail.open` is the requested value.                                                                                         |
| `sidebar-width-change`     | Requests a width update after the drag is released or committed with the keyboard Enter; `detail.width` is the final pixel width.                                                 |
| `mobile-change`            | Not a request. It reports layout's own calculated viewport state. `detail.mobile` has the same value as the `mobile` property, and it is dispatched once per breakpoint crossing. |

### Slots

| Name      | Description                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `banner`  | Optional full-width banner above the layout body.                                                                                                       |
| `header`  | Sticky header of the content area.                                                                                                                      |
| `sidebar` | Sidebar card content; the fixed region and the scroll container inside the desktop side are defined by your app; not rendered when `no-sidebar` is set. |
| `default` | Main content area.                                                                                                                                      |
| `tabbar`  | Bottom tabbar.                                                                                                                                          |

### Mobile viewport state

`mobile` is a read-only output, not an extra input, and layout is the only writer. The property is read-only (assignment has no effect and throws in strict mode), and writing the attribute is reverted immediately. Neither form dispatches an event.

It flips at the `640px` breakpoint at the same moment the page switches to the mobile branch, without a resize debounce.

`mobile-change` is dispatched once per breakpoint crossing, and the initial evaluation at mount in a narrow viewport also counts.

Read the current value from `layout.mobile` and receive updates through `mobile-change`. On the CSS side you can write `web-ui-layout[mobile]`.

### Using from frameworks

Code that reacts on a macrotask reads the old value while the new tree is already on screen:

- Vue: bind `@mobile-change` in the template and store the value in a `ref`. The template listener is attached before the element is inserted, so it also receives the notification dispatched at mount.
- React: get the element through a ref, read `layout.mobile` before subscribing inside `useLayoutEffect`, and write back with `flushSync`. Reading first gets the mount-time initial value. `flushSync` applies the breakpoint crossing before layout re-renders, which otherwise produces one frame where "the drawer is already rendered in the new state while your app's value is still old".
- CSS: write styles directly against `web-ui-layout[mobile]`, or wrap it into a variant. A Tailwind v4 app can write the mobile side of that boundary once instead of repeating it for every utility class: `@custom-variant mobile (&:where(web-ui-layout[mobile], web-ui-layout[mobile] *));`. Two limits apply. The attribute selector only affects nodes inside the layout subtree, and content portalled by an overlay to `document.body` still needs a media query. Do not use the custom variant for the min-width side, because Tailwind orders `@custom-variant` rules after the theme breakpoints, so a `desktop:` variant of the same property silently overrides `md:`/`lg:` at every wider size.

### Collapse applies to the desktop only

`sidebar-collapsed` only narrows the desktop sidebar. The layout does not apply the collapsed size to the mobile Drawer.

Both branches carry the same `sidebar` slot content. If the sidebar content density follows that attribute, your app must narrow the condition by `mobile` (for example `collapsed && !layout.mobile`, or CSS `web-ui-layout[mobile]`), otherwise the desktop collapsed state also appears in the Drawer.

### Sidebar-less layout

With `no-sidebar` set, desktop renders no aside, collapse toggle, or resize handle, and mobile renders no header toggle or drawer; the `banner`, `header`, default content, and `tabbar` regions keep their layout and scrolling behavior, and the content column fills the row.

The `sidebar` slot has no render outlet, while your app nodes stay in the light DOM. In this mode `sidebar-collapsed`, `sidebar-open`, `sidebar-width`, and the other `sidebar-*` attributes and events have no visible effect. Sidebar-related `ariaLabels` keys and CSS custom properties have no visible effect either.

`mobile` and `mobile-change` still follow the viewport as usual. Switching into this mode ends an ongoing drag gesture and any uncommitted width change. Removing the attribute returns to the layout governed by the `sidebar-*` attributes.

### Sidebar resizing

After enabling `sidebar-resizable`, a resize handle appears on the right edge of the desktop sidebar (hidden in the collapsed state). Hovering or dragging shows a 3px-wide accent vertical line and a `col-resize` cursor.

- Dragging updates the width in real time (transitions are disabled, and the width is limited to `[min, max]` and to the viewport).
- On release it fires the `sidebar-width-change` event carrying the final pixel width. After your app writes it back, the width is taken over by the `sidebar-width` attribute again. `pointercancel` restores the attribute-controlled width and fires no event.
- Keyboard operation (WAI-ARIA splitter pattern): after focusing, use ←/→ to step by 16px (Shift accelerates to 64px), Home/End to jump to min/max, Enter to commit through the same `sidebar-width-change` request, and Escape to revert an uncommitted adjustment.
- The mobile Drawer always supports drag-to-close through its built-in `draggable` drawer, and enables `page-shift`. Opening it slides the page toward the Drawer's entry direction (to the right) by `16vw`, the page does not follow the drag, and closing restores it.

### Behavior

`web-ui-layout` only constrains the space available to the sidebar card and manages the desktop Toggle; it does not create a scrollport for the desktop sidebar.

To scroll only part of the desktop sidebar, make the `sidebar` slot root a flex column with `height: 100%; min-height: 0`, then set `overflow-y: auto` on the target child.

That lets your app fix a header and footer itself without extra public slots:

```html
<div slot="sidebar" class="sidebar-root">
  <div class="sidebar-title">Components</div>
  <nav class="sidebar-nav">...</nav>
</div>
```

```css
.sidebar-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sidebar-title {
  flex-shrink: 0;
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

At `640px` and below (the very same condition `mobile` reports), the sidebar switches to a `web-ui-drawer` with the built-in glass body, scrollable content, and drag zone.

The mobile Drawer's width follows `sidebar-width`, and its radius follows `--wui-layout-sidebar-radius`.

The mobile Toggle sits inline in the header row as the glass variant. Its left inset defaults to `8px` and can be aligned with your app's own header padding through `--wui-layout-mobile-toggle-inset`.

`header-glow` adds a decorative glow with `pointer-events: none` behind the header slot content and the mobile Toggle. It belongs to the header background rather than the foreground layer, so the slot content always sits above it.

The glow comes from the shared `.wui-glow` style (`@greypan/web-ui/classes.css`), so the same class also works on any container.

The glow layers a real background blur on top of a color gradient: the gradient runs from `--wui-color-page` to fully transparent, the blur decays to 0 along the height, and the two layers do not constrain each other.

The default gradient direction is `to bottom`; to change the color, override `--wui-glow-color` on `web-ui-layout`, the theme, or any ancestor, and light/dark mode follows automatically.

The blur layer extends `24px` downward; the decay is computed by absolute length, so the bottom-edge strength stays the same on taller headers.

It never extends horizontally beyond the header box, while the vertical tail covers content within 24px below the header.

It can be tuned through `--wui-glow-overhang`, `--wui-glow-fade`, `--wui-glow-blur`, `--wui-glow-gradient`, and `--wui-glow-gradient-direction`; setting `--wui-glow-gradient: none` keeps only the blur.

See the Classes section of the package README for the full token table.

The layout stacking order is Header (`10`) < Auxiliary (`20`) < Banner (`30`) < Tabbar (`40`) < Sidebar (`50`).

The sidebar card surface uses `--wui-color-surface-sidebar`: light keeps a translucent neutral layer, while dark is one step lighter than `--wui-color-page`, the same as `--wui-color-surface`.

It is independent of `--wui-color-surface-overlay`, which dialog, drawer, and toast share, so the sidebar can adopt a different surface.

### CSS Custom Properties

| Name                                | Description                                                                                                  | Default            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------ |
| `--wui-layout-viewport-height`      | Available layout viewport height; set it to the container height when embedding layout in a fixed-height box | `100vh` / `100dvh` |
| `--wui-layout-sidebar-radius`       | Sidebar card radius (shared by desktop and mobile)                                                           | `24px`             |
| `--wui-layout-mobile-toggle-inset`  | Left inset of the mobile header Toggle                                                                       | `8px`              |
| `--wui-layout-sidebar-toggle-width` | Width of the desktop sidebar collapse toggle; the lower bound is `--wui-control-size` (36px)                 | `36px`             |
