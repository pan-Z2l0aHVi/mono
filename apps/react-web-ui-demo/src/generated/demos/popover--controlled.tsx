import type { WebUiPopover } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const panel = useRef<WebUiPopover>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover ref={panel} trigger="manual" open={open} onopen-change={event => setOpen(event.detail.open)}>
        <web-ui-button slot="trigger" variant="secondary">
          手动开合
        </web-ui-button>
        <div className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="font-semibold">manual 模式</span>
          <span>不响应悬停；点击面板外或按 Escape 也不关闭。</span>
        </div>
      </web-ui-popover>
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button
          size="28"
          variant="secondary"
          onClick={() => {
            panel.current?.show()
            setOpen(true)
          }}
        >
          show()
        </web-ui-button>
        <web-ui-button
          size="28"
          variant="secondary"
          onClick={() => {
            panel.current?.close()
            setOpen(false)
          }}
        >
          close()
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">open = {String(open)}</output>
      </div>
    </div>
  )
}
