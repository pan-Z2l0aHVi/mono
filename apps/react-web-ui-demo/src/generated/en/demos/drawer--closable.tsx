import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [closable, setClosable] = useState(true)

  return (
    <>
      <div className="flex items-center gap-3">
        <web-ui-button onClick={() => setOpen(true)}>Open drawer</web-ui-button>
        <web-ui-checkbox checked={closable} onChange={event => setClosable(event.currentTarget.checked)}>
          Show close button
        </web-ui-checkbox>
      </div>

      <web-ui-drawer
        open={open}
        heading="Close button"
        closable={closable}
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>The close button is controlled by closable; after closing, you can check it again and reopen to compare.</p>
      </web-ui-drawer>
    </>
  )
}
