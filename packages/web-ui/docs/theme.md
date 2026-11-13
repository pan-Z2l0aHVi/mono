# Theme

English | [简体中文](./theme.CN.md)

The theme provider defines foundation, color, layer, shadow, and motion tokens inside its own subtree, and it is that subtree's theme overlay container.

## Samples

### Light and dark

`appearance` decides which set of color and shadow tokens this scope resolves. `light` and `dark` can coexist on the same page.

The theme host generates no box and draws nothing. A child element must apply `--wui-color-page` and `--wui-color-text` itself to show the scope's colors.

```tsx
const appearances = ['light', 'dark'] as const

const labels: Record<(typeof appearances)[number], string> = {
  light: 'Light scope',
  dark: 'Dark scope'
}

export default function Demo() {
  return (
    <div className="flex flex-wrap gap-4">
      {appearances.map(item => (
        <web-ui-theme key={item} appearance={item}>
          <div className="w-64 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <p className="m-0 font-medium">{labels[item]}</p>
            <p className="m-0 mb-3 text-sm text-(--wui-color-text-secondary)">
              Text, secondary text, and control surfaces all take their values from this layer
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <web-ui-button variant="primary">Primary</web-ui-button>
              <web-ui-button variant="secondary">Secondary</web-ui-button>
              <web-ui-switch checked></web-ui-switch>
            </div>
          </div>
        </web-ui-theme>
      ))}
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap gap-4">
    <web-ui-theme v-for="item in appearances" :key="item" :appearance="item">
      <div class="w-64 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <p class="m-0 font-medium">{{ labels[item] }}</p>
        <p class="m-0 mb-3 text-sm text-(--wui-color-text-secondary)">
          Text, secondary text, and control surfaces all take their values from this layer
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <web-ui-button variant="primary">Primary</web-ui-button>
          <web-ui-button variant="secondary">Secondary</web-ui-button>
          <web-ui-switch checked></web-ui-switch>
        </div>
      </div>
    </web-ui-theme>
  </div>
</template>

<script setup lang="ts">
const appearances = ['light', 'dark'] as const

const labels: Record<(typeof appearances)[number], string> = {
  light: 'Light scope',
  dark: 'Dark scope'
}
</script>
```

### Switching appearance

Binding `appearance` to page state is theme switching. `system` is resolved from `prefers-color-scheme`.

The switcher sits inside the same scope and changes only that layer. A color change in the inner layer affects its own scope only, and the outer appearance and the page color stay unchanged. Whether this layer plays a reveal is decided by its own `motion`.

```tsx
import type { ThemeAppearance } from '@greypan/web-ui'
import { useState } from 'react'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
]

export default function Demo() {
  const [appearance, setAppearance] = useState<ThemeAppearance>('light')

  return (
    <web-ui-theme appearance="dark">
      <div className="rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <p className="m-0 mb-3 text-xs text-(--wui-color-text-secondary)">
          The outer layer is fixed to dark; switching the inner one cannot affect it
        </p>
        <web-ui-theme appearance={appearance}>
          <div className="w-full max-w-sm rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-(--wui-color-text-secondary)">appearance</span>
              <web-ui-segmented
                value={appearance}
                aria-label="Appearance of the sample scope"
                onInput={event => {
                  const next = appearances.find(item => item.value === event.currentTarget.value)
                  if (next) setAppearance(next.value)
                }}
              >
                {appearances.map(item => (
                  <web-ui-segmented-trigger key={item.value} value={item.value}>
                    {item.label}
                  </web-ui-segmented-trigger>
                ))}
              </web-ui-segmented>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <web-ui-input value="Input inside the scope"></web-ui-input>
              <web-ui-button variant="primary">Confirm</web-ui-button>
            </div>
          </div>
        </web-ui-theme>
      </div>
    </web-ui-theme>
  )
}
```

```vue
<template>
  <web-ui-theme appearance="dark">
    <div class="rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <p class="m-0 mb-3 text-xs text-(--wui-color-text-secondary)">
        The outer layer is fixed to dark; switching the inner one cannot affect it
      </p>
      <web-ui-theme :appearance="appearance">
        <div
          class="w-full max-w-sm rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
        >
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span class="text-sm text-(--wui-color-text-secondary)">appearance</span>
            <web-ui-segmented
              :value="appearance"
              aria-label="Appearance of the sample scope"
              @input="pick($event.currentTarget.value)"
            >
              <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
                {{ item.label }}
              </web-ui-segmented-trigger>
            </web-ui-segmented>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <web-ui-input value="Input inside the scope"></web-ui-input>
            <web-ui-button variant="primary">Confirm</web-ui-button>
          </div>
        </div>
      </web-ui-theme>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import type { ThemeAppearance } from '@greypan/web-ui'
import { ref } from 'vue'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
]

const appearance = ref<ThemeAppearance>('light')

function pick(value: string) {
  const next = appearances.find(item => item.value === value)
  if (next) appearance.value = next.value
}
</script>
```

### Derived output

`resolved-appearance` (also exposed as the `resolvedAppearance` property) is always `light` or `dark`. An explicit `appearance` is passed through as-is. `system` is resolved from `prefers-color-scheme` and updates live when the OS switches between light and dark. When `appearance` is not set, the output defaults to `light`.

Observe this attribute with a CSS selector or MutationObserver to track the resolved appearance.

Only the component writes this attribute. External changes are reverted.

```tsx
import type { WebUiTheme } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const theme = useRef<WebUiTheme>(null)
  const [report, setReport] = useState('Not read yet')

  function inspect() {
    const el = theme.current
    if (!el) return
    const derived = el.resolvedAppearance
    const tampered = derived === 'dark' ? 'light' : 'dark'
    el.setAttribute('resolved-appearance', tampered)
    setReport(
      `Resolved ${derived}; after writing ${tampered} externally, read back ${el.getAttribute('resolved-appearance')}`
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-theme ref={theme} appearance="system">
        <web-ui-button onClick={inspect}>Read and try to override</web-ui-button>
      </web-ui-theme>
      <output className="text-sm text-(--wui-color-text-secondary)">{report}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-theme ref="theme" appearance="system">
      <web-ui-button @click="inspect">Read and try to override</web-ui-button>
    </web-ui-theme>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ report }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTheme } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const theme = useTemplateRef<WebUiTheme>('theme')
const report = ref('Not read yet')

function inspect() {
  const el = theme.value
  if (!el) return
  const derived = el.resolvedAppearance
  const tampered = derived === 'dark' ? 'light' : 'dark'
  el.setAttribute('resolved-appearance', tampered)
  report.value = `Resolved ${derived}; after writing ${tampered} externally, read back ${el.getAttribute('resolved-appearance')}`
}
</script>
```

### Nested scopes

Themes can be nested layer by layer, and each layer resolves its own tokens. Inner values override the outer ones, and leaving an inner layer returns to the outer values. Each layer outputs its own `resolved-appearance`.

`appearance` is per layer as well. Changing the middle layer repaints only the middle and inner regions, and changing the inner layer leaves the two outer regions untouched. `motion` is per layer too and does not inherit from ancestors; when omitted it defaults to `system`.

The host generates no box, so write layout (the border, padding, and spacing here) on an element inside the scope. Writing it on the `<web-ui-theme>` host has no effect.

```tsx
import type { ThemeAppearance } from '@greypan/web-ui'
import { useState } from 'react'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
]

export default function Demo() {
  const [outer, setOuter] = useState<ThemeAppearance>('light')
  const [middle, setMiddle] = useState<ThemeAppearance>('dark')
  const [inner, setInner] = useState<ThemeAppearance>('system')

  return (
    <web-ui-theme appearance={outer} motion="reduced">
      <div className="rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-col items-start gap-2">
          <span className="text-xs text-(--wui-color-text-secondary)">Layer 1 · motion reduced</span>
          <web-ui-segmented
            value={outer}
            aria-label="Layer 1 appearance"
            onInput={event => {
              const next = appearances.find(item => item.value === event.currentTarget.value)
              if (next) setOuter(next.value)
            }}
          >
            {appearances.map(item => (
              <web-ui-segmented-trigger key={item.value} value={item.value}>
                {item.label}
              </web-ui-segmented-trigger>
            ))}
          </web-ui-segmented>
        </div>

        <web-ui-theme appearance={middle} motion="full">
          <div className="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <div className="flex flex-col items-start gap-2">
              <span className="text-xs text-(--wui-color-text-secondary)">Layer 2 · motion full</span>
              <web-ui-segmented
                value={middle}
                aria-label="Layer 2 appearance"
                onInput={event => {
                  const next = appearances.find(item => item.value === event.currentTarget.value)
                  if (next) setMiddle(next.value)
                }}
              >
                {appearances.map(item => (
                  <web-ui-segmented-trigger key={item.value} value={item.value}>
                    {item.label}
                  </web-ui-segmented-trigger>
                ))}
              </web-ui-segmented>
            </div>

            <web-ui-theme appearance={inner}>
              <div className="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
                <div className="flex flex-col items-start gap-2">
                  <span className="text-xs text-(--wui-color-text-secondary)">Layer 3 · motion system</span>
                  <web-ui-segmented
                    value={inner}
                    aria-label="Layer 3 appearance"
                    onInput={event => {
                      const next = appearances.find(item => item.value === event.currentTarget.value)
                      if (next) setInner(next.value)
                    }}
                  >
                    {appearances.map(item => (
                      <web-ui-segmented-trigger key={item.value} value={item.value}>
                        {item.label}
                      </web-ui-segmented-trigger>
                    ))}
                  </web-ui-segmented>
                </div>
              </div>
            </web-ui-theme>
          </div>
        </web-ui-theme>
      </div>
    </web-ui-theme>
  )
}
```

```vue
<template>
  <web-ui-theme :appearance="outer" motion="reduced">
    <div class="rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="flex flex-col items-start gap-2">
        <span class="text-xs text-(--wui-color-text-secondary)">Layer 1 · motion reduced</span>
        <web-ui-segmented
          :value="outer"
          aria-label="Layer 1 appearance"
          @input="outer = pick($event.currentTarget.value)"
        >
          <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
            {{ item.label }}
          </web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>

      <web-ui-theme :appearance="middle" motion="full">
        <div
          class="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
        >
          <div class="flex flex-col items-start gap-2">
            <span class="text-xs text-(--wui-color-text-secondary)">Layer 2 · motion full</span>
            <web-ui-segmented
              :value="middle"
              aria-label="Layer 2 appearance"
              @input="middle = pick($event.currentTarget.value)"
            >
              <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
                {{ item.label }}
              </web-ui-segmented-trigger>
            </web-ui-segmented>
          </div>

          <web-ui-theme :appearance="inner">
            <div
              class="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
            >
              <div class="flex flex-col items-start gap-2">
                <span class="text-xs text-(--wui-color-text-secondary)">Layer 3 · motion system</span>
                <web-ui-segmented
                  :value="inner"
                  aria-label="Layer 3 appearance"
                  @input="inner = pick($event.currentTarget.value)"
                >
                  <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </web-ui-segmented-trigger>
                </web-ui-segmented>
              </div>
            </div>
          </web-ui-theme>
        </div>
      </web-ui-theme>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import type { ThemeAppearance } from '@greypan/web-ui'
import { ref } from 'vue'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
]

const outer = ref<ThemeAppearance>('light')
const middle = ref<ThemeAppearance>('dark')
const inner = ref<ThemeAppearance>('system')

function pick(value: string): ThemeAppearance {
  return appearances.find(item => item.value === value)?.value ?? 'light'
}
</script>
```

### Motion presets

`motion` sets the motion preset for this layer. `reduced` sets all transition durations to zero, but the two infinite loading loops do not stop; they only slow down to `1600ms`. `full` always plays motion. `system` follows `prefers-reduced-motion`.

`motion` does not take part in resolving `appearance`. `isReducedMotion()` returns this layer's result.

Opening the panel of the portal select lets you compare the enter and exit durations directly. The panel mounts into this layer's overlay container and uses this layer's duration tokens.

```tsx
import type { ThemeMotion, WebUiTheme } from '@greypan/web-ui'
import { useRef, useState } from 'react'

const motions: { label: string; value: ThemeMotion }[] = [
  { label: 'full', value: 'full' },
  { label: 'reduced', value: 'reduced' },
  { label: 'system', value: 'system' }
]

export default function Demo() {
  const theme = useRef<WebUiTheme>(null)
  const [motion, setMotion] = useState<ThemeMotion>('system')
  const [reduced, setReduced] = useState('')

  return (
    <web-ui-theme ref={theme} appearance="light" motion={motion}>
      <div className="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-(--wui-color-text-secondary)">motion</span>
          <web-ui-segmented
            value={motion}
            aria-label="Motion preset of the sample scope"
            onInput={event => {
              const next = motions.find(item => item.value === event.currentTarget.value)
              if (next) setMotion(next.value)
            }}
          >
            {motions.map(item => (
              <web-ui-segmented-trigger key={item.value} value={item.value}>
                {item.label}
              </web-ui-segmented-trigger>
            ))}
          </web-ui-segmented>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <web-ui-select portal placeholder="Open to see the duration" aria-label="Select for comparing motion presets">
            <web-ui-option value="enter" label="Enter">
              Enter
            </web-ui-option>
            <web-ui-option value="exit" label="Exit">
              Exit
            </web-ui-option>
          </web-ui-select>
          <web-ui-button
            variant="secondary"
            onClick={() => setReduced(`isReducedMotion() = ${String(theme.current?.isReducedMotion())}`)}
          >
            Read the result
          </web-ui-button>
          <output className="text-sm text-(--wui-color-text-secondary)">
            {reduced === '' ? 'Not read yet' : reduced}
          </output>
        </div>
      </div>
    </web-ui-theme>
  )
}
```

```vue
<template>
  <web-ui-theme ref="theme" appearance="light" :motion="motion">
    <div class="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-sm text-(--wui-color-text-secondary)">motion</span>
        <web-ui-segmented
          :value="motion"
          aria-label="Motion preset of the sample scope"
          @input="pick($event.currentTarget.value)"
        >
          <web-ui-segmented-trigger v-for="item in motions" :key="item.value" :value="item.value">
            {{ item.label }}
          </web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <web-ui-select portal placeholder="Open to see the duration" aria-label="Select for comparing motion presets">
          <web-ui-option value="enter" label="Enter">Enter</web-ui-option>
          <web-ui-option value="exit" label="Exit">Exit</web-ui-option>
        </web-ui-select>
        <web-ui-button variant="secondary" @click="inspect">Read the result</web-ui-button>
        <output class="text-sm text-(--wui-color-text-secondary)">{{
          reduced === '' ? 'Not read yet' : reduced
        }}</output>
      </div>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import type { ThemeMotion, WebUiTheme } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const motions: { label: string; value: ThemeMotion }[] = [
  { label: 'full', value: 'full' },
  { label: 'reduced', value: 'reduced' },
  { label: 'system', value: 'system' }
]

const theme = useTemplateRef<WebUiTheme>('theme')
const motion = ref<ThemeMotion>('system')
const reduced = ref('')

function pick(value: string) {
  const next = motions.find(item => item.value === value)
  if (next) motion.value = next.value
}

function inspect() {
  const el = theme.value
  if (!el) return
  reduced.value = `isReducedMotion() = ${String(el.isReducedMotion())}`
}
</script>
```

### Overlay root and portal

Every enabled theme is also its own overlay container, and `getOverlayRoot()` returns it. A theme with no `appearance` set creates no root and returns `undefined`.

Portal-style components with no explicit container mount into the overlay container of the nearest enabled theme, so the panel uses this layer's tokens. `toast()` without a `target` prefers the root theme.

`<web-ui-dialog>` renders in the native top layer and still gets this layer's color and motion tokens.

```tsx
import { toast, type WebUiButton, type WebUiTheme } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const theme = useRef<WebUiTheme>(null)
  const toastTarget = useRef<WebUiButton>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [report, setReport] = useState('Not read yet')

  return (
    <web-ui-theme ref={theme} appearance="dark">
      <div className="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-wrap items-center gap-2">
          <web-ui-select
            portal
            placeholder="Portal select"
            aria-label="Select mounted into the scope overlay container"
          >
            <web-ui-option value="portal" label="Portal overlay">
              Portal overlay
            </web-ui-option>
            <web-ui-option value="token" label="Theme token">
              Theme token
            </web-ui-option>
          </web-ui-select>
          <web-ui-button
            ref={toastTarget}
            variant="secondary"
            onClick={() =>
              toast.info("This toast mounts into the sample's own overlay container.", {
                heading: 'Scoped toast',
                duration: 3000,
                target: toastTarget.current ?? undefined
              })
            }
          >
            Show toast
          </web-ui-button>
          <web-ui-button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </web-ui-button>
          <web-ui-button
            variant="ghost"
            onClick={() =>
              setReport(
                theme.current?.getOverlayRoot()
                  ? 'getOverlayRoot() returns an element'
                  : 'getOverlayRoot() returns undefined'
              )
            }
          >
            Read overlay container
          </web-ui-button>
        </div>
        <output className="mt-2 block text-sm text-(--wui-color-text-secondary)">{report}</output>

        <web-ui-dialog
          open={dialogOpen}
          heading="Scoped dialog"
          onopen-change={event => setDialogOpen(event.detail.open)}
        >
          The dialog sits in the native top layer; color and motion tokens are still inherited from this layer.
          <web-ui-button slot="footer" variant="primary" full onClick={() => setDialogOpen(false)}>
            Close
          </web-ui-button>
        </web-ui-dialog>
      </div>
    </web-ui-theme>
  )
}
```

```vue
<template>
  <web-ui-theme ref="theme" appearance="dark">
    <div class="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="flex flex-wrap items-center gap-2">
        <web-ui-select portal placeholder="Portal select" aria-label="Select mounted into the scope overlay container">
          <web-ui-option value="portal" label="Portal overlay">Portal overlay</web-ui-option>
          <web-ui-option value="token" label="Theme token">Theme token</web-ui-option>
        </web-ui-select>
        <web-ui-button ref="toast-target" variant="secondary" @click="showToast">Show toast</web-ui-button>
        <web-ui-button variant="secondary" @click="dialogOpen = true">Open dialog</web-ui-button>
        <web-ui-button variant="ghost" @click="inspect">Read overlay container</web-ui-button>
      </div>
      <output class="mt-2 block text-sm text-(--wui-color-text-secondary)">{{ report }}</output>

      <web-ui-dialog :open="dialogOpen" heading="Scoped dialog" @open-change="dialogOpen = $event.detail.open">
        The dialog sits in the native top layer; color and motion tokens are still inherited from this layer.
        <web-ui-button slot="footer" variant="primary" full @click="dialogOpen = false">Close</web-ui-button>
      </web-ui-dialog>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import { toast, type WebUiButton, type WebUiTheme } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const theme = useTemplateRef<WebUiTheme>('theme')
const toastTarget = useTemplateRef<WebUiButton>('toast-target')
const dialogOpen = ref(false)
const report = ref('Not read yet')

function showToast() {
  toast.info("This toast mounts into the sample's own overlay container.", {
    heading: 'Scoped toast',
    duration: 3000,
    target: toastTarget.value ?? undefined
  })
}

function inspect() {
  report.value = theme.value?.getOverlayRoot()
    ? 'getOverlayRoot() returns an element'
    : 'getOverlayRoot() returns undefined'
}
</script>
```

### Overriding tokens within a scope

`<web-ui-theme>` declares the token defaults for its own subtree, so overrides must be written on elements inside the scope. Raising `--wui-control-size` and `--wui-input-width` changes the height and width of controls.

Raising `--wui-space-4` changes the overall spacing. Component-specific override tokens (such as `--wui-button-px` and `--wui-dialog-padding`) use these steps only as fallback defaults.

`--wui-color-focus-ring` is derived from `--wui-color-accent`. An accent override written on a child element does not change it.

```tsx
export default function Demo() {
  return (
    <web-ui-theme appearance="light">
      <div className="flex flex-wrap gap-4 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-col items-start gap-[var(--wui-space-4)]">
          <p className="m-0 text-sm text-(--wui-color-text-secondary)">Scope defaults</p>
          <web-ui-button variant="primary">Confirm</web-ui-button>
          <web-ui-input value="Width and height both use the default step"></web-ui-input>
        </div>

        <div className="flex flex-col items-start gap-[var(--wui-space-4)] [--wui-control-size:44px] [--wui-input-width:240px] [--wui-space-4:24px] [--wui-color-accent:#0f7b6c]">
          <p className="m-0 text-sm text-(--wui-color-text-secondary)">One step higher within the same scope</p>
          <web-ui-button variant="primary">Confirm</web-ui-button>
          <web-ui-input value="Control height and width raised"></web-ui-input>
        </div>
      </div>
    </web-ui-theme>
  )
}
```

```vue
<template>
  <web-ui-theme appearance="light">
    <div class="flex flex-wrap gap-4 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="flex flex-col items-start gap-[var(--wui-space-4)]">
        <p class="m-0 text-sm text-(--wui-color-text-secondary)">Scope defaults</p>
        <web-ui-button variant="primary">Confirm</web-ui-button>
        <web-ui-input value="Width and height both use the default step"></web-ui-input>
      </div>

      <div
        class="flex flex-col items-start gap-[var(--wui-space-4)] [--wui-control-size:44px] [--wui-input-width:240px] [--wui-space-4:24px] [--wui-color-accent:#0f7b6c]"
      >
        <p class="m-0 text-sm text-(--wui-color-text-secondary)">One step higher within the same scope</p>
        <web-ui-button variant="primary">Confirm</web-ui-button>
        <web-ui-input value="Control height and width raised"></web-ui-input>
      </div>
    </div>
  </web-ui-theme>
</template>
```

## API

### Props

| Name                  | Description                                                                          | Type                           | Default    |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------ | ---------- |
| `appearance`          | Color scheme: `light`, `dark`, or `system`.                                          | `ThemeAppearance \| undefined` | -          |
| `resolved-appearance` | Resolved color scheme, a read-only output written back to an attribute.              | `ResolvedThemeAppearance`      | `'light'`  |
| `motion`              | Motion preference of the current nested theme scope: `full`, `reduced`, or `system`. | `ThemeMotion`                  | `'system'` |

### Slots

| Name      | Description                     |
| --------- | ------------------------------- |
| `default` | Content inside the theme scope. |

### Methods

| Name                | Description                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getOverlayRoot()`  | Returns the theme overlay container that this theme owns; returns `undefined` when `appearance` is not set.                                                         |
| `isReducedMotion()` | Whether the current theme scope should reduce motion: `motion` of `reduced` / `full` gives `true` / `false` directly, while `system` follows the system preference. |

### Portal mount rules

Every enabled `<web-ui-theme>` is also the default scoped overlay container.

Portal-style components with no explicit `overlayContainer` resolve to the `getOverlayRoot()` of the nearest enabled theme. Calls without a target prefer the root theme's overlay container.

When no enabled theme provides an overlay container, they fall back to the global default overlay container.

### Behavior

Defines foundation, color, layer, shadow, and motion tokens in its subtree. `motion="system"` follows `prefers-reduced-motion`. Use `motion="reduced"` to reduce motion in the current scope, or `motion="full"` in a nested theme to restore the default tokens.

`system` color scheme follows `prefers-color-scheme`.

`resolved-appearance` is a read-only host attribute computed by the component (also exposed as the `resolvedAppearance` property). Its value is always `light` or `dark`. An explicit `appearance` is passed through as-is, `appearance="system"` is resolved from `prefers-color-scheme`, and it updates live when the OS switches between light and dark.

A theme with no `appearance` set stays inactive, but its resolved output uses the default `light`.

Only the component writes this attribute, and external changes are reverted. Callers can therefore bind a selector or a Tailwind custom variant directly to `resolved-appearance` without keeping a second copy of the theme state.

Whether a color scheme change plays a reveal is decided by the `motion` preset of the current theme scope: `full` always plays it, `reduced` switches immediately, and `system` follows `prefers-reduced-motion`.

The root theme reveals the whole page. A nested theme reveals only its own area. The reveal direction follows the resolved appearance, and the light and dark directions play in reverse.

These cases apply the new appearance immediately, with no reveal: an unsupported browser, a reduced-motion scope, a zero duration, or a reveal that is already running. OS light/dark switches under `appearance="system"` do not animate.

During a root reveal, new pointer and keyboard activation and cancelable input events in the document are temporarily blocked. A nested reveal limits protection to its scope when possible, falling back to the document for events that cannot be attributed. Wheel input ends the reveal to restore scrolling. Programmatic assignments, browser shortcuts, and some input method operations are not covered.

The theme host draws no background. The component library does not paint a background on the host page, and the embedder keeps full control over the surface behind the theme subtree.

### The `motion` attribute

Express the intent with `motion`. The default `motion="system"` plays the reveal unless the system prefers reduced motion. `motion="full"` always plays it. `motion="reduced"` switches without any animation.

### Root page color sync

The outermost enabled theme syncs the current `--wui-color-page` onto `document.documentElement`, so the page canvas follows the theme, including the area revealed by overscroll rubber-banding. Nested themes keep their own scope and do not rewrite the root value.

Not live: the component does not observe style changes on the host itself, so changing `--wui-color-page` on the host at runtime (inline styles, a class, or media queries) is not synced immediately. It waits for the theme to reconnect or for `appearance` to change.

When the page color must vary independently of the theme appearance, define your own `--wui-color-page` on `:root` or `body` with `!important`. Or let the page color follow `appearance`.

### Foundation tokens

| Name                      | Description                                     | Default |
| ------------------------- | ----------------------------------------------- | ------- |
| `--wui-input-width`       | Default width of compact form controls          | `200px` |
| `--wui-control-size`      | Default control height and square minimum width | `36px`  |
| `--wui-overlay-min-width` | Minimum width of anchored overlays              | `200px` |
| `--wui-focus-ring-width`  | Focus indicator width                           | `3px`   |

### Typography notes

Font sizes are named after the role the text plays, not its position on the scale. `caption` is a small label on dense chrome, `readout` is for numbers, the base size without a suffix is body text, and `title` is a bounded card title. Weights are named after their weight, and line heights after the vertical space the text needs.

This family is appearance-independent: the values are the same in light and dark.

`line-height: 1` and `line-height: 0` inside components are not typographic line heights and have no corresponding tokens.

### Typography tokens

| Name                         | Description                                                               | Default |
| ---------------------------- | ------------------------------------------------------------------------- | ------- |
| `--wui-font-size-caption`    | Dense chrome label (badge, toast timestamp, menu group header)            | `12px`  |
| `--wui-font-size-readout`    | Numeric readout (image preview counter and zoom ratio)                    | `13px`  |
| `--wui-font-size`            | Base size for body text and controls (including control placeholder text) | `14px`  |
| `--wui-font-size-title`      | Bounded card title (dialog, drawer)                                       | `18px`  |
| `--wui-font-weight-medium`   | Medium weight for emphasized inline text                                  | `500`   |
| `--wui-font-weight-semibold` | Semibold weight for headings                                              | `600`   |
| `--wui-line-height-tight`    | Tight line height for large headings                                      | `1.2`   |
| `--wui-line-height-snug`     | Snug line height for medium headings                                      | `1.4`   |
| `--wui-line-height-normal`   | Regular line height for body text                                         | `1.5`   |
| `--wui-line-height-relaxed`  | Relaxed line height for long-form reading                                 | `1.6`   |

### Spacing notes

A six-step scale on a 4px base, ending at 24px. It does not replace each component's own override tokens (`--wui-button-px`, `--wui-dialog-padding`, and the like); it is their fallback default. Overriding one step adjusts density at every call site that uses that step.

The scale deliberately excludes `1px`, `2px`, `6px`, `7.5px`, `10px`, and negative values. These are hairlines and stroke rings, optical corrections, a half-step coupling value, and negative margins, and they do not share spacing semantics.

Offsets that align to a viewport or host content edge are not part of the scale, even when they land on a 4px step:

- `--wui-image-preview-edge-gap`
- `--wui-toast-viewport-gap`
- `--wui-layout-mobile-toggle-inset`
- `--wui-back-top-right` / `--wui-back-top-left` / `--wui-back-top-bottom`
- `--wui-drawer-inset`
- `--wui-drawer-close-right`

Their frame of reference is the screen or the host's content edge, not the spacing between adjacent elements. `--wui-drawer-close-top` is the exception: it follows the drawer's header padding.

Spacing derived from a component's `size` prop is not part of the scale either (for example, `<web-ui-empty>` padding and graphic size follow `--wui-empty-size`). These values follow `size`; write px directly.

Overrides must be written inside a `<web-ui-theme>` scope.

An overlay without a theme scope cannot read the spacing scale and falls back to literal defaults.

### Spacing tokens

| Name            | Description                                    | Default |
| --------------- | ---------------------------------------------- | ------- |
| `--wui-space-1` | Compact padding (badge, menu)                  | `4px`   |
| `--wui-space-2` | Control spacing, group spacing, inline spacing | `8px`   |
| `--wui-space-3` | Horizontal control padding                     | `12px`  |
| `--wui-space-4` | Standard block spacing                         | `16px`  |
| `--wui-space-5` | Overlay content padding                        | `20px`  |
| `--wui-space-6` | Wide overlay padding                           | `24px`  |

### Selection control tokens

| Name                           | Description                                   | Default              |
| ------------------------------ | --------------------------------------------- | -------------------- |
| `--wui-selection-control-size` | Width and height of the indicator (dot / box) | `18px`               |
| `--wui-radio-group-gap`        | Member gap of `<web-ui-radio-group>`          | `var(--wui-space-2)` |
| `--wui-checkbox-group-gap`     | Member gap of `<web-ui-checkbox-group>`       | `var(--wui-space-2)` |

### Radius tokens

| Name                   | Description                                                     | Default                |
| ---------------------- | --------------------------------------------------------------- | ---------------------- |
| `--wui-radius-control` | Pill radius for small controls (button, input, switch, option…) | `calc(infinity * 1px)` |
| `--wui-radius-menu`    | menu/Popover floating panel, multi-line textarea, and toast     | `18px`                 |
| `--wui-radius-overlay` | Large overlays: dialog, drawer, layout sidebar                  | `28px`                 |

### Layer tokens

| Name                         | Description                | Default |
| ---------------------------- | -------------------------- | ------- |
| `--wui-layer-inline-overlay` | Overlay inside a component | `10`    |
| `--wui-layer-header`         | Page header                | `100`   |
| `--wui-layer-auxiliary`      | Floating toolbar controls  | `200`   |
| `--wui-layer-banner`         | Banner                     | `300`   |
| `--wui-layer-tabbar`         | Tab bar                    | `400`   |
| `--wui-layer-sidebar`        | Sidebar                    | `500`   |
| `--wui-layer-menu`           | menu/floating panel        | `1000`  |
| `--wui-layer-menu-nested`    | Nested menu                | `1100`  |
| `--wui-layer-toast`          | Toast                      | `2000`  |
| `--wui-layer-loading`        | Loading overlay            | `3000`  |

### Motion notes

Default duration values:

- `--wui-duration-press: 80ms`
- `--wui-duration-feedback: 100ms`
- `--wui-duration-trigger: 160ms`
- `--wui-duration-focus: 200ms`
- `--wui-duration-float-enter: 240ms`
- `--wui-duration-float-exit: 160ms`
- `--wui-duration-dialog-enter: 320ms`
- `--wui-duration-dialog-exit: 260ms`
- `--wui-duration-drawer-enter: 280ms`
- `--wui-duration-drawer-exit: 240ms`
- `--wui-duration-drawer-nested: 450ms`
- `--wui-duration-toast-enter: 280ms`
- `--wui-duration-toast-exit: 200ms`
- `--wui-duration-collapse-enter: 200ms`
- `--wui-duration-collapse-exit: 160ms`
- `--wui-duration-layout: 200ms`
- `--wui-duration-swipe-settle: 220ms` (image-preview carousel snap-back)
- `--wui-duration-spin: 600ms` (icon rotation)
- `--wui-duration-spinner: 800ms` (spinner blade chase)
- `--wui-theme-transition-duration: 500ms` (theme color reveal)

Easing tokens:

- `--wui-ease-enter`
- `--wui-ease-dialog` (`cubic-bezier(0.2, 0, 0, 1)`)
- `--wui-ease-slide`
- `--wui-ease-float` (`cubic-bezier(0.4, 0.38, 0.2, 1)`, a spring-fit curve with no overshoot, dedicated to anchored floating panels)
- `--wui-ease-swipe` (`cubic-bezier(0.32, 0.72, 0, 1)`, the decelerating finish of the carousel snap-back)
- `--wui-theme-transition-easing: ease-in`

The enter scale is `--wui-scale-enter: 0.9`, and floating panels and the image stage layer of image-preview expand from small to large. The dialog uses `--wui-dialog-scale-enter: 1.1`, entering shrinking from large to small, and exits in reverse.

Under `motion="reduced"` all transition durations go to zero, and the carousel snap-back goes with them. The two infinite loading loops only slow down and never stop (`--wui-duration-spin` / `--wui-duration-spinner`: `600ms` / `800ms` → `1600ms`). A frozen loading indicator looks like a hung interface.

Hover and active background feedback switches immediately with no transition animation. The selected state, press, and focus use timed transitions, which also go to zero under reduced motion.

### Color tokens

| Name                                  | Description                                                        | Light default                                                           | Dark default                                                                          |
| ------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `--wui-color-page`                    | Page background                                                    | `#fff`                                                                  | `#242428`                                                                             |
| `--wui-color-surface`                 | Regular surface                                                    | `#fff`                                                                  | `#2c2c2e`                                                                             |
| `--wui-color-surface-raised`          | Raised surface                                                     | `#f2f2f7`                                                               | `#2c2c2e`                                                                             |
| `--wui-color-surface-control`         | Neutral interactive control surface                                | `#e5e5eb`                                                               | `#3a3a3c`                                                                             |
| `--wui-color-surface-track`           | Slider/Switch track surface                                        | `#e5e5eb`                                                               | `#444446`                                                                             |
| `--wui-color-surface-menu`            | Menu and floating panel surface                                    | `rgb(250 250 253 / 0.76)`                                               | `rgb(49 49 53 / 0.74)`                                                                |
| `--wui-color-surface-glass`           | Liquid glass surface                                               | `rgb(250 250 253 / 0.34)`                                               | `rgb(44 44 46 / 0.42)`                                                                |
| `--wui-color-surface-glass-hover`     | Full glass hover background                                        | `color-mix(... text 6%, surface-glass)`                                 | `color-mix(... text 6%, surface-glass)`                                               |
| `--wui-color-surface-glass-active`    | Full glass pressed background                                      | `color-mix(... text 15%, surface-glass)`                                | `color-mix(... text 15%, surface-glass)`                                              |
| `--wui-color-surface-overlay`         | Translucent overlay surface                                        | `rgb(248 248 252 / 0.92)`                                               | `rgb(32 32 36 / 0.92)`                                                                |
| `--wui-color-surface-sidebar`         | Sidebar panel surface                                              | `rgb(233 233 239 / 0.82)`                                               | `rgb(44 44 46 / 0.8)`                                                                 |
| `--wui-color-surface-segmented`       | Segmented concave variant indicator surface (same step as control) | `#e5e5eb`                                                               | `#3a3a3c`                                                                             |
| `--wui-color-surface-segmented-track` | Segmented convex variant track surface                             | `#e5e5eb`                                                               | `#17171b`                                                                             |
| `--wui-color-surface-selected`        | Selected surface (convex variant indicator, same color as page)    | `#fff`                                                                  | `#242428`                                                                             |
| `--wui-color-text`                    | Primary text                                                       | `#1b1b20`                                                               | `#e9e9ed`                                                                             |
| `--wui-color-text-secondary`          | Secondary text                                                     | `#6a6a70`                                                               | `#a1a1a6`                                                                             |
| `--wui-color-text-tertiary`           | Tertiary text and low-emphasis icons                               | `color-mix(in srgb, var(--wui-color-text) 35%, transparent)`            | `color-mix(in srgb, var(--wui-color-text) 42%, transparent)`                          |
| `--wui-color-text-disabled`           | Disabled foreground text                                           | `color-mix(in srgb, var(--wui-color-text) 32%, transparent)`            | `color-mix(in srgb, var(--wui-color-text) 38%, transparent)`                          |
| `--wui-color-state-layer-hover`       | Transparent hover layer                                            | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`             | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`                           |
| `--wui-color-state-layer-active`      | Transparent pressed layer                                          | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)`            | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)`                          |
| `--wui-color-border`                  | Regular borders and dividers                                       | `rgb(0 0 0 / 0.1)`                                                      | `rgb(255 255 255 / 0.14)`                                                             |
| `--wui-color-glass-highlight`         | Surface inset highlight                                            | `rgb(255 255 255 / 0.9)`                                                | `rgb(255 255 255 / 0.1)`                                                              |
| `--wui-color-glass-ring`              | 1px stroke ring base color                                         | `rgb(0 0 0 / 0.05)`                                                     | `rgb(255 255 255 / 0.05)`                                                             |
| `--wui-color-glass-ring-sheen`        | Light sheen at the stroke ring corners                             | `rgb(255 255 255 / 0.5)`                                                | `rgb(255 255 255 / 0.2)`                                                              |
| `--wui-color-glass-ring-shade`        | Shaded falloff at the stroke ring corners                          | `rgb(0 0 0 / 0.03)`                                                     | `rgb(0 0 0 / 0.5)`                                                                    |
| `--wui-color-accent`                  | Accent and input focus border                                      | `#0071e3`                                                               | `#0a84ff`                                                                             |
| `--wui-color-on-accent`               | Foreground color on accent                                         | `#fff`                                                                  | `#fff`                                                                                |
| `--wui-color-on-danger`               | Foreground color on `danger` backgrounds                           | `#fff`                                                                  | `#000`                                                                                |
| `--wui-color-on-control`              | Foreground color inside controls                                   | `#fff`                                                                  | `#f2f2f7`                                                                             |
| `--wui-color-success`                 | Success                                                            | `#16a34a`                                                               | `#30d158`                                                                             |
| `--wui-color-warning`                 | Warning                                                            | `#d97706`                                                               | `#ff9f0a`                                                                             |
| `--wui-color-danger`                  | Danger                                                             | `#dc2626`                                                               | `#ff453a`                                                                             |
| `--wui-color-info`                    | Info                                                               | `#2563eb`                                                               | `#64d2ff`                                                                             |
| `--wui-color-backdrop`                | Modal backdrop                                                     | `rgb(0 0 0 / 0.12)`                                                     | `rgb(0 0 0 / 0.48)`                                                                   |
| `--wui-color-focus-ring`              | Focus indicator color, derived from accent                         | `color-mix(in srgb, var(--wui-color-accent, #0071e3) 40%, transparent)` | `color-mix(in srgb, var(--wui-color-accent, #0a84ff) 62%, var(--wui-color-text) 38%)` |
| `--wui-scrollbar-handle`              | Native scrollbar thumb colour                                      | `rgb(0 0 0 / 0.39)`                                                     | `rgb(255 255 255 / 0.5)`                                                              |

### Shadow tokens

| Name                   | Description                 | Light default                    | Dark default                    |
| ---------------------- | --------------------------- | -------------------------------- | ------------------------------- |
| `--wui-shadow-overlay` | Modal/Drawer shadow         | `2px 16px 40px rgb(0 0 0 / 0.4)` | `0 18px 48px rgb(0 0 0 / 0.48)` |
| `--wui-shadow-panel`   | Small floating panel shadow | `0 3px 9px rgb(0 0 0 / 0.27)`    | `0 4px 16px rgb(0 0 0 / 0.32)`  |
| `--wui-shadow-glass`   | Liquid glass base shadow    | Four-layer diffuse shadow        | `0 8px 24px rgb(0 0 0 / 0.08)`  |

### Glass effect notes

`--wui-glass-brightness` is `1.06` in light mode and `1.02` in dark mode.

`--wui-glass-corner-radius` defaults to `32px`. Non-pill glass surfaces override it with their own semantic radius (`--wui-radius-menu` / `--wui-radius-overlay`, and `--wui-drawer-radius` for the drawer), so the diagonal stroke light and shade follow the token override.

Pill controls are the exception: the light and shade gradient needs physical dimensions, so they keep using a finite radius derived from the control's actual size.

### Internal tokens

Variables prefixed with `--wui-internal-*` are not part of the public token API, and callers should not override them.
