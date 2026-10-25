import type { WebUiDrawer } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const drawer = useRef<WebUiDrawer>(null)

  return (
    <>
      <web-ui-button onClick={() => drawer.current?.show()}>打开 drawer</web-ui-button>

      <web-ui-drawer ref={drawer} heading="命令式 drawer" closable>
        <p>由 show() 打开；右上角关闭按钮、Escape 与遮罩都会关闭它。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => drawer.current?.close()}>
          调用 close()
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
