import type { WebUiDrawer } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const drawer = useRef<WebUiDrawer>(null)

  return (
    <>
      <web-ui-button onClick={() => drawer.current?.show()}>Open drawer</web-ui-button>

      <web-ui-drawer ref={drawer} heading="Imperative drawer" closable>
        <p>Opened by show(); the close button in the top-right corner, Escape, and the backdrop all close it.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => drawer.current?.close()}>
          Call close()
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
