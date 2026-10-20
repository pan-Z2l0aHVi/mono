import type { WebUiButton } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

function PopoverDemo() {
  const [controlledOpen, setControlledOpen] = useState(false)
  const closeBtnRef = useRef<WebUiButton>(null)

  useEffect(() => {
    const btn = closeBtnRef.current
    if (!btn) return
    const handler = () => setControlledOpen(false)
    btn.addEventListener('click', handler)
    return () => btn.removeEventListener('click', handler)
  }, [])

  return (
    <div>
      <h1>Popover popover</h1>
      <h2>Click trigger</h2>
      <div className="mb-3">
        <web-ui-popover placement="bottom">
          <web-ui-button slot="trigger">Click me</web-ui-button>
          <div className="p-1">
            <p>This is a popover panel.</p>
            <p>It can hold any interactive content.</p>
          </div>
        </web-ui-popover>
      </div>
      <h2>Hover trigger</h2>
      <div className="mb-3">
        <web-ui-popover trigger="hover" placement="top">
          <web-ui-button slot="trigger">Hover me</web-ui-button>
          <div className="p-1">Hover-triggered popover</div>
        </web-ui-popover>
      </div>
      <h2>Portal</h2>
      <div className="mb-3">
        <web-ui-popover portal placement="bottom">
          <web-ui-button slot="trigger">Portal</web-ui-button>
          <div className="p-1">Portal content</div>
        </web-ui-popover>
      </div>
      <h2>Manual trigger (controlled)</h2>
      <div className="mb-3">
        <web-ui-popover
          trigger="manual"
          open={controlledOpen}
          onopen-change={event => setControlledOpen(event.detail.open)}
        >
          <web-ui-button slot="trigger">Manual</web-ui-button>
          <div className="p-1">
            <p>Controlled mode: the outside drives the switch.</p>
            <web-ui-button ref={closeBtnRef} variant="secondary" full>
              Close
            </web-ui-button>
          </div>
        </web-ui-popover>
      </div>
      <h2>Different positions</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-popover placement="top">
          <web-ui-button slot="trigger">Top</web-ui-button>
          <div className="p-1">Top</div>
        </web-ui-popover>
        <web-ui-popover placement="right">
          <web-ui-button slot="trigger">Right</web-ui-button>
          <div className="p-1">Right</div>
        </web-ui-popover>
        <web-ui-popover placement="bottom">
          <web-ui-button slot="trigger">Bottom</web-ui-button>
          <div className="p-1">Bottom</div>
        </web-ui-popover>
        <web-ui-popover placement="left">
          <web-ui-button slot="trigger">Left</web-ui-button>
          <div className="p-1">Left</div>
        </web-ui-popover>
      </div>
    </div>
  )
}
export default PopoverDemo
