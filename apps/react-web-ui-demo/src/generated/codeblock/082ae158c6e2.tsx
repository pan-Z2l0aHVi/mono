import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        noBackdropClose
        heading="点击背景不会关闭"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="m-0">点击卡片外的区域不会关闭。请使用下方 button 或 Escape 关闭。</p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          关闭
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
