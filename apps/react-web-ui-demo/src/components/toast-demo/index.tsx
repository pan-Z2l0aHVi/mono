import { toast, type ToastPosition } from '@greypan/web-ui'
import { useRef, useEffect } from 'react'

function ToastDemo() {
  const idCounter = useRef(0)
  const countdownIdCounter = useRef(0)
  const countdownTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    const timers = countdownTimers.current
    return () => {
      for (const timer of timers.values()) clearInterval(timer)
      timers.clear()
    }
  }, [])

  const handleShowSuccess = () => toast.success('Changes saved to the cloud', { heading: 'Saved' })
  const handleShowInfo = () => toast.info('v2.1.0 is available', { heading: 'Update available' })
  const handleShowWarning = () => toast.warning('Less than 10% disk space left', { heading: 'Storage' })
  const handleError = () =>
    toast.error('Connection lost, retrying automatically', { heading: 'Connection failed', duration: 5000 })
  const handleWithoutHeading = () => toast.success('Done!')
  const handleCustomDuration = () =>
    toast.info('This message disappears after 1 second', { heading: 'Quick toast', duration: 1000 })

  const handleWithId = () => {
    idCounter.current++
    toast.success(`已创建 toast #${idCounter.current}`, { heading: 'Task done', id: `demo-${idCounter.current}` })
  }

  const handleCloseById = () => {
    if (idCounter.current > 0) toast.close(`demo-${idCounter.current}`)
  }

  const handleCloseAll = () => {
    toast.clear()
    idCounter.current = 0
    for (const timer of countdownTimers.current.values()) clearInterval(timer)
    countdownTimers.current.clear()
    countdownIdCounter.current = 0
  }
  const handleNotClosable = () =>
    toast.info('This toast closes automatically after 5 seconds', {
      heading: 'Auto close',
      closable: false,
      duration: 5000
    })

  const handleLongMessage = () =>
    toast.warning(
      'A very long message that verifies wrapping and clamping. When the text exceeds the max width it wraps and shows at most three lines.',
      { heading: 'Long text toast', closable: true }
    )

  const handlePositionWith = (pos: string) =>
    toast.success('Toasts from different positions', { heading: pos, position: pos as ToastPosition })

  const handleCountdownUpdate = () => {
    let remaining = 10
    const id = `countdown-${++countdownIdCounter.current}`
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
        countdownTimers.current.delete(id)
        return
      }
      toast.info(`将在 ${remaining} 秒后自动关闭`, { id })
    }, 1000)
    countdownTimers.current.set(id, timer)
  }

  const handleMany = () => {
    for (let i = 0; i < 7; i++) toast.info(`队列中的第 ${i + 1} 条消息`, { heading: `队列 #${i + 1}`, id: `many-${i}` })
  }

  const positions = [
    { value: 'top-left', label: 'Top left' },
    { value: 'top-center', label: 'Top center' },
    { value: 'top-right', label: 'Top right' },
    { value: 'bottom-left', label: 'Bottom left' },
    { value: 'bottom-center', label: 'Bottom center' },
    { value: 'bottom-right', label: 'Bottom right' }
  ]

  return (
    <div>
      <h1>Toast</h1>

      <h2>Basic types</h2>
      <p className="mb-3 text-sm text-gray-500">Supports a heading and a heading-less mode</p>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={handleShowSuccess}>Success</web-ui-button>
        <web-ui-button onClick={handleShowInfo}>Info</web-ui-button>
        <web-ui-button onClick={handleShowWarning}>Warning</web-ui-button>
        <web-ui-button onClick={handleError}>Error</web-ui-button>
        <web-ui-button onClick={handleWithoutHeading}>No heading</web-ui-button>
      </div>

      <h2>Custom duration</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={handleCustomDuration}>Closes after 1 second</web-ui-button>
        <web-ui-button variant="secondary" onClick={handleCountdownUpdate}>
          Countdown update after 10 seconds
        </web-ui-button>
      </div>

      <h2>Cannot be closed manually</h2>
      <div className="mb-6">
        <web-ui-button onClick={handleNotClosable}>Not closable (5s)</web-ui-button>
      </div>

      <h2>Long text</h2>
      <div className="mb-6">
        <web-ui-button onClick={handleLongMessage}>Long text toast</web-ui-button>
      </div>

      <h2>Different positions</h2>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {positions.map(p => (
          <web-ui-button key={p.value} variant="secondary" onClick={() => handlePositionWith(p.value)}>
            {p.label}
          </web-ui-button>
        ))}
      </div>

      <h2>ID management</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={handleWithId}>Create a toast with an ID</web-ui-button>
        <web-ui-button variant="secondary" onClick={handleCloseById}>
          Close the last one
        </web-ui-button>
      </div>

      <h2>Close in bulk</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <web-ui-button onClick={handleMany}>Create 7 toasts (queue test)</web-ui-button>
        <web-ui-button variant="secondary" onClick={handleCloseAll}>
          Close all
        </web-ui-button>
      </div>
    </div>
  )
}
export default ToastDemo
