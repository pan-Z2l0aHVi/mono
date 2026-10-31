---
component: toast
tag: web-ui-toast
---

Imperative toast: call `toast()` to create one and get its id, then `toast.close(id)` to close it; calling again with the same `id` updates that toast instead of creating a new one. The tables below list the options of `toast()`, the imperative entry points, and the attributes, events, and methods of the `<web-ui-toast>` element itself.

## Samples

### Shortcuts

`toast.success` / `info` / `warning` / `error` are shorthands for `toast()` plus `type`, and each call returns the final id of that toast; `error` defaults to a duration of `5000`, longer than the `3000` of the other types.

All four land in the default `top-right`.

The sample calls `toast.clear()` on unmount so leftover toasts do not affect other samples on the page.

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

`toast()` accepts the full set of options: `heading` is the bold title, `message` is the body, `position` decides which corner container it lands in (here `bottom-right`), `duration` is the auto-close time in milliseconds, and `closable` controls whether a close button is rendered. The returned id is written into the readout.

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

A subsequent call with the same `id` updates that toast and does not add a new one. The first step passes an explicit `duration: 0` and does not auto-close; the next two steps pass no `duration`, so the countdown stays put; only the last step passes an explicit `3000` and restarts it.

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

Every call returns the final id; `toast.close(id)` closes the given toast and `toast.clear()` takes away all current ones. Here a toast with `duration: 0` that never auto-closes is created first, then closed in both ways, and `<output>` records the last action.

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
| `target`    | Used to find the nearest theme-owned overlay root.                       | `Element`       | —              |
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

There is no other mandatory step beneath the imperative entry: `toast()` mounts the toast element into the nearest theme-owned overlay root itself (falling back to the global fallback root when there is no theme scope), `target` is used to resolve the nearest theme scope, and `container` explicitly specifies the mount container and takes precedence over the theme scope.

Multiple toasts in the same microtask are queued first and mounted at once, so pending entries can still be rewritten by a call with the same id before they land.

Hovering pauses the auto-close timer (through `pointerenter`/`pointerleave`), and after the pointer leaves it **resumes the remaining time** instead of restarting the full count.

If `pointerleave` is missed during the pause (the pointer is dragged out of the window, or the element is moved or removed while hovered), document-level `pointerover`/`pointerout`/`pointerleave` recover it, so it never stays on screen forever.

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

// One toast through its whole lifecycle
toast.info('Uploading 0%', { id: 'upload', duration: 0 })
toast.info('Uploading 60%', { id: 'upload' }) // duration omitted, the timer stays put
toast.success('Upload complete', { id: 'upload', duration: 3000 }) // type changed, countdown restarts
```

Every call returns the final id of that toast, so callers do not need to distinguish creation from update.

### upsert semantics

The result of calling again with the same `id`:

The columns are target state / result in order:

- Mounted / returns the same id; the given fields are overwritten and the rest keep their values
- Still pending in the same tick / the pending options are patched and take effect after mounting, without producing a second toast
- Closed or leaving / a new toast is created; the one that is leaving plays out its own exit animation

`duration` restarts the countdown only when it is passed explicitly (the exception is an active hover pause: the new value is recorded but not started, and the pointer leaving counts the full new duration); `message`, `heading`, and `type` are ordinary attributes and do not touch the timer.

The `5000` default of `toast.error` is applied **at creation time** and does not count as explicit, so repeated `toast.error(msg, { id })` calls do not reset the countdown.

A change of `position` moves the element to the new container and preserves the remaining time (engines supporting `moveBefore` move it directly, others fall back to pause/resume); if the countdown already expired while the main thread was busy, the fallback path exits directly on resume instead of keeping it hanging.

`container` and `target` are fixed on the first call; moving an existing toast to another overlay root is not supported.

### Close semantics

`toast.close(id)` covers every phase a toast can be in, including the two where it is not shown yet:

The columns are target state / result in order:

- Shown / plays the exit animation and dispatches `toast-close` afterwards
- Mounted, `show()` not run / there is no exit animation to play, so `toast-close` is dispatched immediately
- Still pending in the same tick / dequeued before mounting: it never appears and no event is dispatched
- Already leaving / no-op; that toast plays out its own exit

`toast.clear()` follows the same rules: queued entries are cancelled as well, and everything mounted is closed.

### Props

| Name              | Description                                                                                | Type            | Default       |
| ----------------- | ------------------------------------------------------------------------------------------ | --------------- | ------------- |
| `type`            | Type: `success`, `info`, `warning`, `error`.                                               | `ToastType`     | `'info'`      |
| `position`        | Screen position.                                                                           | `ToastPosition` | `'top-right'` |
| `heading`         | Bold title.                                                                                | `string`        | `''`          |
| `message`         | Notification text.                                                                         | `string`        | `''`          |
| `duration`        | Auto-close time (ms); 0 means no auto-close; for `error` the manager falls back to `5000`. | `number`        | `3000`        |
| `no-close-button` | Hides the close button.                                                                    | `boolean`       | `false`       |
| `visible`         | Whether it is visible.                                                                     | `boolean`       | `false`       |
| `toastId`         | Merge key; exists as a property only (`attribute: false`), written by the manager.         | `string`        | `''`          |

### Events

| Name          | Description                                                              |
| ------------- | ------------------------------------------------------------------------ |
| `toast-close` | Dispatched after the exit finishes; `detail` contains `id` and `reason`. |

### Element properties and methods

Under the imperative entry, the attributes of `<web-ui-toast>` are written by the manager: the merge key lands on `toastId` (it exists as a property only, `attribute: false`), and the other attributes correspond one-to-one with the Props table above.

The element also exposes a set of instance methods: `show()` plays the entrance (sets `visible` to true) and starts the timer when `duration` is greater than 0.

`dismiss(reason?)` closes the toast and dispatches `toast-close`; when shown it plays the exit animation first, otherwise it dispatches immediately, and `reason` takes a `ToastCloseReason`, defaulting to `'programmatic'`.

`setDuration(ms)` updates `duration` and re-schedules the timer with the new value; an `ms` of 0 means no more auto-close.

`pauseAutoClose()` records the remaining time and stops the clock, and works as a pair with `resumeAutoClose()`.

`startAutoClose()` re-schedules the auto-close timer according to the current `duration`.

### CSS Custom Properties

| Name                            | Description                                                                                                          | Default |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| `--wui-toast-viewport-gap`      | Visible distance from the toast to the viewport edge                                                                 | `16px`  |
| `--wui-toast-container-padding` | Room reserved in the container for the diffuse shadow to paint                                                       | `40px`  |
| `--wui-toast-top-offset`        | Extra top offset for top-positioned toast containers, used to clear fixed app chrome; only affects `top-*` positions | `0px`   |
