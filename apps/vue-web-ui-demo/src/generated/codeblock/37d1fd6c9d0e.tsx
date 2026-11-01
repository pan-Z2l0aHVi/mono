import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        noBackdropClose
        heading="The backdrop will not close this"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="m-0">Clicking outside the card does nothing. Use the button below or Escape to close it.</p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          Close
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
