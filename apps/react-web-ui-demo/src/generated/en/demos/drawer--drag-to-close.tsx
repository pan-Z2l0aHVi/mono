import { useState } from 'react'

export default function Demo() {
  const [rightOpen, setRightOpen] = useState(false)
  const [bottomOpen, setBottomOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <web-ui-button onClick={() => setRightOpen(true)}>Drag-close on the right</web-ui-button>
        <web-ui-button onClick={() => setBottomOpen(true)}>Drag-close at the bottom</web-ui-button>
      </div>

      <web-ui-drawer
        open={rightOpen}
        draggable
        heading="Drag right to close"
        onopen-change={event => setRightOpen(event.detail.open)}
      >
        <p>Hold the gray pill on the left edge and drag it more than half way to the right, or fling it, to close.</p>
      </web-ui-drawer>

      <web-ui-drawer
        open={bottomOpen}
        placement="bottom"
        draggable
        heading="Drag down to close"
        onopen-change={event => setBottomOpen(event.detail.open)}
      >
        <p>Hold the gray pill on the top edge and drag it more than half way down, or fling it, to close.</p>
      </web-ui-drawer>
    </>
  )
}
