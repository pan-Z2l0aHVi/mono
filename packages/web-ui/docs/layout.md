---
component: layout
tag: web-ui-layout
---

Responsive page layout: an optional full-width banner, a collapsible sidebar on desktop, and a drawer by default on mobile. The page itself scrolls; once the banner scrolls out, the desktop sidebar and header stay fixed within the viewport.

## Samples

### Basic

Five slots each take one region: `banner` spans the full width above the body, `header` is the sticky header of the content area, `sidebar` is the sidebar card content, the default slot is the main content area, and `tabbar` is the bottom bar.

`header-glow` adds a decorative glow behind the header slot content; it belongs to the background layer, so the slot content always sits above it.

layout is an app-shell-level full-screen layout; the sample puts it inside a height-constrained scroll container, where the banner scrolls out with the content and the header and tabbar stick to the top and bottom edges of the container.

```tsx
export default function Demo() {
  return (
    <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
      <web-ui-layout header-glow>
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
  <div class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
    <web-ui-layout header-glow>
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
```

### Collapsible sidebar

`sidebar-collapsed` is the controlled collapse state on desktop: it only narrows the desktop aside to `collapsed-width` and does not affect the mobile Drawer.

The desktop Toggle is rendered by layout itself; the consumer only has to write the requested value from `sidebar-collapsed-change` back.

Both branches render the same `sidebar` slot content, so a consumer whose content density follows collapse must narrow that condition by `mobile` (for example `collapsed && !layout.mobile`, or CSS `web-ui-layout[mobile]`), otherwise the collapsed state renders all the way into the Drawer (issue #195).

The sidebar in this sample does not change content density with collapse; once collapsed, the narrow aside clips the overflow through `overflow: hidden` on `.sidebar-viewport`.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
        <web-ui-layout
          sidebarCollapsed={collapsed}
          onsidebar-collapsed-change={event => setCollapsed(event.detail.collapsed)}
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
              to 68px.
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
    <div class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
      <web-ui-layout :sidebarCollapsed="collapsed" @sidebar-collapsed-change="collapsed = $event.detail.collapsed">
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">Overview</span>
          <span class="rounded-md p-2 text-sm">Components</span>
          <span class="rounded-md p-2 text-sm">Theme</span>
          <span class="rounded-md p-2 text-sm">Settings</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">
            Click the Toggle at the bottom of the sidebar to collapse / expand; layout only narrows the desktop aside to
            68px.
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
</script>
```

### Resize by dragging

With `sidebar-resizable` enabled, a resize handle appears on the right edge of the desktop sidebar (hidden in the collapsed state), and dragging changes the width in real time; after focusing it with the keyboard, ←/→ step by 16px (Shift accelerates to 64px), and Home/End jump to the lower/upper bound.

Releasing the drag or committing with the keyboard Enter dispatches one `sidebar-width-change` carrying the final pixel width; once the consumer writes it back, the width is taken over by `sidebar-width` again, and Escape reverts an uncommitted adjustment.

`sidebar-min-width` / `sidebar-max-width` are px literals; the upper bound is also clamped to half the viewport, and the built-in limit takes precedence over the configured value.

```tsx
import { useState } from 'react'

export default function Demo() {
  const [width, setWidth] = useState('240px')

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
        <web-ui-layout
          sidebar-resizable
          sidebarWidth={width}
          sidebar-min-width="160px"
          sidebar-max-width="360px"
          onsidebar-width-change={event => setWidth(event.detail.width)}
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
    <div class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
      <web-ui-layout
        sidebar-resizable
        :sidebarWidth="width"
        sidebar-min-width="160px"
        sidebar-max-width="360px"
        @sidebar-width-change="width = $event.detail.width"
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
</script>
```

### Mobile drawer and viewport detection

`sidebar-open` is the controlled visibility of the mobile Drawer and is independent of `sidebar-collapsed`.

`mobile` is written exclusively by layout; it, layout's render branch, and the CSS `@media (width <= 640px)` are the same condition, so all three flip at the same instant, and a `mobile-change` event is dispatched as well.

In React, read `layout.mobile` inside `useLayoutEffect` before subscribing (the event dispatched at mount time precedes the subscription); write back on a breakpoint crossing with `flushSync`, otherwise there is one frame where the new tree is already on screen while the consumer still holds the old value (the mount read happens inside `useLayoutEffect`, and `setState` itself takes effect before paint, so no extra wrapper is needed there).

Vue's template listener is attached before the element is inserted, so binding directly is enough.

Narrow the viewport to 640px or below and layout switches to the mobile branch: a Toggle appears in the header, and clicking it requests the Drawer to open through `sidebar-open-change`.

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
      <div className="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
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
    <div class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
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

| Name                | Description                                                                                                                                                              | Type      | Default   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- |
| `sidebar-collapsed` | Controlled collapse state of the desktop sidebar; it only narrows the desktop side and does not affect the mobile Drawer.                                                | `boolean` | `false`   |
| `sidebar-open`      | Controlled open state of the mobile sidebar Drawer.                                                                                                                      | `boolean` | `false`   |
| `header-glow`       | Shows a decorative glow behind the header slot content.                                                                                                                  | `boolean` | `false`   |
| `mobile`            | Read-only derived value: whether the current viewport is at or below the mobile breakpoint; writing the attribute is reverted, and assigning the property has no effect. | `boolean` | `false`   |
| `sidebar-width`     | Sidebar width when expanded on desktop and mobile.                                                                                                                       | `string`  | `'240px'` |
| `collapsed-width`   | Sidebar width when collapsed on desktop.                                                                                                                                 | `string`  | `'68px'`  |
| `sidebar-resizable` | Enables drag resizing on the right edge of the desktop sidebar.                                                                                                          | `boolean` | `false`   |
| `sidebar-min-width` | Lower bound (px) for drag resizing; falls back to `collapsed-width` by default.                                                                                          | `string`  | —         |
| `sidebar-max-width` | Upper bound (px) for drag resizing; clamped to half the viewport, with the built-in limit taking precedence.                                                             | `string`  | —         |

### Events

| Name                       | Description                                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidebar-collapsed-change` | Requests an update of the desktop collapse state; `detail.collapsed` is the requested value, and the consumer must write it back to `sidebar-collapsed`.                    |
| `sidebar-open-change`      | Requests an update of the mobile Drawer open state; `detail.open` is the requested value.                                                                                   |
| `sidebar-width-change`     | Requests a width update after the drag is released or committed with the keyboard Enter; `detail.width` is the final pixel width.                                           |
| `mobile-change`            | Not a request: reports layout's own derived viewport state; `detail.mobile` has the same value as the `mobile` property, and it is dispatched once per breakpoint crossing. |

### Slots

| Name      | Description                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `banner`  | Optional full-width banner above the layout body.                                                                    |
| `header`  | Sticky header of the content area.                                                                                   |
| `sidebar` | Sidebar card content; the fixed region and the scroll container inside the desktop side are defined by the consumer. |
| `default` | Main content area.                                                                                                   |
| `tabbar`  | Bottom tabbar.                                                                                                       |

### Mobile viewport state

`mobile` is a derived output rather than a second input—it is written exclusively by layout; the property is read-only (assignment has no effect and throws in strict mode), and writing the attribute is reverted within the same reaction together with the value; neither form dispatches an event.

It is the same condition as layout's render branch and the media query layout CSS uses to hide the desktop aside (`@media (width <= 640px)`), so the three can never drift apart; the flip happens at the moment the media query changes, without a resize debounce.

`mobile-change` is dispatched once per breakpoint crossing, and the evaluation at connection time also counts when the element mounts in a narrow viewport.

Consumers read the current value from `layout.mobile` and receive updates through `mobile-change`; on the CSS side they can write `web-ui-layout[mobile]`.

### Consuming from frameworks

layout re-renders itself in a microtask, so **a consumer that reacts on a macrotask reads the old value while the new tree is already on screen**:

- **Vue**: bind `@mobile-change` in the template and store the value in a `ref`. Vue attaches the template listener before the element is inserted (so it also receives the one dispatched at connection time), and its flush runs in a microtask, earlier than layout's own update.
- **React**: get the element through a ref, **read `layout.mobile` before subscribing** inside `useLayoutEffect`, and write back with `flushSync`. Reading first is for the mount-time initial value that a listener attached after insertion never receives; `flushSync` is for the runtime to win the breakpoint crossing over layout's re-render—React flushes a setState from a DOM listener in a macrotask, which otherwise produces one frame where "the drawer is already rendered in the new state while the consumer's value is still old" (2/221 frames measured in this repo's React demo before the fix).
- **CSS**: write styles directly against `web-ui-layout[mobile]`, or wrap it into a variant. A Tailwind v4 app can write the **mobile side** of that boundary once instead of repeating it for every utility class: `@custom-variant mobile (&:where(web-ui-layout[mobile], web-ui-layout[mobile] *));`. Two limits: the attribute selector only reaches nodes inside the layout subtree, and content portalled by an overlay to `document.body` still needs a media query; **do not use the custom variant for the min-width side**—Tailwind orders `@custom-variant` rules after the theme breakpoints, so a `desktop:` variant of the same property silently overrides `md:`/`lg:` at every width above it.

### Collapse applies to desktop only

`sidebar-collapsed` only narrows the desktop sidebar; the layout applies no collapse geometry to the mobile Drawer.

Both branches carry the same `sidebar` slot content, so a consumer whose sidebar content density follows that attribute must narrow the condition by `mobile` (for example `collapsed && !layout.mobile`, or CSS `web-ui-layout[mobile]`), otherwise the desktop collapse preference renders all the way into the Drawer.

See issue #195.

### Sidebar resizing

After enabling `sidebar-resizable`, a resize handle appears on the right edge of the desktop sidebar (hidden in the collapsed state); hovering or dragging shows a 3px-wide accent vertical line and a `col-resize` cursor.

- Dragging updates the width in real time (transitions are disabled, and the width is limited to `[min, max]` and to the viewport).
- On release it fires the `sidebar-width-change` event carrying the final pixel width; after the consumer writes it back, the width is taken over by the `sidebar-width` attribute again; `pointercancel` restores the attribute-controlled width and fires no event.
- Keyboard operation (WAI-ARIA splitter pattern): after focusing, use ←/→ to step by 16px (Shift accelerates to 64px), Home/End to jump to min/max, Enter to commit through the same `sidebar-width-change` request, and Escape to revert an uncommitted adjustment.
- The mobile Drawer always supports drag-to-close through its built-in `draggable` drawer.

### Behavior

`web-ui-layout` only constrains the space available to the sidebar card and manages the desktop Toggle; it does not create a scrollport for the desktop sidebar.

To scroll only part of the desktop sidebar, make the `sidebar` slot root a flex column with `height: 100%; min-height: 0`, then set `overflow-y: auto` on the target child.

That lets the consumer fix a header and footer itself without extra public slots:

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

At `640px` and below—the very same condition `mobile` reports—the sidebar switches to a `web-ui-drawer` with the built-in glass body, scrollable content, and drag zone.

Layout maps `sidebar-width` to `--wui-drawer-width` and `--wui-layout-sidebar-radius` to `--wui-drawer-radius`.

The mobile Toggle sits inline in the header row as the glass variant. Its left inset defaults to `8px` and can be aligned with the consumer's own header padding through `--wui-layout-mobile-toggle-inset`.

`header-glow` adds a decorative glow with `pointer-events: none` behind the header slot content and the mobile Toggle. It belongs to the header background rather than the foreground layer, so the slot content always sits above it.

The glow comes from the shared `.wui-glow` style (`@greypan/web-ui/classes.css`); the layout component imports the same source through `?inline`, so the same class also works on any container.

The glow is composed of two pseudo-elements: `::before` uses a `linear-gradient` from `--wui-color-page` to fully transparent, and `::after` layers a real `backdrop-filter: blur(4px)` and uses `mask` to decay that blurred alpha to 0 along the height.

With the two layers separated, blur strength and color density do not constrain each other.

The default gradient direction is `to bottom`; to change the color, override `--wui-glow-color` on `web-ui-layout`, the theme, or any ancestor, and light/dark mode follows automatically.

On the default 52px-high header, the blur layer extends `24px` downward with a total fade length of `36px` and a bottom-edge alpha of about `0.67`; the decay is computed by absolute length, so the bottom-edge strength stays the same on taller headers.

It never extends horizontally beyond the header box, while the vertical tail covers content within 24px below the header.

It can be tuned through `--wui-glow-overhang`, `--wui-glow-fade`, `--wui-glow-blur`, `--wui-glow-gradient`, and `--wui-glow-gradient-direction`; setting `--wui-glow-gradient: none` keeps only the blur.

See the Classes section of the package README for the full token table.

The layout stacking order is Header (`10`) < Auxiliary (`20`) < Banner (`30`) < Tabbar (`40`) < Sidebar (`50`).

The sidebar card surface uses `--wui-color-surface-sidebar`: light keeps a translucent neutral layer, while dark is one step lighter than `--wui-color-page`, on the same level as `--wui-color-surface`.

It is a separate token because dialog, drawer, and toast share `--wui-color-surface-overlay` and can adopt a different surface.

### CSS Custom Properties

| Name                                | Description                                                                                  | Default |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | ------- |
| `--wui-layout-sidebar-radius`       | Sidebar card radius (shared by desktop and mobile)                                           | `24px`  |
| `--wui-layout-mobile-toggle-inset`  | Left inset of the mobile header Toggle                                                       | `8px`   |
| `--wui-layout-sidebar-toggle-width` | Width of the desktop sidebar collapse Toggle; the lower bound is `--wui-control-size` (36px) | `44px`  |
