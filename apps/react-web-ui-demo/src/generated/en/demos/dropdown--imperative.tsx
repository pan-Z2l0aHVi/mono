import type { WebUiDropdown } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const menu = useRef<WebUiDropdown>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => menu.current?.openMenu()}>
          Call openMenu()
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={() => menu.current?.closeAll()}>
          Call closeAll()
        </web-ui-button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <web-ui-dropdown ref={menu}>
          <web-ui-button slot="trigger" variant="secondary">
            Imperative menu
          </web-ui-button>
          <web-ui-dropdown-item value="edit">Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item submenu>
            More
            <web-ui-dropdown-item value="archive">Archive</web-ui-dropdown-item>
          </web-ui-dropdown-item>
        </web-ui-dropdown>

        <web-ui-dropdown disabled>
          <web-ui-button slot="trigger" variant="secondary">
            Disabled menu
          </web-ui-button>
          <web-ui-dropdown-item>Cannot be opened</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
    </div>
  )
}
