import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        closable
        heading="Close button only"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="m-0">This dialog has no footer. Close it with the top-right button, Escape, or the backdrop.</p>
      </web-ui-dialog>
    </div>
  )
}
