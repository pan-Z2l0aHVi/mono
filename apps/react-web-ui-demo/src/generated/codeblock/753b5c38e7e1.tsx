import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState(0)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        controlled
        heading="Unsaved changes"
        onopen-change={event => {
          if (!event.detail.open) setRequests(count => count + 1)
        }}
      >
        <p className="m-0">Escape and the backdrop only request closing; without write-back it stays open.</p>
        <output className="block text-sm text-(--wui-color-text-secondary)">Close requests blocked: {requests}</output>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          Discard changes
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
