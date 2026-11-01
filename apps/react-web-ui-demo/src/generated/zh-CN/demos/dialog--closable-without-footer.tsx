import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <web-ui-dialog open={open} closable heading="只有关闭按钮" onopen-change={event => setOpen(event.detail.open)}>
        <p className="m-0">没有 footer，可以用右上角的关闭 button、Escape 或 backdrop 关闭。</p>
      </web-ui-dialog>
    </div>
  )
}
