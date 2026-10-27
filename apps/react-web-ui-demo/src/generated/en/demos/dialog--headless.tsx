import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>Open image details</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">headless dialog: {open ? 'open' : 'closed'}</output>
      <web-ui-dialog
        open={open}
        headless
        aria-dialog-label="Image details"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-base font-semibold">Morning in the mountains</h2>
              <span className="text-xs text-(--wui-color-text-secondary)">3840 × 2160 · JPEG</span>
            </div>
            <web-ui-button variant="secondary" onClick={() => setOpen(false)}>
              Close
            </web-ui-button>
          </div>
          <div className="flex h-32 items-center justify-center rounded-lg bg-(--wui-color-surface-glass) text-sm text-(--wui-color-text-secondary)">
            Preview area drawn by the page
          </div>
          <web-ui-button variant="primary" onClick={() => setOpen(false)}>
            Done
          </web-ui-button>
        </div>
      </web-ui-dialog>
    </div>
  )
}
