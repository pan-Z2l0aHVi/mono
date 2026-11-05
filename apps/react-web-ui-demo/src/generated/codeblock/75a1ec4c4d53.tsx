import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('-')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-popover trigger="focus" onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            Keyboard focus
          </web-ui-button>
          <div className="max-w-xs text-sm">
            Opens when Tab reaches this button and closes once focus leaves; clicking it does not open.
          </div>
        </web-ui-popover>
        <web-ui-popover trigger="click focus" placement="top">
          <web-ui-button slot="trigger" variant="secondary">
            Click or focus
          </web-ui-button>
          <div className="max-w-xs text-sm">Click toggles it, keyboard focus opens it directly.</div>
        </web-ui-popover>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">Keyboard focus last detail.open = {last}</output>
    </div>
  )
}
