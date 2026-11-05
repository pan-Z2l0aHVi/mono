import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-dropdown onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            Click menu
          </web-ui-button>
          <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
        </web-ui-dropdown>
        <web-ui-dropdown trigger="hover focus" onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button slot="trigger" variant="secondary">
            Hover or focus
          </web-ui-button>
          <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">Last detail.open = {last}</output>
    </div>
  )
}
