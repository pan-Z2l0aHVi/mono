import { useState } from 'react'

export default function Demo() {
  const [customHeader, setCustomHeader] = useState(false)
  const [noHeader, setNoHeader] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <web-ui-button onClick={() => setCustomHeader(true)}>Custom header</web-ui-button>
        <web-ui-button onClick={() => setNoHeader(true)}>No header</web-ui-button>
      </div>

      <web-ui-drawer open={customHeader} closable onopen-change={event => setCustomHeader(event.detail.open)}>
        <div slot="header" className="flex items-baseline gap-2 px-5 py-4">
          <strong className="text-lg">Account settings</strong>
          <span className="text-xs text-(--wui-color-text-secondary)">Saved</span>
        </div>
        <p>
          The content of the header slot is entirely up to the consumer; the close button is still provided by the
          component.
        </p>
      </web-ui-drawer>

      <web-ui-drawer open={noHeader} onopen-change={event => setNoHeader(event.detail.open)}>
        <p>With no heading and no header slot, the title area takes no space.</p>
      </web-ui-drawer>
    </>
  )
}
