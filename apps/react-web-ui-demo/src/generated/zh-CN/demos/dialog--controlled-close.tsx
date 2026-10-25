import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState(0)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        controlled
        closable
        heading="未保存的更改"
        onopen-change={event => {
          if (!event.detail.open) setRequests(count => count + 1)
        }}
      >
        <p className="m-0">Escape 与 backdrop 只请求关闭；页面不写回，dialog 保持打开。</p>
        <output className="block text-sm text-(--wui-color-text-secondary)">已拦截关闭请求 · {requests} 次</output>
        <web-ui-button slot="footer" variant="secondary" onClick={() => setOpen(false)}>
          放弃更改
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
