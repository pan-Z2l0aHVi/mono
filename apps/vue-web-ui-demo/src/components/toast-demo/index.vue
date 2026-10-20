<script setup lang="ts">
import { toast, type ToastPosition } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const position = ref<string>('top-right')

const positions = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom center' },
  { value: 'bottom-right', label: 'Bottom right' }
]

let idCounter = 0
let countdownIdCounter = 0
const countdownTimers = new Map<string, ReturnType<typeof setInterval>>()

const handleShowSuccess = () => {
  toast.success('Changes saved to the cloud', { heading: 'Saved' })
}

const handleShowInfo = () => {
  toast.info('v2.1.0 is available', { heading: 'Update available' })
}

const handleShowWarning = () => {
  toast.warning('Less than 10% disk space left', { heading: 'Storage' })
}

const handleError = () => {
  toast.error('Connection lost, retrying automatically', { heading: 'Connection failed', duration: 5000 })
}

const handleWithoutHeading = () => {
  toast.success('Done!')
}

const handleWithId = () => {
  idCounter++
  const id = `demo-${idCounter}`
  toast.success(`已创建 toast #${idCounter}`, { heading: 'Task done', id })
}

const handleCloseById = () => {
  if (idCounter > 0) {
    toast.close(`demo-${idCounter}`)
  }
}

const handleCloseAll = () => {
  toast.clear()
  idCounter = 0
  for (const timer of countdownTimers.values()) clearInterval(timer)
  countdownTimers.clear()
  countdownIdCounter = 0
}

const handleNotClosable = () => {
  toast.info('This toast closes automatically after 5 seconds', {
    heading: 'Auto close',
    closable: false,
    duration: 5000
  })
}

const handleLongMessage = () => {
  toast.warning(
    'A very long message that verifies wrapping and clamping. When the text exceeds the max width it wraps and shows at most three lines.',
    { heading: 'Long text toast', closable: true }
  )
}

const handlePositionWith = (pos: string) => {
  position.value = pos
  toast.success('Toasts from different positions', {
    heading: pos,
    position: pos as ToastPosition
  })
}

const handleCustomDuration = () => {
  toast.info('This message disappears after 1 second', { heading: 'Quick toast', duration: 1000 })
}

const handleCountdownUpdate = () => {
  let remaining = 10
  const id = `countdown-${++countdownIdCounter}`
  toast.info(`将在 ${remaining} 秒后自动关闭`, {
    heading: 'Countdown update',
    id,
    closable: false,
    duration: remaining * 1000
  })

  const timer = setInterval(() => {
    remaining--
    if (remaining === 0) {
      clearInterval(timer)
      countdownTimers.delete(id)
      return
    }
    toast.info(`将在 ${remaining} 秒后自动关闭`, { id })
  }, 1000)
  countdownTimers.set(id, timer)
}

const handleMany = () => {
  for (let i = 0; i < 7; i++) {
    toast.info(`队列中的第 ${i + 1} 条消息`, { heading: `队列 #${i + 1}`, id: `many-${i}` })
  }
}

onBeforeUnmount(() => {
  for (const timer of countdownTimers.values()) {
    clearInterval(timer)
  }
  countdownTimers.clear()
})
</script>

<template>
  <div>
    <h1>Toast</h1>

    <h2>Basic types</h2>
    <p class="mb-3 text-sm text-gray-500">Supports a heading and a heading-less mode</p>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="handleShowSuccess">Success</web-ui-button>
      <web-ui-button @click="handleShowInfo">Info</web-ui-button>
      <web-ui-button @click="handleShowWarning">Warning</web-ui-button>
      <web-ui-button @click="handleError">Error</web-ui-button>
      <web-ui-button @click="handleWithoutHeading">No heading</web-ui-button>
    </div>

    <h2>Custom duration</h2>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="handleCustomDuration">Closes after 1 second</web-ui-button>
      <web-ui-button variant="secondary" @click="handleCountdownUpdate"
        >Countdown update after 10 seconds</web-ui-button
      >
    </div>

    <h2>Cannot be closed manually</h2>
    <div class="mb-6">
      <web-ui-button @click="handleNotClosable">Not closable (5s)</web-ui-button>
    </div>

    <h2>Long text</h2>
    <div class="mb-6">
      <web-ui-button @click="handleLongMessage">Long text toast</web-ui-button>
    </div>

    <h2>Different positions</h2>
    <div class="mb-6 flex flex-wrap items-center gap-2">
      <web-ui-button v-for="p in positions" :key="p.value" variant="secondary" @click="handlePositionWith(p.value)">
        {{ p.label }}
      </web-ui-button>
    </div>

    <h2>ID management</h2>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="handleWithId">Create a toast with an ID</web-ui-button>
      <web-ui-button variant="secondary" @click="handleCloseById">Close the last one</web-ui-button>
    </div>

    <h2>Close in bulk</h2>
    <div class="mb-6 flex flex-wrap gap-2">
      <web-ui-button @click="handleMany">Create 7 toasts (queue test)</web-ui-button>
      <web-ui-button variant="secondary" @click="handleCloseAll">Close all</web-ui-button>
    </div>
  </div>
</template>
