import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开（页面偏移）</web-ui-button>

      <web-ui-drawer
        open={open}
        pageShift
        heading="页面随 drawer 偏移"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>打开时背景整页偏移一段距离，关闭后回到原位；拖拽这块 panel 时页面停在原地。</p>
      </web-ui-drawer>
    </>
  )
}
