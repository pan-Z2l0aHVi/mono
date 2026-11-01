import { useState } from 'react'

export default function Demo() {
  const [enabled, setEnabled] = useState(false)

  return (
    <div className="flex items-center gap-3">
      <web-ui-switch checked={enabled} onChange={event => setEnabled(event.currentTarget.checked)}></web-ui-switch>
      <span className="text-sm text-(--wui-color-text-secondary)">{enabled ? 'On' : 'Off'}</span>
    </div>
  )
}
