import type { WebUiDropdownItem } from '@greypan/web-ui'
import { useCallback, useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState('—')

  // Menu items move into the portal panel when opened, so React's onClick delegation at the root container never sees them; attach a native click here instead.
  const handleItemRef = useCallback((item: WebUiDropdownItem | null) => {
    if (!item) return
    const element = item
    const close = () => {
      setLast(element.textContent?.trim() || element.value)
      setOpen(false)
    }
    element.addEventListener('click', close)
    return () => element.removeEventListener('click', close)
  }, [])

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => setOpen(value => !value)}>
          {open ? 'Close menu' : 'Open menu'}
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          State: {open ? 'open' : 'closed'} · Last selection: {last}
        </output>
      </div>

      <web-ui-dropdown open={open} onopen-change={event => setOpen(event.detail.open)}>
        <web-ui-button slot="trigger" variant="secondary">
          Controlled menu
        </web-ui-button>
        <web-ui-dropdown-item ref={handleItemRef} value="edit">
          Edit
        </web-ui-dropdown-item>
        <web-ui-dropdown-item ref={handleItemRef} value="copy">
          Copy
        </web-ui-dropdown-item>
        <web-ui-dropdown-item ref={handleItemRef} value="archive">
          Archive
        </web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  )
}
