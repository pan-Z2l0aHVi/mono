import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState('-')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip
          content="Click to open, click again to close"
          trigger="click"
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary">Click tooltip</web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip content="Follows open only" trigger="manual" open={open}>
          <web-ui-button variant="secondary" onClick={() => setOpen(value => !value)}>
            Toggle open
          </web-ui-button>
        </web-ui-tooltip>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        Click tooltip last detail.open = {last} · writing open dispatches nothing
      </output>
    </div>
  )
}
