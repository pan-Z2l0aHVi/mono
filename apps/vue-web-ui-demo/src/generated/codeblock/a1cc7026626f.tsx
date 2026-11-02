import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开（不锁定滚动）</web-ui-button>

      <web-ui-drawer
        open={open}
        noScrollLock
        heading="背景仍可滚动"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>打开后试着滚动背景页面：no-scroll-lock 不会改写页面滚动。</p>
      </web-ui-drawer>
    </>
  )
}
