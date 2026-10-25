import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open dialog</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {changes} times · last detail.open = {last}
      </output>
      <web-ui-dialog
        open={open}
        heading="Confirm action"
        closable
        onopen-change={event => {
          setChanges(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
          setOpen(event.detail.open)
        }}
      >
        <p className="m-0">This cannot be undone. Continue anyway?</p>
        <web-ui-button slot="footer" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </web-ui-button>
        <web-ui-button slot="footer" variant="danger" onClick={() => setOpen(false)}>
          Delete
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
