import { useState } from 'react'

export default function Demo() {
  const [rightOpen, setRightOpen] = useState(false)
  const [bottomOpen, setBottomOpen] = useState(false)
  const [fullOpen, setFullOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <web-ui-button onClick={() => setRightOpen(true)}>Drag-close on the right</web-ui-button>
        <web-ui-button onClick={() => setBottomOpen(true)}>Drag-close at the bottom</web-ui-button>
        <web-ui-button onClick={() => setFullOpen(true)}>Drag-to-full on the right</web-ui-button>
      </div>

      <web-ui-drawer
        open={rightOpen}
        draggable
        heading="Drag right to close"
        onopen-change={event => setRightOpen(event.detail.open)}
      >
        <p>Hold the gray pill on the left edge and drag it past the threshold to the right, or fling it, to close.</p>
      </web-ui-drawer>

      <web-ui-drawer
        open={bottomOpen}
        placement="bottom"
        draggable
        heading="Drag down to close"
        onopen-change={event => setBottomOpen(event.detail.open)}
      >
        <p>Hold the gray pill on the top edge and drag it past the threshold downward, or fling it, to close.</p>
      </web-ui-drawer>

      <web-ui-drawer
        open={fullOpen}
        draggable
        fullable
        heading="Drag right to go full"
        onopen-change={event => setFullOpen(event.detail.open)}
      >
        <p>
          Hold the gray pill on the left edge and drag it outward (to the left) past the travel threshold to snap full;
          pulling back past the restore threshold restores the original size and commits that gesture to leaving full.
          Release leaves it there; start another drag past the close threshold, or flick inward, to close.
        </p>
      </web-ui-drawer>
    </>
  )
}
