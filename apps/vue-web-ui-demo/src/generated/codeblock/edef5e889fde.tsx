import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip
          content="点一下开，再点一下关"
          trigger="click"
          onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
        >
          <web-ui-button variant="secondary">点击提示</web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip content="只跟着 open 走" trigger="manual" open={open}>
          <web-ui-button variant="secondary" onClick={() => setOpen(value => !value)}>
            切换 open
          </web-ui-button>
        </web-ui-tooltip>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        点击提示最近一次 detail.open = {last} · 写 open 不派发
      </output>
    </div>
  )
}
