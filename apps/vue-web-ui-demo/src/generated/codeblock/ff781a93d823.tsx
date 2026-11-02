import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { useState } from 'react'

const ICONS = { grid: lucideLayoutGrid, list: lucideList, settings: lucideSettings } as const
type ViewMode = keyof typeof ICONS

export default function Demo() {
  const [view, setView] = useState<ViewMode>('grid')

  return (
    <web-ui-select
      trigger="icon"
      aria-label="View mode"
      value={view}
      onChange={event => {
        const next = event.currentTarget.value
        if (next in ICONS) setView(next as ViewMode)
      }}
    >
      <web-ui-icon slot="trigger" icon={ICONS[view]} size={18}></web-ui-icon>
      <web-ui-option value="grid" label="Grid"></web-ui-option>
      <web-ui-option value="list" label="List"></web-ui-option>
      <web-ui-option value="settings" label="Settings"></web-ui-option>
    </web-ui-select>
  )
}
