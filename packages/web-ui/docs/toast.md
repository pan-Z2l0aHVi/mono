# Toast

An imperative toast. Call `toast()` to create one and get its id, then `toast.close(id)` to close it. Calling again with the same `id` updates that toast and does not create a new one. The tables below list the options of `toast()`, the imperative entry points, and the attributes, events, and methods of the `<web-ui-toast>` element itself.

## Samples

### Shortcuts

`toast.success` / `info` / `warning` / `error` are shorthands for `toast()` plus `type`. Each call returns the final id of that toast. `error` defaults to a duration of `5000`, longer than the `3000` of the other types.

All four appear in the default `top-right` position.

```tsx
import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  useEffect(() => () => toast.clear(), [])

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={() => setLast(toast.success('Operation succeeded'))}>success</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.info('Informational message'))}>info</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.warning('Please note'))}>warning</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.error('Something went wrong'))}>error</web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">Last created id: {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="showSuccess">success</web-ui-button>
      <web-ui-button @click="showInfo">info</web-ui-button>
      <web-ui-button @click="showWarning">warning</web-ui-button>
      <web-ui-button @click="showError">error</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">Last created id: {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const last = ref('—')

function showSuccess() {
  last.value = toast.success('Operation succeeded')
}

function showInfo() {
  last.value = toast.info('Informational message')
}

function showWarning() {
  last.value = toast.warning('Please note')
}

function showError() {
  last.value = toast.error('Something went wrong')
}

onBeforeUnmount(() => toast.clear())
</script>
```

### Full options

`toast()` accepts the full set of options: `heading` is the bold title, `message` is the body, `position` decides where on screen it appears (here `top-center`), `duration` is the auto-close time in milliseconds, and `closable` controls whether a close button is rendered.

```tsx
import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

export default function Demo() {
  const [id, setId] = useState('—')

  useEffect(() => () => toast.clear(), [])

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button
        onClick={() => {
          setId(
            toast({
              heading: 'Saved',
              message: 'Changes written to the cloud',
              type: 'info',
              position: 'top-center',
              duration: 4000,
              closable: true
            })
          )
        }}
      >
        Create a toast with full options
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        id: {id} · position: top-center · closes automatically after 4 seconds
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="notify">Create a toast with full options</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      id: {{ id }} · position: top-center · closes automatically after 4 seconds
    </output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const id = ref('—')

function notify() {
  id.value = toast({
    heading: 'Saved',
    message: 'Changes written to the cloud',
    type: 'info',
    position: 'top-center',
    duration: 4000,
    closable: true
  })
}

onBeforeUnmount(() => toast.clear())
</script>
```

### Merging into one toast

A subsequent call with the same `id` updates that toast and does not add a new one. Omitting `duration` leaves the countdown alone, and only an explicit value restarts it. `duration: 0` keeps that toast from auto-closing.

```tsx
import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

const UPLOAD_ID = 'demo-upload'

export default function Demo() {
  const [step, setStep] = useState('Not started yet')

  useEffect(() => () => toast.clear(), [])

  function start() {
    setStep('0%')
    toast.info('Uploading 0%', { id: UPLOAD_ID, duration: 0 })
  }

  function progress() {
    setStep('60%')
    toast.info('Uploading 60%', { id: UPLOAD_ID })
  }

  function finish() {
    setStep('Done')
    toast.success('Upload complete', { id: UPLOAD_ID, duration: 3000 })
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={start}>Start upload</web-ui-button>
        <web-ui-button onClick={progress}>Progress 60%</web-ui-button>
        <web-ui-button onClick={finish}>Done</web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        id: {UPLOAD_ID} · current: {step}
      </output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="start">Start upload</web-ui-button>
      <web-ui-button @click="progress">Progress 60%</web-ui-button>
      <web-ui-button @click="finish">Done</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">id: {{ UPLOAD_ID }} · current: {{ step }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const UPLOAD_ID = 'demo-upload'
const step = ref('Not started yet')

function start() {
  step.value = '0%'
  toast.info('Uploading 0%', { id: UPLOAD_ID, duration: 0 })
}

function progress() {
  step.value = '60%'
  toast.info('Uploading 60%', { id: UPLOAD_ID })
}

function finish() {
  step.value = 'Done'
  toast.success('Upload complete', { id: UPLOAD_ID, duration: 3000 })
}

onBeforeUnmount(() => toast.clear())
</script>
```

### Closing

Every call returns the final id. `toast.close(id)` closes the given toast, and `toast.clear()` closes all current ones. Both also work on a toast created with `duration: 0` that never auto-closes.

```tsx
import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

const DEMO_ID = 'demo-close'

export default function Demo() {
  const [last, setLast] = useState('—')

  useEffect(() => () => toast.clear(), [])

  function create() {
    setLast(`Created ${toast.info('This toast does not close automatically', { id: DEMO_ID, duration: 0 })}`)
  }

  function closeOne() {
    toast.close(DEMO_ID)
    setLast(`toast.close(${DEMO_ID})`)
  }

  function clearAll() {
    toast.clear()
    setLast('toast.clear()')
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={create}>Create one</web-ui-button>
        <web-ui-button variant="secondary" onClick={closeOne}>
          Close this one
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={clearAll}>
          Clear all
        </web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">Last action: {last}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="create">Create one</web-ui-button>
      <web-ui-button variant="secondary" @click="closeOne">Close this one</web-ui-button>
      <web-ui-button variant="secondary" @click="clearAll">Clear all</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">Last action: {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const DEMO_ID = 'demo-close'
const last = ref('—')

function create() {
  last.value = `Created ${toast.info('This toast does not close automatically', { id: DEMO_ID, duration: 0 })}`
}

function closeOne() {
  toast.close(DEMO_ID)
  last.value = `toast.close(${DEMO_ID})`
}

function clearAll() {
  toast.clear()
  last.value = 'toast.clear()'
}

onBeforeUnmount(() => toast.clear())
</script>
```

## API

### Options

| Name        | Description                                                              | Type            | Default        |
| ----------- | ------------------------------------------------------------------------ | --------------- | -------------- |
| `message`   | Notification text.                                                       | `string`        | —              |
| `type`      | Type: `success`, `info`, `warning`, `error`.                             | `ToastType`     | `'info'`       |
| `duration`  | Auto-close time (ms); 0 means no auto-close; `error` defaults to `5000`. | `number`        | `3000`         |
| `closable`  | Shows the close button.                                                  | `boolean`       | `true`         |
| `id`        | Merge key: another call with the same `id` updates that toast.           | `string`        | Auto-generated |
| `heading`   | Bold title.                                                              | `string`        | `''`           |
| `position`  | Screen position.                                                         | `ToastPosition` | `'top-right'`  |
| `target`    | Used to find the nearest theme overlay container.                        | `Element`       | —              |
| `container` | Explicit mount container (highest precedence).                           | `HTMLElement`   | —              |

### Methods

| Name                               | Description                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `toast(options)`                   | Creates or updates a toast and returns the final id of that toast.                            |
| `toast.success(message, options?)` | Creates a toast of type `success`.                                                            |
| `toast.info(message, options?)`    | Creates a toast of type `info`.                                                               |
| `toast.warning(message, options?)` | Creates a toast of type `warning`.                                                            |
| `toast.error(message, options?)`   | Creates a toast of type `error`; its default duration is `5000`, longer than the other types. |
| `toast.close(id)`                  | Closes the toast with the given id in every phase it appears in.                              |
| `toast.clear()`                    | Closes all current toasts at once.                                                            |

### Behavior

The imperative entry has no other required step. `toast()` mounts the toast into the nearest theme overlay container itself, falling back to the global default container when there is no theme scope. `target` resolves the nearest theme scope. `container` specifies the mount container explicitly and takes precedence over the theme scope.

Toasts that are still unmounted within the same tick can still be rewritten by a call with the same `id`, producing only one toast.

Hovering pauses the auto-close timer. After the pointer leaves, the timer resumes the remaining time instead of restarting the full count.

If `pointerleave` is missed during the pause (the pointer is dragged out of the window, or the element is moved or removed while hovered), the timer recovers as well, so the toast never stays on screen forever.

```ts
import { toast } from '@greypan/web-ui'

// Create
toast.success('Operation succeeded')
toast.error('Something went wrong', { duration: 5000 })
toast.info('Informational message')
toast.warning('Please note')

// With options
const id = toast({ message: 'Custom', type: 'info', position: 'bottom-right', duration: 4000, closable: true })

// Close
toast.close(id)
toast.clear()

// upsert: another call with the same id updates that toast instead of creating another
toast.error('Network connection lost, retrying…', { id: 'network' })
toast.error('Network connection lost (retry 2)', { id: 'network' })

// The full lifecycle of one toast
toast.info('Uploading 0%', { id: 'upload', duration: 0 })
toast.info('Uploading 60%', { id: 'upload' }) // duration omitted, the timer stays put
toast.success('Upload complete', { id: 'upload', duration: 3000 }) // type changed, countdown restarts
```

Every call returns the final id of that toast, so callers do not need to distinguish creation from update.

### upsert semantics

The result of calling again with the same `id`. Each item below lists the target state and the result:

- Mounted / returns the same id; the given fields are overwritten and the rest keep their values
- Still unmounted within the same tick / merged into that pending toast and takes effect once mounted, without producing a second one
- Closed or leaving / a new toast is created; the one that is leaving plays out its own exit animation

`duration` restarts the countdown only when it is passed explicitly (the exception is an active hover pause: the new value only takes effect after the pointer leaves); `message`, `heading`, and `type` do not touch the timer.

The `5000` default of `toast.error` is applied at creation time as a fallback and does not count as explicit, so repeated `toast.error(msg, { id })` calls do not reset the countdown.

A change of `position` moves the toast to the new position and preserves the remaining time. If the countdown has already expired, the toast exits directly instead of staying on screen.

`container` and `target` are fixed on the first call; moving an existing toast to another overlay container is not supported.

### Close semantics

`toast.close(id)` covers every phase a toast can be in, including the two where it is not shown yet. Each item below lists the target state and the result:

- Shown / plays the exit animation and dispatches `toast-close` afterwards
- Mounted but not shown yet / `toast-close` is dispatched immediately
- Still unmounted within the same tick / it never appears and no event is dispatched
- Already leaving / no-op; that toast plays out its own exit

`toast.clear()` follows the same rules: queued entries are cancelled as well, and everything mounted is closed.

### Props

| Name              | Description                                                                       | Type            | Default       |
| ----------------- | --------------------------------------------------------------------------------- | --------------- | ------------- |
| `type`            | Type: `success`, `info`, `warning`, `error`.                                      | `ToastType`     | `'info'`      |
| `position`        | Screen position.                                                                  | `ToastPosition` | `'top-right'` |
| `heading`         | Bold title.                                                                       | `string`        | `''`          |
| `message`         | Notification text.                                                                | `string`        | `''`          |
| `duration`        | Auto-close time (ms); 0 means no auto-close; for `error` it falls back to `5000`. | `number`        | `3000`        |
| `no-close-button` | Hides the close button.                                                           | `boolean`       | `false`       |
| `visible`         | Whether it is visible.                                                            | `boolean`       | `false`       |
| `toastId`         | Merge key; set only through the property, written by `toast()`.                   | `string`        | `''`          |

### Events

| Name          | Description                                                              |
| ------------- | ------------------------------------------------------------------------ |
| `toast-close` | Dispatched after the exit finishes; `detail` contains `id` and `reason`. |

### Element properties and methods

Under the imperative entry, `toast()` writes these attributes of `<web-ui-toast>`: the merge key is written to `toastId` (which is set only through the property), and the others correspond one-to-one with the Props table above.

The element also exposes a set of instance methods: `show()` plays the entrance (sets `visible` to true) and starts the timer when `duration` is greater than 0.

`dismiss(reason?)` closes the toast and dispatches `toast-close`; when shown it plays the exit animation first, otherwise it dispatches immediately, and `reason` takes a `ToastCloseReason`, defaulting to `'programmatic'`.

`setDuration(ms)` updates `duration` and re-schedules the timer with the new value; an `ms` of 0 means no more auto-close.

`pauseAutoClose()` records the remaining time and pauses the timer, and is used as a pair with `resumeAutoClose()`.

`startAutoClose()` re-schedules the auto-close timer according to the current `duration`.

### CSS Custom Properties

| Name                            | Description                                                                                                        | Default |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------- |
| `--wui-toast-viewport-gap`      | Visible distance from the toast to the viewport edge                                                               | `16px`  |
| `--wui-toast-container-padding` | Clearance reserved in the container for the soft drop shadow to paint                                              | `40px`  |
| `--wui-toast-top-offset`        | Extra top offset for top-positioned toast containers, used to clear a fixed header; only affects `top-*` positions | `0px`   |
