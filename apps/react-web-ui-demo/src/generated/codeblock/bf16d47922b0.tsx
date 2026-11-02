import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        footerOrientation="horizontal"
        heading="Save this message?"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="m-0">
          This message has not been sent and contains unsaved changes. Save it as a draft to work on later.
        </p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          Discard
        </web-ui-button>
        <web-ui-button slot="footer" full variant="primary" onClick={() => setOpen(false)}>
          Save draft
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
