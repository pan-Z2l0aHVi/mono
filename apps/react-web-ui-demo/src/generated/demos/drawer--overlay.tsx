import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开（点遮罩不关闭）</web-ui-button>

      <web-ui-drawer
        open={open}
        noBackdropClose
        heading="点遮罩不关闭"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>点击遮罩不会关闭；用底部按钮或 Escape 退出。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setOpen(false)}>
          关闭
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
